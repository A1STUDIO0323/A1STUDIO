// Phase B-2 마이그레이션: users.role 컬럼 추가 + 데이터 복사 + 본인 계정 ADMIN 부트스트랩
//
// 실행:
//   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/scripts/add-users-role.ts
//
// 안전 장치:
//   - ADD COLUMN IF NOT EXISTS — 재실행 안전
//   - 기존 member_roles 데이터를 users.role로 복사 (CM만)
//   - 본인 계정만 ADMIN 부트스트랩 (a1studio0323@gmail.com)
//   - member_roles 테이블은 삭제하지 않음 (롤백 안전망)

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { Client } from "pg";

const ADMIN_BOOTSTRAP_EMAIL = "a1studio0323@gmail.com";

const SQL_ADD_COLUMN = `
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'MEMBER';

CREATE INDEX IF NOT EXISTS users_role_idx ON public.users(role);
`;

const SQL_BACKFILL_FROM_MEMBER_ROLES = `
-- 기존 member_roles 테이블의 CM 역할을 users.role로 복사
-- (member_roles 테이블은 삭제하지 않고 한동안 병행 유지 — 롤백 안전망)
UPDATE public.users u
SET role = mr.role
FROM public.member_roles mr
WHERE LOWER(u.email) = LOWER(mr.email)
  AND mr.role IN ('CM', 'ADMIN')  -- MEMBER는 default라 굳이 update 안 함
  AND u.role = 'MEMBER';          -- 이미 다른 role이면 덮어쓰지 않음
`;

const SQL_BOOTSTRAP_ADMIN = `
-- 본인 계정 ADMIN 부트스트랩 (메모리 규칙: 자동 부여 없음 — 명시적 1회 부트스트랩만)
UPDATE public.users
SET role = 'ADMIN'
WHERE LOWER(email) = LOWER($1)
  AND role <> 'ADMIN';  -- 이미 ADMIN이면 no-op
`;

const SQL_VERIFY = `
SELECT email, role
FROM public.users
WHERE role <> 'MEMBER'
ORDER BY role, email;
`;

const LOG_PREFIX = "[migrate:users_role]";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(`${LOG_PREFIX} failed reason=missing_DATABASE_URL`);
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  console.log(`${LOG_PREFIX} start`);
  try {
    await client.connect();
    console.log(`${LOG_PREFIX} connected`);

    // Step 1: 컬럼 추가
    console.log(`${LOG_PREFIX} step=add_column`);
    await client.query(SQL_ADD_COLUMN);
    console.log(`${LOG_PREFIX} step=add_column ok`);

    // Step 2: member_roles → users.role 복사 (member_roles 테이블이 없으면 skip)
    console.log(`${LOG_PREFIX} step=backfill_from_member_roles`);
    try {
      const result = await client.query(SQL_BACKFILL_FROM_MEMBER_ROLES);
      console.log(`${LOG_PREFIX} step=backfill_from_member_roles ok rows=${result.rowCount ?? 0}`);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e.code === "42P01") {
        // relation does not exist
        console.warn(`${LOG_PREFIX} step=backfill_from_member_roles skipped reason=member_roles_table_not_found`);
      } else {
        throw err;
      }
    }

    // Step 3: 본인 계정 ADMIN 부트스트랩
    console.log(`${LOG_PREFIX} step=bootstrap_admin email=${ADMIN_BOOTSTRAP_EMAIL}`);
    const bootstrap = await client.query(SQL_BOOTSTRAP_ADMIN, [ADMIN_BOOTSTRAP_EMAIL]);
    console.log(`${LOG_PREFIX} step=bootstrap_admin ok rows=${bootstrap.rowCount ?? 0}`);

    if ((bootstrap.rowCount ?? 0) === 0) {
      console.warn(
        `${LOG_PREFIX} warn=admin_not_promoted email=${ADMIN_BOOTSTRAP_EMAIL} reason="user_not_found_or_already_admin — verify by checking users table or login first"`
      );
    }

    // Step 4: 결과 검증 — 현재 ADMIN/CM 목록 출력
    console.log(`${LOG_PREFIX} step=verify`);
    const verify = await client.query(SQL_VERIFY);
    if (verify.rows.length === 0) {
      console.log(`${LOG_PREFIX} verify result=no_elevated_users`);
    } else {
      console.log(`${LOG_PREFIX} verify result=found count=${verify.rows.length}`);
      for (const row of verify.rows) {
        console.log(`  - ${row.role}: ${row.email}`);
      }
    }

    console.log(`${LOG_PREFIX} success`);
  } catch (err) {
    console.error(`${LOG_PREFIX} failed`, err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
