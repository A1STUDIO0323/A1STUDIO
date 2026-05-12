// 일회성 ADMIN 부여 스크립트
// 실행: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/scripts/promote-admin-once.ts

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { Client } from "pg";

const TARGET_EMAIL = "shinji9112@gmail.com";
const LOG_PREFIX = "[promote-admin]";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(`${LOG_PREFIX} failed reason=missing_DATABASE_URL`);
    process.exit(1);
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  console.log(`${LOG_PREFIX} start target=${TARGET_EMAIL}`);

  try {
    await client.connect();

    // 1. 사용자 존재 확인
    const lookup = await client.query<{ id: string; email: string; role: string }>(
      `SELECT id, email, role FROM public.users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [TARGET_EMAIL]
    );

    if (lookup.rows.length === 0) {
      console.error(
        `${LOG_PREFIX} failed reason=user_not_found email=${TARGET_EMAIL}\n` +
        `  → 해당 이메일로 A1STUDIO에 먼저 한 번 카카오/구글 로그인이 필요합니다.\n` +
        `  → 로그인 후 다시 이 스크립트를 실행해주세요.`
      );
      process.exit(1);
    }

    const target = lookup.rows[0];
    console.log(`${LOG_PREFIX} found id=${target.id} email=${target.email} currentRole=${target.role}`);

    if (target.role === "ADMIN") {
      console.log(`${LOG_PREFIX} noop reason=already_admin email=${target.email}`);
      process.exit(0);
    }

    // 2. ADMIN 승격
    const upd = await client.query(
      `UPDATE public.users SET role = 'ADMIN' WHERE id = $1`,
      [target.id]
    );
    console.log(`${LOG_PREFIX} promoted email=${target.email} rows=${upd.rowCount}`);

    // 3. 검증
    const verify = await client.query<{ email: string; role: string }>(
      `SELECT email, role FROM public.users WHERE role = 'ADMIN' ORDER BY email`
    );
    console.log(`${LOG_PREFIX} verify admin_count=${verify.rows.length}`);
    for (const row of verify.rows) {
      console.log(`  - ADMIN: ${row.email}`);
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
