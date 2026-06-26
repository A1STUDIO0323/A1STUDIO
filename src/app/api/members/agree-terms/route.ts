import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

/**
 * 필수 약관 동의 저장 API.
 *  - 로그인 버튼으로 우회 가입한 신규 사용자가 회원가입 페이지(`/signup?needConsent=1`)에서
 *    약관에 동의하면, 세션을 유지한 채 이 API로 동의 내용을 DB에 저장한다.
 *  - 개인정보·이용약관은 필수이므로 항상 true 로 기록한다. 마케팅은 선택.
 */
const agreeTermsSchema = z.object({
  marketing: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  console.log("[POST /api/members/agree-terms] 약관 동의 저장 시작");
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn("[POST /api/members/agree-terms] 인증 실패", authError?.message);
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = agreeTermsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
    }

    const marketing = parsed.data.marketing ?? false;

    const saved = await prisma.users.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email ?? null,
        provider: user.app_metadata?.provider ?? null,
        privacy_agreed: true,
        terms_agreed: true,
        marketing_agreed: marketing,
        terms_agreed_at: new Date(),
        updated_at: new Date(),
      },
      update: {
        privacy_agreed: true,
        terms_agreed: true,
        marketing_agreed: marketing,
        terms_agreed_at: new Date(),
        updated_at: new Date(),
      },
      select: { id: true, terms_agreed: true, marketing_agreed: true },
    });

    console.log("[POST /api/members/agree-terms] 약관 동의 저장 완료", {
      userId: user.id,
      marketing,
    });

    return NextResponse.json({ success: true, profile: saved }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/members/agree-terms] 저장 오류:", error);
    return NextResponse.json(
      { error: "약관 동의 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
