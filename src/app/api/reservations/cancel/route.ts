import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPointBalance, refundPointsDB } from "@/lib/supabase-points";
import {
  calculatePracticeRoomRefund,
  canCancelReservation,
} from "@/lib/refund-policy";

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
    const { reservation_id } = body;

    if (!reservation_id) {
      return NextResponse.json({ error: "reservation_id가 필요합니다" }, { status: 400 });
    }

    // 예약 조회 (본인 예약인지 확인)
    const { data: reservation, error: fetchError } = await supabase
      .from("reservations")
      .select("*")
      .eq("id", reservation_id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !reservation) {
      return NextResponse.json({ error: "예약을 찾을 수 없습니다" }, { status: 404 });
    }

    // PAID, CONFIRMED, confirmed 상태만 취소 가능
    const cancellableStatuses = ["PAID", "CONFIRMED", "confirmed"];
    if (!cancellableStatuses.includes(reservation.status)) {
      return NextResponse.json({ error: "취소할 수 없는 예약입니다" }, { status: 400 });
    }

    const reservationDateTime = new Date(`${reservation.date}T${reservation.start_time}`);
    const cancelCheck = canCancelReservation(reservationDateTime, "practice");

    if (!cancelCheck.canCancel) {
      return NextResponse.json(
        { error: cancelCheck.message },
        { status: 400 }
      );
    }

    const originalAmount = reservation.total_amount || 0;
    const refundInfo = calculatePracticeRoomRefund(
      reservationDateTime,
      originalAmount
    );
    const { refundRate, refundAmount, reason: refundReason } = refundInfo;

    const paymentMethod = reservation.payment_method || "points";

    console.log("[예약취소] 예약 정보:", {
      id: reservation.id,
      status: reservation.status,
      paymentMethod,
      originalAmount,
      refundRate,
      refundAmount,
      refundReason,
    });

    const { error: updateError } = await supabase
      .from("reservations")
      .update({
        status: "CANCELLED",
        ...(paymentMethod === "kakaopay"
          ? { cancelled_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", reservation_id);

    if (updateError) {
      console.error("[예약취소] 상태 업데이트 실패:", updateError);
      throw new Error(`예약 취소 처리 실패: ${updateError.message}`);
    }

    let balanceAfter: number = await getPointBalance(user.id);

    if (paymentMethod === "kakaopay") {
      console.log("[카카오페이 환불] 연습실 예약 취소 — 카드 환불 API 미연동", {
        reservationId: reservation_id,
        refundAmountWon: refundAmount,
        kakaopayTid: reservation.kakaopay_tid,
        note: "운영: 카카오페이 어드민 수동 환불 또는 cancelPayment 연동 필요",
      });
    } else if (refundAmount > 0) {
      const refundResult = await refundPointsDB({
        userId: user.id,
        points: refundAmount,
        description: `연습실 예약 취소 환불 (${refundReason})`,
        reservationId: reservation_id,
      });

      if (!refundResult.success) {
        console.error("[Refund Error]", refundResult.error);
        balanceAfter = await getPointBalance(user.id);
      } else {
        balanceAfter = refundResult.newBalance;
      }
    } else {
      balanceAfter = await getPointBalance(user.id);
    }

    return NextResponse.json({
      message: "예약이 취소되었습니다",
      refund_policy: refundReason,
      original_amount: originalAmount,
      refund_rate: refundRate,
      refund_points: paymentMethod === "kakaopay" ? 0 : refundAmount,
      balance_after: balanceAfter,
      payment_method: paymentMethod,
      kakaopay_refund_pending:
        paymentMethod === "kakaopay" && refundAmount > 0 ? true : undefined,
    });
  } catch (error) {
    console.error("예약 취소 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "예약 취소에 실패했습니다" },
      { status: 500 }
    );
  }
}
