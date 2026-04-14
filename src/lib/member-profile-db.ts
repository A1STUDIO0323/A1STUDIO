import { prisma } from "@/lib/db";

const CREATE_MEMBER_PROFILES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS member_profiles (
  email TEXT PRIMARY KEY,
  birth_date DATE,
  phone TEXT,
  middle_school TEXT,
  middle_school_status TEXT,
  high_school TEXT,
  high_school_status TEXT,
  university TEXT,
  university_status TEXT,
  graduate_school TEXT,
  graduate_school_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

let initialized = false;

async function ensureMemberProfileTable() {
  if (initialized) return;
  await prisma.$executeRawUnsafe(CREATE_MEMBER_PROFILES_TABLE_SQL);
  await prisma.$executeRawUnsafe(
    `ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS middle_school TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS middle_school_status TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS high_school TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS high_school_status TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS university TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS university_status TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS graduate_school TEXT;`
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS graduate_school_status TEXT;`
  );
  initialized = true;
}

export type SchoolStatus = "ENROLLED" | "GRADUATED";

type MemberProfileRow = {
  email: string;
  birth_date: Date | string | null;
  phone: string | null;
  middle_school: string | null;
  middle_school_status: string | null;
  high_school: string | null;
  high_school_status: string | null;
  university: string | null;
  university_status: string | null;
  graduate_school: string | null;
  graduate_school_status: string | null;
};

export type MemberProfile = {
  email: string;
  birthDate: string | null;
  phone: string | null;
  middleSchool: string | null;
  middleSchoolStatus: SchoolStatus | null;
  highSchool: string | null;
  highSchoolStatus: SchoolStatus | null;
  university: string | null;
  universityStatus: SchoolStatus | null;
  graduateSchool: string | null;
  graduateSchoolStatus: SchoolStatus | null;
  isComplete: boolean;
};

function normalizeBirthDate(value?: string | null) {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function normalizePhone(value?: string | null) {
  let raw = (value ?? "").trim();
  if (!raw) return null;
  
  // 82로 시작하면 → 0으로 교체
  // 예: "821029940323" → "01029940323"
  if (raw.startsWith("82")) {
    raw = "0" + raw.slice(2);
  }
  
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}

function normalizeSchoolName(value?: string | null) {
  const raw = (value ?? "").trim();
  return raw || null;
}

function normalizeSchoolStatus(value?: string | null): SchoolStatus | null {
  const raw = (value ?? "").trim().toUpperCase();
  if (raw === "ENROLLED" || raw === "GRADUATED") return raw;
  return null;
}

function toIsoDate(value: Date | string | null) {
  if (!value) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export async function getMemberProfileByEmail(email: string): Promise<MemberProfile> {
  await ensureMemberProfileTable();
  const normalized = email.trim().toLowerCase();

  const rows = await prisma.$queryRaw<MemberProfileRow[]>`
    SELECT
      email,
      birth_date,
      phone,
      middle_school,
      middle_school_status,
      high_school,
      high_school_status,
      university,
      university_status,
      graduate_school,
      graduate_school_status
    FROM member_profiles
    WHERE email = ${normalized}
    LIMIT 1
  `;

  const row = rows[0];
  const birthDate = toIsoDate(row?.birth_date ?? null);
  let phone = row?.phone ?? null;
  
  // 전화번호 82 → 0 변환
  if (phone && phone.startsWith("82")) {
    phone = "0" + phone.slice(2);
  }
  
  return {
    email: normalized,
    birthDate,
    phone,
    middleSchool: row?.middle_school ?? null,
    middleSchoolStatus: normalizeSchoolStatus(row?.middle_school_status),
    highSchool: row?.high_school ?? null,
    highSchoolStatus: normalizeSchoolStatus(row?.high_school_status),
    university: row?.university ?? null,
    universityStatus: normalizeSchoolStatus(row?.university_status),
    graduateSchool: row?.graduate_school ?? null,
    graduateSchoolStatus: normalizeSchoolStatus(row?.graduate_school_status),
    // 휴대폰은 Supabase Auth(phone_confirmed_at)로 검증되므로,
    // 전화번호가 있으면 프로필 완료로 처리 (생년월일은 선택사항)
    isComplete: Boolean(phone),
  };
}

export async function upsertMemberProfileByEmail(input: {
  email: string;
  birthDate?: string | null;
  phone?: string | null;
  middleSchool?: string | null;
  middleSchoolStatus?: SchoolStatus | null;
  highSchool?: string | null;
  highSchoolStatus?: SchoolStatus | null;
  university?: string | null;
  universityStatus?: SchoolStatus | null;
  graduateSchool?: string | null;
  graduateSchoolStatus?: SchoolStatus | null;
}) {
  await ensureMemberProfileTable();
  const email = input.email.trim().toLowerCase();
  const birthDate = normalizeBirthDate(input.birthDate);
  const phone = normalizePhone(input.phone);
  const middleSchool = normalizeSchoolName(input.middleSchool);
  const middleSchoolStatus = normalizeSchoolStatus(input.middleSchoolStatus);
  const highSchool = normalizeSchoolName(input.highSchool);
  const highSchoolStatus = normalizeSchoolStatus(input.highSchoolStatus);
  const university = normalizeSchoolName(input.university);
  const universityStatus = normalizeSchoolStatus(input.universityStatus);
  const graduateSchool = normalizeSchoolName(input.graduateSchool);
  const graduateSchoolStatus = normalizeSchoolStatus(input.graduateSchoolStatus);

  await prisma.$executeRaw`
    INSERT INTO member_profiles (
      email,
      birth_date,
      phone,
      middle_school,
      middle_school_status,
      high_school,
      high_school_status,
      university,
      university_status,
      graduate_school,
      graduate_school_status,
      updated_at
    )
    VALUES (
      ${email},
      ${birthDate},
      ${phone},
      ${middleSchool},
      ${middleSchoolStatus},
      ${highSchool},
      ${highSchoolStatus},
      ${university},
      ${universityStatus},
      ${graduateSchool},
      ${graduateSchoolStatus},
      NOW()
    )
    ON CONFLICT (email)
    DO UPDATE SET
      birth_date = COALESCE(EXCLUDED.birth_date, member_profiles.birth_date),
      phone = COALESCE(EXCLUDED.phone, member_profiles.phone),
      middle_school = COALESCE(EXCLUDED.middle_school, member_profiles.middle_school),
      middle_school_status = COALESCE(EXCLUDED.middle_school_status, member_profiles.middle_school_status),
      high_school = COALESCE(EXCLUDED.high_school, member_profiles.high_school),
      high_school_status = COALESCE(EXCLUDED.high_school_status, member_profiles.high_school_status),
      university = COALESCE(EXCLUDED.university, member_profiles.university),
      university_status = COALESCE(EXCLUDED.university_status, member_profiles.university_status),
      graduate_school = COALESCE(EXCLUDED.graduate_school, member_profiles.graduate_school),
      graduate_school_status = COALESCE(EXCLUDED.graduate_school_status, member_profiles.graduate_school_status),
      updated_at = NOW()
  `;
}
