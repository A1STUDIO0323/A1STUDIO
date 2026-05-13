export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRoleByEmail, upsertRoleByEmail } from "@/lib/member-role-db";
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
    // users.role(권한의 진실)을 우선 조회 — ADMIN/CM 모두 반영. ADMIN은 CM 기능 포함 최상위 등급.
    try {
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
    } catch (err) {
      console.warn(`${LOG_PREFIX} users_lookup_failed email=${normalized}`, err);
    }
    // Fallback: legacy member_roles 테이블 (users.role 미설정 케이스 대비)
    const role = await getRoleByEmail(normalized);
    console.log(`${LOG_PREFIX} resolve email=${normalized} role=${role} source=legacy`);
    return NextResponse.json({ role });
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

    await upsertRoleByEmail(email, data.role);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값 오류", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "회원등급 변경 실패" }, { status: 500 });
  }
}
