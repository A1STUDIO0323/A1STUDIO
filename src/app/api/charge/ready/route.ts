import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readyPayment } from "@/lib/kakaopay";
import {
  acquirePaymentLock,
  deleteExpiredPaymentLocksForUser,
  getActivePaymentLocksForUser,
} from "@/lib/payment-lock";
import {
  getPaymentErrorMessage,
  reasonFromCaughtKakaoError,
  type PaymentErrorReason,
} from "@/lib/payment-errors";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 로그인 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      const reason: PaymentErrorReason = "auth_required";
      return NextResponse.json(
        { error: getPaymentErrorMessage(reason), reason },
        { status: 401 }
      );
    }

    // 요청 body 파싱
    const body = await request.json();
    const { package_id } = body;

    if (!package_id) {
      const reason: PaymentErrorReason = "validation_failed";
      return NextResponse.json(
        { error: getPaymentErrorMessage(reason), reason },
        { status: 400 }
      );
    }

    // 충전 패키지 조회
    const { data: chargePackage, error: packageError } = await supabase
      .from("charge_packages")
      .select("*")
      .eq("id", package_id)
      .eq("is_active", true)
      .single();

    if (packageError || !chargePackage) {
      const reason: PaymentErrorReason = "validation_failed";
      return NextResponse.json(
        { error: getPaymentErrorMessage(reason), reason },
        { status: 404 }
      );
    }

    // 결제 중복 방지 락 획득
    const lockKey = `charge_${package_id}`;
    // 만료된 락 정리 후 활성 락 확인 — 사용자에게 정확한 남은 대기시간 안내
    await deleteExpiredPaymentLocksForUser(user.id, "charge");
    const activeLocks = await getActivePaymentLocksForUser(user.id, "charge");
    if (activeLocks.length > 0) {
      const nowMs = Date.now();
      let minExpires = Infinity;
      for (const row of activeLocks) {
        const t = new Date(row.expires_at).getTime();
        if (t < minExpires) minExpires = t;
      }
      const retryAfter = Math.max(1, Math.ceil((minExpires - nowMs) / 1000));
      console.log("[충전 ready] 활성 락 존재, retryAfter:", retryAfter, "초");
      const reason: PaymentErrorReason = "payment_in_progress";
      return NextResponse.json(
        { error: getPaymentErrorMessage(reason), reason, retryAfter },
        { status: 409 }
      );
    }

    const lockAcquired = await acquirePaymentLock(user.id, "charge", lockKey, 600); // 10분

    if (!lockAcquired) {
      // 위 활성 락 검사를 통과했는데도 락 획득 실패 → 동시성 경합. 한 번 더 확인 후 응답.
      const again = await getActivePaymentLocksForUser(user.id, "charge");
      let retryAfter: number | undefined;
      if (again.length > 0) {
        const nowMs = Date.now();
        let minExpires = Infinity;
        for (const row of again) {
          const t = new Date(row.expires_at).getTime();
          if (t < minExpires) minExpires = t;
        }
        retryAfter = Math.max(1, Math.ceil((minExpires - nowMs) / 1000));
      }
      const reason: PaymentErrorReason = "payment_in_progress";
      return NextResponse.json(
        { error: getPaymentErrorMessage(reason), reason, retryAfter },
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
    const reason =
      error instanceof Error && (/카카오페이/i.test(error.message) || /\{[\s\S]*\}/.test(error.message))
        ? reasonFromCaughtKakaoError(error)
        : "server_error";
    console.error("결제 준비 오류:", reason, error);
    return NextResponse.json(
      { error: getPaymentErrorMessage(reason), reason },
      { status: 500 }
    );
  }
}
