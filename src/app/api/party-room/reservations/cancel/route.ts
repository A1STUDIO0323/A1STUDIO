import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cancelPartyRoomPayment } from "@/lib/kakaopay";

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

    // 2. 이미 취소된 예약인지 확인
    if (reservation.status === 'cancelled') {
      return NextResponse.json(
        { error: '이미 취소된 예약입니다' },
        { status: 400 }
      );
    }

    // 3. 취소 정책 판별
    const startDateTime = new Date(`${reservation.date}T${reservation.start_time}`);
    const now = new Date();
    const diffMs = startDateTime.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    let refundRate = 0;
    if (diffDays >= 7) {
      refundRate = 1.0; // 전액 환불
    } else if (diffDays >= 3) {
      refundRate = 0.5; // 50% 환불
    } else {
      return NextResponse.json(
        { error: '취소 불가 기간입니다. (이용 시작 3일 이내)' },
        { status: 400 }
      );
    }

    const refundAmount = Math.floor(reservation.total_amount * refundRate);
    let refundMethod = '';
    let refundPoints = 0;

    // 4. 결제 수단별 환불 처리
    if (reservation.payment_method === 'points') {
      // 포인트 환불
      const { error: refundError } = await supabase.rpc("refund_party_room_points", {
        p_user_id: user.id,
        p_amount: refundAmount,
        p_description: `파티룸 예약 취소 환불 (${reservation.package_type}, ${reservation.date})`,
        p_reservation_id: reservation.id,
      });

      if (refundError) {
        throw new Error(`포인트 환불 실패: ${refundError.message}`);
      }

      refundMethod = 'points';
      refundPoints = 0;

    } else if (reservation.payment_method === 'kakaopay') {
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
        const { error: pointError } = await supabase.rpc("refund_party_room_points", {
          p_user_id: user.id,
          p_amount: refundAmount,
          p_description: `파티룸 예약 취소 환불 포인트 (${reservation.package_type}, ${reservation.date})`,
          p_reservation_id: reservation.id,
        });

        if (pointError) {
          throw new Error(`포인트 적립 실패: ${pointError.message}`);
        }

        refundMethod = 'points'; // 카드 취소 후 포인트 적립
        refundPoints = refundAmount;
      }
    }

    // 5. 예약 상태 업데이트
    const { error: updateError } = await supabase
      .from("party_reservations")
      .update({
        status: 'cancelled',
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
