import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { approvePayment } from "@/lib/kakaopay";
import { chargePointsDB } from "@/lib/supabase-points";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 로그인 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
    }

    // 쿼리 파라미터에서 pg_token 가져오기
    const searchParams = request.nextUrl.searchParams;
    const pg_token = searchParams.get("pg_token");

    if (!pg_token) {
      return NextResponse.redirect(new URL("/charge/fail?error=no_pg_token", request.url));
    }

    // 쿠키에서 결제 정보 가져오기
    const tid = request.cookies.get("kakao_pay_tid")?.value;
    const partner_order_id = request.cookies.get("kakao_pay_order_id")?.value;
    const package_id = request.cookies.get("kakao_pay_package_id")?.value;

    if (!tid || !partner_order_id || !package_id) {
      return NextResponse.redirect(new URL("/charge/fail?error=missing_payment_info", request.url));
    }

    // 패키지 정보 조회
    const { data: chargePackage, error: packageError } = await supabase
      .from("charge_packages")
      .select("*")
      .eq("id", package_id)
      .single();

    if (packageError || !chargePackage) {
      return NextResponse.redirect(new URL("/charge/fail?error=invalid_package", request.url));
    }

    // 카카오페이 결제 승인
    await approvePayment({
      tid,
      partner_order_id,
      partner_user_id: user.id,
      pg_token,
    });

    const totalPointsRounded = Math.round(Number(chargePackage.total_points ?? 0));
    const declaredBonus = Math.round(Number(chargePackage.bonus_points ?? 0));
    const basePoints = Math.max(0, totalPointsRounded - declaredBonus);
    const points = basePoints > 0 ? basePoints : totalPointsRounded;
    const bonusPoints = basePoints > 0 ? declaredBonus : 0;

    const chargeResult = await chargePointsDB({
      userId: user.id,
      points,
      bonusPoints,
      description: `${String(chargePackage.name ?? "패키지")} 충전`,
    });

    if (!chargeResult.success) {
      console.error("[Charge Points Error]", chargeResult.error);
      const fail = NextResponse.redirect(
        new URL(
          `/charge/fail?error=${encodeURIComponent(chargeResult.error || "포인트 충전 실패")}`,
          request.url
        )
      );
      fail.cookies.delete("kakao_pay_tid");
      fail.cookies.delete("kakao_pay_order_id");
      fail.cookies.delete("kakao_pay_package_id");
      return fail;
    }

    // 쿠키 삭제
    const response = NextResponse.redirect(
      new URL(
        `/charge/success?points=${totalPointsRounded}&bonus=${bonusPoints}&newBalance=${chargeResult.newBalance}`,
        request.url
      )
    );

    response.cookies.delete("kakao_pay_tid");
    response.cookies.delete("kakao_pay_order_id");
    response.cookies.delete("kakao_pay_package_id");

    return response;
  } catch (error) {
    console.error("결제 승인 오류:", error);
    return NextResponse.redirect(
      new URL(`/charge/fail?error=${encodeURIComponent(error instanceof Error ? error.message : "결제 승인 실패")}`, request.url)
    );
  }
}
