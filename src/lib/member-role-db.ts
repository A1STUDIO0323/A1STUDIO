import { prisma } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";

export type DbMemberRole = "CM" | "MEMBER";

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS member_roles (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('CM', 'MEMBER')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const CREATE_BANNED_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS banned_members (
  email TEXT PRIMARY KEY,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

let initialized = false;

function isPrismaTableMissingError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: string };
  return maybe.code === "P2021";
}

function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_URL이 설정되지 않았습니다."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function ensureMemberRoleTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(CREATE_TABLE_SQL);
  await prisma.$executeRawUnsafe(CREATE_BANNED_TABLE_SQL);
  initialized = true;
}

export async function getRoleByEmail(email: string): Promise<DbMemberRole> {
  await ensureMemberRoleTable();
  const rows = await prisma.$queryRaw<Array<{ role: string }>>`
    SELECT role
    FROM member_roles
    WHERE email = ${email}
    LIMIT 1
  `;
  const role = rows[0]?.role;
  return role === "CM" ? "CM" : "MEMBER";
}

export async function upsertRoleByEmail(email: string, role: DbMemberRole) {
  await ensureMemberRoleTable();
  if (role === "MEMBER") {
    await prisma.$executeRaw`
      DELETE FROM member_roles
      WHERE email = ${email}
    `;
    return;
  }

  await prisma.$executeRaw`
    INSERT INTO member_roles (email, role, updated_at)
    VALUES (${email}, ${role}, NOW())
    ON CONFLICT (email)
    DO UPDATE SET role = EXCLUDED.role, updated_at = NOW()
  `;
}

export async function getAllRoleRows() {
  await ensureMemberRoleTable();
  return prisma.$queryRaw<Array<{ email: string; role: string }>>`
    SELECT email, role
    FROM member_roles
  `;
}

export async function banMemberByEmail(email: string, reason?: string) {
  await ensureMemberRoleTable();
  await prisma.$executeRaw`
    INSERT INTO banned_members (email, reason, created_at)
    VALUES (${email}, ${reason ?? null}, NOW())
    ON CONFLICT (email)
    DO UPDATE SET reason = EXCLUDED.reason, created_at = NOW()
  `;
}

export async function unbanMemberByEmail(email: string) {
  await ensureMemberRoleTable();
  await prisma.$executeRaw`
    DELETE FROM banned_members
    WHERE email = ${email}
  `;
}

export async function isBannedEmail(email: string) {
  await ensureMemberRoleTable();
  const rows = await prisma.$queryRaw<Array<{ email: string }>>`
    SELECT email
    FROM banned_members
    WHERE email = ${email}
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function getAllBannedRows() {
  await ensureMemberRoleTable();
  return prisma.$queryRaw<Array<{ email: string; reason: string | null }>>`
    SELECT email, reason
    FROM banned_members
  `;
}

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  const perPage = 200;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw new Error(error.message);

    const matched = data.users.find((u) => u.email?.toLowerCase() === email);
    if (matched?.id) return matched.id;

    if (data.users.length < perPage) break;
  }

  return null;
}

export async function withdrawMemberByUserId(userId: string, email?: string | null) {
  const normalizedUserId = userId.trim();
  const normalizedEmail = email?.trim().toLowerCase() || null;
  if (!normalizedUserId) {
    throw new Error("Missing user id");
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(normalizedUserId);
  if (error) {
    throw new Error(error.message);
  }

  // auth.users 삭제 이후 앱 DB 정리는 선택 처리(실패해도 탈퇴는 완료됨)
  try {
    await prisma.oneDayClassApplication.updateMany({
      where: { userId: normalizedUserId },
      data: { userId: null },
    });
  } catch {
    // optional cleanup
  }

  try {
    await prisma.reservation.updateMany({
      where: { userId: normalizedUserId },
      data: { userId: null },
    });
  } catch {
    // optional cleanup
  }

  try {
    await prisma.user.delete({ where: { id: normalizedUserId } });
  } catch (error) {
    if (!isPrismaTableMissingError(error)) {
      // profile FK cascade 누락 환경에서는 이 정리가 실패할 수 있으므로 무시
    }
  }

  if (normalizedEmail) {
    try {
      await ensureMemberRoleTable();
      await prisma.$executeRaw`DELETE FROM member_roles WHERE email = ${normalizedEmail}`;
      await prisma.$executeRaw`DELETE FROM banned_members WHERE email = ${normalizedEmail}`;
    } catch {
      // optional cleanup
    }
  }
}

export async function withdrawMemberByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Missing email");
  }

  let userId: string | null = null;
  try {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    userId = user?.id ?? null;
  } catch (error) {
    if (!isPrismaTableMissingError(error)) throw error;
  }

  if (!userId) {
    userId = await findAuthUserIdByEmail(normalizedEmail);
  }

  if (userId) {
    await withdrawMemberByUserId(userId, normalizedEmail);
    return;
  }

  // Auth 사용자 식별 실패 시에도 로컬 role/banned 데이터는 정리
  await ensureMemberRoleTable();
  await prisma.$executeRaw`DELETE FROM member_roles WHERE email = ${normalizedEmail}`;
  await prisma.$executeRaw`DELETE FROM banned_members WHERE email = ${normalizedEmail}`;
}
