import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readyPayment } from "@/lib/kakaopay";
import { acquirePaymentLock } from "@/lib/payment-lock";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 로그인 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    // 요청 body 파싱
    const body = await request.json();
    const { package_id } = body;

    if (!package_id) {
      return NextResponse.json({ error: "package_id가 필요합니다" }, { status: 400 });
    }

    // 충전 패키지 조회
    const { data: chargePackage, error: packageError } = await supabase
      .from("charge_packages")
      .select("*")
      .eq("id", package_id)
      .eq("is_active", true)
      .single();

    if (packageError || !chargePackage) {
      return NextResponse.json({ error: "유효하지 않은 패키지입니다" }, { status: 404 });
    }

    // 결제 중복 방지 락 획득
    const lockKey = `charge_${package_id}`;
    const lockAcquired = await acquirePaymentLock(user.id, "charge", lockKey, 600); // 10분
    
    if (!lockAcquired) {
      return NextResponse.json(
        { error: "이미 진행 중인 결제가 있습니다. 잠시 후 다시 시도해주세요." },
        { status: 409 }
      );
    }

    // 주문 고유번호 생성
    const partner_order_id = crypto.randomUUID();

    // 카카오페이 결제 준비
    const paymentReady = await readyPayment({
      partner_order_id,
      partner_user_id: user.id,
      item_name: `A1 STUDIO 포인트 ${chargePackage.name}`,
      quantity: 1,
      total_amount: chargePackage.amount,
      tax_free_amount: 0,
    });

    // 임시 결제 정보를 세션 또는 DB에 저장
    // 여기서는 간단하게 쿠키에 저장
    const response = NextResponse.json({
      redirect_url: paymentReady.next_redirect_pc_url,
      mobile_redirect_url: paymentReady.next_redirect_mobile_url,
      tid: paymentReady.tid,
      order_id: partner_order_id,
    });

    // 결제 정보를 쿠키에 임시 저장 (10분 유효)
    response.cookies.set("kakao_pay_tid", paymentReady.tid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 600, // 10분
      path: "/",
    });

    response.cookies.set("kakao_pay_order_id", partner_order_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    });

    response.cookies.set("kakao_pay_package_id", package_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("결제 준비 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "결제 준비에 실패했습니다" },
      { status: 500 }
    );
  }
}
