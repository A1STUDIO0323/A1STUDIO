import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculatePracticeRoomRefundRate, canCancelReservation } from "@/lib/refund-policy";

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

    // 취소 가능 시간 확인 (연습실: 2시간 전까지)
    const reservationDateTime = new Date(`${reservation.date}T${reservation.start_time}`);
    const cancelCheck = canCancelReservation(reservationDateTime, 'practice');
    
    if (!cancelCheck.canCancel) {
      return NextResponse.json(
        { error: cancelCheck.message },
        { status: 400 }
      );
    }

    // 환불율 계산
    const { refundRate, description } = calculatePracticeRoomRefundRate(reservationDateTime);
    const originalAmount = reservation.total_amount || 0;
    const refundAmount = Math.floor(originalAmount * refundRate);
    
    console.log('[예약취소] 예약 정보:', { 
      id: reservation.id, 
      status: reservation.status,
      originalAmount,
      refundRate,
      refundAmount,
      description
    });
    
    const { error: updateError } = await supabase
      .from("reservations")
      .update({
        status: "CANCELLED",
      })
      .eq("id", reservation_id);

    if (updateError) {
      console.error('[예약취소] 상태 업데이트 실패:', updateError);
      throw new Error(`예약 취소 처리 실패: ${updateError.message}`);
    }

    // 포인트 환불 처리
    // 1. user_points 조회
    const { data: userPoints, error: pointsError } = await supabase
      .from("user_points")
      .select("balance, total_used")
      .eq("user_id", user.id)
      .single();

    if (pointsError) {
      throw new Error("포인트 조회 실패");
    }

    const newBalance = (userPoints?.balance || 0) + refundAmount;
    const newTotalUsed = Math.max(0, (userPoints?.total_used || 0) - refundAmount);

    // 2. user_points 업데이트
    const { error: balanceUpdateError } = await supabase
      .from("user_points")
      .update({
        balance: newBalance,
        total_used: newTotalUsed,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (balanceUpdateError) {
      throw new Error("포인트 환불 실패");
    }

    // 3. point_transactions 추가
    const { error: transactionError } = await supabase
      .from("point_transactions")
      .insert({
        user_id: user.id,
        type: "refund",
        amount: refundAmount,
        balance_after: newBalance,
        description: `${reservation.date} ${reservation.start_time}~${reservation.end_time} 예약 취소 환불`,
        reservation_id: reservation_id,
      });

    if (transactionError) {
      throw new Error("환불 내역 생성 실패");
    }

    return NextResponse.json({
      message: "예약이 취소되었습니다",
      refund_policy: description,
      original_amount: originalAmount,
      refund_rate: refundRate,
      refund_points: refundAmount,
      balance_after: newBalance,
    });
  } catch (error) {
    console.error("예약 취소 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "예약 취소에 실패했습니다" },
      { status: 500 }
    );
  }
}
