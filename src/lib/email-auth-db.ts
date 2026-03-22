import { randomBytes, randomUUID } from "crypto";
import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/db";

const CREATE_EMAIL_USERS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS email_auth_users (
  email TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const CREATE_PASSWORD_RESET_TOKENS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS password_reset_tokens_email_idx
  ON password_reset_tokens (email);
CREATE INDEX IF NOT EXISTS password_reset_tokens_expires_at_idx
  ON password_reset_tokens (expires_at);
`;

let initialized = false;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function ensureEmailUsersTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(CREATE_EMAIL_USERS_TABLE_SQL);
  await prisma.$executeRawUnsafe(CREATE_PASSWORD_RESET_TOKENS_TABLE_SQL);
  initialized = true;
}

export async function registerEmailUser(input: {
  email: string;
  password: string;
  name?: string;
}) {
  await ensureEmailUsersTable();
  const email = normalizeEmail(input.email);
  const passwordHash = await hash(input.password, 10);

  const exists = await prisma.emailAuthUser.findUnique({
    where: { email },
    select: { email: true },
  });
  if (exists) {
    throw new Error("이미 가입된 이메일입니다.");
  }

  await prisma.emailAuthUser.create({
    data: {
      email,
      passwordHash,
      name: input.name?.trim() || null,
    },
  });

  await prisma.user.upsert({
    where: { email },
    update: {
      name: input.name?.trim() || undefined,
    },
    create: {
      id: randomUUID(),
      email,
      name: input.name?.trim() || null,
      avatarUrl: null,
      provider: "email",
    },
  });
}

export async function verifyEmailUser(input: { email: string; password: string }) {
  await ensureEmailUsersTable();
  const email = normalizeEmail(input.email);

  const row = await prisma.emailAuthUser.findUnique({
    where: { email },
    select: {
      email: true,
      passwordHash: true,
      name: true,
    },
  });
  if (!row) return null;

  const ok = await compare(input.password, row.passwordHash);
  if (!ok) return null;

  await prisma.user.upsert({
    where: { email },
    update: {
      name: row.name ?? undefined,
    },
    create: {
      id: randomUUID(),
      email,
      name: row.name ?? null,
      avatarUrl: null,
      provider: "email",
    },
  });

  return {
    id: email,
    email,
    name: row.name ?? "회원",
    image: null as string | null,
  };
}

export async function createPasswordResetToken(emailInput: string) {
  await ensureEmailUsersTable();
  const email = normalizeEmail(emailInput);
  const user = await prisma.emailAuthUser.findUnique({
    where: { email },
    select: { email: true },
  });
  if (!user) return null;

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30분

  await prisma.passwordResetToken.create({
    data: {
      token,
      email,
      expiresAt,
    },
  });

  return { token, email, expiresAt };
}

export async function resetPasswordByToken(input: { token: string; newPassword: string }) {
  await ensureEmailUsersTable();
  const token = input.token.trim();
  if (!token) return { ok: false as const, reason: "INVALID_TOKEN" };

  const row = await prisma.passwordResetToken.findUnique({
    where: { token },
  });
  if (!row) return { ok: false as const, reason: "INVALID_TOKEN" };
  if (row.usedAt) return { ok: false as const, reason: "TOKEN_USED" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false as const, reason: "TOKEN_EXPIRED" };

  const passwordHash = await hash(input.newPassword, 10);

  await prisma.$transaction([
    prisma.emailAuthUser.update({
      where: { email: row.email },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { token },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true as const };
}
