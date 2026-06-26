// 읽기 전용 진단: CM 역할 데이터 정합성 점검
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

try {
  const mrCm = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS c FROM public.member_roles WHERE role='CM'`
  );
  const usersCm = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS c FROM public.users WHERE role='CM'`
  );
  const cmProfiles = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS c FROM public.cm_profiles`
  );
  const needBackfill = await prisma.$queryRawUnsafe(
    `SELECT u.email, u.role
       FROM public.users u
       JOIN public.cm_profiles p ON p.user_id = u.id
      WHERE u.role <> 'CM'`
  );
  const ghosts = await prisma.$queryRawUnsafe(
    `SELECT m.email,
            (u.id IS NOT NULL) AS has_user,
            u.role AS user_role
       FROM public.member_roles m
       LEFT JOIN public.users u ON lower(u.email) = lower(m.email)
      WHERE m.role='CM'
        AND (u.id IS NULL
             OR (u.role <> 'CM'
                 AND NOT EXISTS (SELECT 1 FROM public.cm_profiles p WHERE p.user_id = u.id)))`
  );

  console.log("member_roles role=CM 행 수:", mrCm[0].c);
  console.log("users role=CM 계정 수:", usersCm[0].c);
  console.log("cm_profiles 행 수:", cmProfiles[0].c);
  console.log("백필 대상(cm_profiles 있는데 role≠CM):", JSON.stringify(needBackfill, null, 2));
  console.log("유령 후보(member_roles=CM, 근거 없음):", JSON.stringify(ghosts, null, 2));
} catch (e) {
  console.error("진단 실패:", e);
} finally {
  await prisma.$disconnect();
}
