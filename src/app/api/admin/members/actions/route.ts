export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { banMemberByEmail, unbanMemberByEmail, withdrawMemberByEmail } from "@/lib/member-role-db";
import { requireAdminOrLegacy } from "@/lib/admin-auth";

const actionSchema = z.object({
  // adminPassword는 레거시 호환 — 새 클라이언트는 x-admin-password 헤더 또는 ADMIN 세션 사용
  adminPassword: z.string().optional(),
  email: z.string().email(),
  action: z.enum(["WITHDRAW", "BAN", "UNBAN"]),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = actionSchema.parse(body);

    // 신규(세션+role) 또는 레거시(헤더) 인증 시도
    // body의 adminPassword는 옛 클라이언트 호환용 — 헤더로 fallback 시켜 검증
    const reqWithLegacyHeader = data.adminPassword
      ? new Request(req.url, {
          method: req.method,
          headers: { ...Object.fromEntries(req.headers), "x-admin-password": data.adminPassword },
          body: null,
        })
      : req;
    const auth = await requireAdminOrLegacy(reqWithLegacyHeader);
    if ("error" in auth) return auth.error;

    const email = data.email.trim().toLowerCase();
    if (data.action === "WITHDRAW") {
      await withdrawMemberByEmail(email);
      return NextResponse.json({ success: true });
    }
    if (data.action === "BAN") {
      await banMemberByEmail(email, data.reason);
      return NextResponse.json({ success: true });
    }
    await unbanMemberByEmail(email);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "입력값 오류", details: error.issues }, { status: 400 });
    }
    console.error("[POST /api/admin/members/actions]", error);
    const message = error instanceof Error ? error.message : "작업 처리 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
