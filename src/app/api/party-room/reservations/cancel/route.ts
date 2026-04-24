import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cancelPartyRoomPayment } from "@/lib/kakaopay";
import { calculatePartyRoomRefundRate, canCancelReservation } from "@/lib/refund-policy";
import { getPointBalance, refundPointsDB } from "@/lib/supabase-points";

/**
 * 파티룸 예약 취소 + 환불 처리
 * POST /api/party-room/reservations/cancel
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 로그인 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const body = await request.json();
    const { reservation_id } = body;

    if (!reservation_id) {
      return NextResponse.json(
        { error: "reservation_id가 필요합니다" },
        { status: 400 }
      );
    }

    // 1. 예약 조회 및 소유자 확인
    const { data: reservation, error: fetchError } = await supabase
      .from("party_reservations")
      .select("*")
      .eq("id", reservation_id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !reservation) {
      return NextResponse.json(
        { error: "예약을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 2. 취소 가능한 상태인지 확인
    const cancellableStatuses = ["PAID", "CONFIRMED", "confirmed"];
    if (!cancellableStatuses.includes(reservation.status)) {
      return NextResponse.json(
        { error: reservation.status === 'CANCELLED' || reservation.status === 'cancelled' ? '이미 취소된 예약입니다' : '취소할 수 없는 예약입니다' },
        { status: 400 }
      );
    }

    // 3. 취소 가능 시간 확인 및 환불율 계산
    const startDateTime = new Date(`${reservation.date}T${reservation.start_time}`);
    
    const cancelCheck = canCancelReservation(startDateTime, 'party');
    if (!cancelCheck.canCancel) {
      return NextResponse.json(
        { error: cancelCheck.message },
        { status: 400 }
      );
    }

    const { refundRate, description } = calculatePartyRoomRefundRate(startDateTime);
    const refundAmount = Math.floor(reservation.total_amount * refundRate);
    let refundMethod = '';
    let refundPoints = 0;

    // 4. 결제 수단별 환불 처리
    // 포인트 적립/환불은 refund_points RPC (refundPointsDB) — balance_after 포함. refund_party_room_points 는 balance_after 미기입으로 NOT NULL 위반 가능.
    if (reservation.payment_method === "points") {
      if (refundAmount > 0) {
        const currentBalance = await getPointBalance(user.id);
        console.log("[Party Room Cancel] Current balance:", currentBalance);
        console.log("[Party Room Cancel] Refund amount:", refundAmount);

        const refundResult = await refundPointsDB({
          userId: user.id,
          points: refundAmount,
          description: `파티룸 예약 취소 환불 (${reservation.package_type}, ${reservation.date})`,
          reservationId: reservation.id,
        });

        if (!refundResult.success) {
          throw new Error(refundResult.error || "포인트 환불 실패");
        }
        console.log("[Party Room Cancel] New balance:", refundResult.newBalance);
      }

      refundMethod = "points";
      refundPoints = 0;

    } else if (reservation.payment_method === "kakaopay") {
      if (refundRate === 1.0) {
        // 전액: 카드 취소
        await cancelPartyRoomPayment({
          tid: reservation.kakaopay_tid!,
          cancelAmount: reservation.total_amount,
          cancelTaxFreeAmount: 0,
          reason: '예약 취소 (7일 전 전액 환불)',
        });
        refundMethod = 'card_cancel';
        refundPoints = 0;

      } else {
        // 50%: 카드 전액 취소 후 50%를 포인트로 적립
        await cancelPartyRoomPayment({
          tid: reservation.kakaopay_tid!,
          cancelAmount: reservation.total_amount,
          cancelTaxFreeAmount: 0,
          reason: '예약 취소 (3일 전 50% 환불)',
        });

        // 50% 포인트 적립
        if (refundAmount > 0) {
          const currentBalance = await getPointBalance(user.id);
          console.log("[Party Room Cancel] Current balance (after card cancel):", currentBalance);
          console.log("[Party Room Cancel] Refund points to credit:", refundAmount);

          const refundResult = await refundPointsDB({
            userId: user.id,
            points: refundAmount,
            description: `파티룸 예약 취소 환불 포인트 (${reservation.package_type}, ${reservation.date})`,
            reservationId: reservation.id,
          });

          if (!refundResult.success) {
            throw new Error(refundResult.error || "포인트 적립 실패");
          }
          console.log("[Party Room Cancel] New balance:", refundResult.newBalance);
        }

        refundMethod = "points";
        refundPoints = refundAmount;
      }
    }

    // 5. 예약 상태 업데이트
    const { error: updateError } = await supabase
      .from("party_reservations")
      .update({
        status: 'CANCELLED',
        cancelled_at: new Date().toISOString(),
        refund_method: refundMethod,
        refund_amount: refundAmount,
        refund_points: refundPoints,
      })
      .eq("id", reservation_id);

    if (updateError) {
      throw new Error(`예약 취소 업데이트 실패: ${updateError.message}`);
    }

    // 6. 낮 패키지인 경우 BlockedSlot 삭제
    if (reservation.package_type === 'day') {
      await supabase
        .from("blocked_slots")
        .delete()
        .eq("room_id", "party-room")
        .eq("date", reservation.date)
        .eq("start_time", "17:00")
        .eq("end_time", "19:00");
    }

    return NextResponse.json({
      success: true,
      refund_policy: description,
      refund_rate: refundRate,
      refund_amount: refundAmount,
      refund_method: refundMethod,
      refund_points: refundPoints,
      payment_method: reservation.payment_method,
    });
  } catch (error) {
    console.error("파티룸 예약 취소 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "예약 취소에 실패했습니다" },
      { status: 500 }
    );
  }
}
