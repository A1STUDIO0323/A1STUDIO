import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { approvePayment } from "@/lib/kakaopay";
import { chargePointsDB } from "@/lib/supabase-points";

function logErrorDetails(prefix: string, error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    const o = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };
    console.error(prefix, {
      message: o.message,
      code: o.code,
      details: o.details,
      hint: o.hint,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return;
  }
  console.error(prefix, error);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    console.log("[Charge Approve] Step 1: Get user session");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("[Charge Approve] User error:", userError);
      return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
    }

    if (!user) {
      console.error("[Charge Approve] No user found");
      return NextResponse.redirect(new URL("/login?error=unauthorized", request.url));
    }

    console.log("[Charge Approve] Step 2: User found:", user.id);

    // users 테이블 접근 시도 (권한/RLS/RPC 이슈 위치 추적용)
    console.log("[Charge Approve] Step 3: Fetching row from public.users (diagnostic probe)");
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[Charge Approve] Profile (users table) error:", {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
      });
      return NextResponse.redirect(
        new URL(
          `/charge/fail?error=${encodeURIComponent(`users_probe:${profileError.message}`)}`,
          request.url
        )
      );
    }

    console.log("[Charge Approve] Step 4: users row OK:", profile ? { id: (profile as { id?: string }).id } : null);

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
    console.log("[Charge Approve] Step 5: charge_packages");
    const { data: chargePackage, error: packageError } = await supabase
      .from("charge_packages")
      .select("*")
      .eq("id", package_id)
      .single();

    if (packageError || !chargePackage) {
      console.error("[Charge Approve] Package error:", packageError);
      return NextResponse.redirect(new URL("/charge/fail?error=invalid_package", request.url));
    }

    // 카카오페이 결제 승인
    console.log("[Charge Approve] Step 6: Kakao approvePayment");
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

    console.log("[Charge Approve] Step 7: chargePointsDB (RPC may touch user_points / users)", {
      userId: user.id,
      points,
      bonusPoints,
    });

    let chargeResult: Awaited<ReturnType<typeof chargePointsDB>>;
    try {
      chargeResult = await chargePointsDB({
        userId: user.id,
        points,
        bonusPoints,
        description: `${String(chargePackage.name ?? "패키지")} 충전`,
      });
    } catch (chargeThrow) {
      logErrorDetails("[Charge Approve] chargePointsDB exception:", chargeThrow);
      return NextResponse.redirect(
        new URL(
          `/charge/fail?error=${encodeURIComponent(chargeThrow instanceof Error ? chargeThrow.message : "charge_points_exception")}`,
          request.url
        )
      );
    }

    console.log("[Charge Approve] Step 8: chargePointsDB returned:", {
      success: chargeResult.success,
      newBalance: chargeResult.newBalance,
      error: chargeResult.error,
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
  } catch (error: unknown) {
    logErrorDetails("[Charge Approve] Detailed error (outer catch):", error);
    return NextResponse.redirect(
      new URL(
        `/charge/fail?error=${encodeURIComponent(error instanceof Error ? error.message : "결제 승인 실패")}`,
        request.url
      )
    );
  }
}
