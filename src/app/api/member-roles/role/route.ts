export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { upsertRoleByEmail } from "@/lib/member-role-db";
import { prisma } from "@/lib/db";

const LOG_PREFIX = "[api:member-roles:role]";

const postSchema = z.object({
  email: z.string().email(),
  role: z.enum(["CM", "MEMBER"]),
});

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json({ role: "MEMBER" });
    }
    const normalized = email.trim().toLowerCase();
    // 권한의 진실은 계정(user.id) 기준 users.role 하나로 일원화한다.
    // ⚠️ 과거 이메일 기반 member_roles 폴백을 제거했다 — 같은 이메일로 재가입하거나
    //    Supabase에서 계정을 직접 삭제했을 때, 새 계정(MEMBER)에 옛 CM이 잘못 복원되던
    //    "유령 CM" 버그의 원인이었다.
    const user = await prisma.users.findUnique({
      where: { email: normalized },
      select: { role: true },
    });
    if (user?.role === "ADMIN") {
      console.log(`${LOG_PREFIX} resolve email=${normalized} role=ADMIN source=users`);
      return NextResponse.json({ role: "ADMIN" });
    }
    if (user?.role === "CM") {
      console.log(`${LOG_PREFIX} resolve email=${normalized} role=CM source=users`);
      return NextResponse.json({ role: "CM" });
    }
    console.log(`${LOG_PREFIX} resolve email=${normalized} role=MEMBER source=users`);
    return NextResponse.json({ role: "MEMBER" });
  } catch (err) {
    console.error(`${LOG_PREFIX} get_failed`, err);
    // DB 장애 시에는 기본 회원 권한으로 흐름을 이어갑니다
    return NextResponse.json({ role: "MEMBER", skipped: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = postSchema.parse(body);
    const email = data.email.trim().toLowerCase();

    // 권한의 진실(users.role) 갱신 — ADMIN은 이 레거시 경로로 강등하지 않음.
    try {
      await prisma.users.updateMany({
        where: { email, role: { not: "ADMIN" } },
        data: { role: data.role },
      });
    } catch (err) {
      console.warn(`${LOG_PREFIX} users_role_sync_failed email=${email}`, err);
    }
    // 레거시 member_roles 동기화(관리자 목록 표시용)
    await upsertRoleByEmail(email, data.role);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값 오류", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "회원등급 변경 실패" }, { status: 500 });
  }
}
