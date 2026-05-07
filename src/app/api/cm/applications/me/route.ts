import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

/**
 * 본인의 CM 신청 상태 조회
 * GET /api/cm/applications/me
 *
 * 응답: 가장 최근 신청 1건 (없으면 application=null)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const application = await prisma.cm_applications.findFirst({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        status: true,
        admin_memo: true,
        created_at: true,
        reviewed_at: true,
      },
    });

    return NextResponse.json({ application });
  } catch (error) {
    console.error("[CM 신청 조회] 오류:", error);
    return NextResponse.json(
      { error: "조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
