import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { approvePayment } from "@/lib/kakaopay";

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
    const approval = await approvePayment({
      tid,
      partner_order_id,
      partner_user_id: user.id,
      pg_token,
    });

    // Supabase 트랜잭션으로 포인트 충전 처리
    // 1. user_points에서 현재 잔액 조회 (없으면 생성)
    let { data: userPoints, error: pointsError } = await supabase
      .from("user_points")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (pointsError && pointsError.code !== "PGRST116") {
      throw new Error("포인트 조회 실패");
    }

    const currentBalance = userPoints?.balance || 0;
    const newBalance = currentBalance + chargePackage.total_points;

    // 2. user_points 업데이트 또는 생성
    if (userPoints) {
      const { error: updateError } = await supabase
        .from("user_points")
        .update({
          balance: newBalance,
          total_charged: (userPoints.total_charged || 0) + chargePackage.amount,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) throw new Error("포인트 업데이트 실패");
    } else {
      const { error: insertError } = await supabase
        .from("user_points")
        .insert({
          user_id: user.id,
          balance: newBalance,
          total_charged: chargePackage.amount,
          total_used: 0,
        });

      if (insertError) throw new Error("포인트 생성 실패");
    }

    // 3. point_transactions에 충전 내역 추가
    const { error: transactionError } = await supabase
      .from("point_transactions")
      .insert({
        user_id: user.id,
        type: "charge",
        amount: chargePackage.amount,
        balance_after: currentBalance + chargePackage.amount,
        description: `${chargePackage.name} 충전`,
        payment_id: approval.aid,
      });

    if (transactionError) throw new Error("충전 내역 생성 실패");

    // 4. 보너스 포인트가 있으면 추가 거래 내역 생성
    if (chargePackage.bonus_points > 0) {
      const { error: bonusError } = await supabase
        .from("point_transactions")
        .insert({
          user_id: user.id,
          type: "bonus",
          amount: chargePackage.bonus_points,
          balance_after: newBalance,
          description: `${chargePackage.name} 보너스 ${chargePackage.bonus_rate}%`,
          payment_id: approval.aid,
        });

      if (bonusError) throw new Error("보너스 내역 생성 실패");
    }

    // 쿠키 삭제
    const response = NextResponse.redirect(
      new URL(`/charge/success?points=${chargePackage.total_points}`, request.url)
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
