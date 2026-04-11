import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    if (reservation.status !== "confirmed") {
      return NextResponse.json({ error: "취소할 수 없는 예약입니다" }, { status: 400 });
    }

    // 예약 시작 2시간 전까지만 취소 가능
    const reservationDateTime = new Date(`${reservation.date}T${reservation.start_time}`);
    const now = new Date();
    const hoursUntilReservation = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilReservation < 2) {
      return NextResponse.json(
        { error: "예약 시작 2시간 전까지만 취소 가능합니다" },
        { status: 400 }
      );
    }

    // 예약 취소 처리
    const { error: updateError } = await supabase
      .from("reservations")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        refund_points: reservation.points_used,
      })
      .eq("id", reservation_id);

    if (updateError) {
      throw new Error("예약 취소 처리 실패");
    }

    // 포인트 환불 처리
    // 1. user_points 업데이트
    const { data: userPoints, error: pointsError } = await supabase
      .from("user_points")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (pointsError) {
      throw new Error("포인트 조회 실패");
    }

    const newBalance = (userPoints?.balance || 0) + reservation.points_used;

    const { error: balanceUpdateError } = await supabase
      .from("user_points")
      .update({
        balance: newBalance,
        total_used: supabase.raw(`total_used - ${reservation.points_used}`),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (balanceUpdateError) {
      throw new Error("포인트 환불 실패");
    }

    // 2. point_transactions 추가
    const { error: transactionError } = await supabase
      .from("point_transactions")
      .insert({
        user_id: user.id,
        type: "refund",
        amount: reservation.points_used,
        balance_after: newBalance,
        description: `${reservation.date} ${reservation.start_time}~${reservation.end_time} 예약 취소 환불`,
        reservation_id: reservation_id,
      });

    if (transactionError) {
      throw new Error("환불 내역 생성 실패");
    }

    return NextResponse.json({
      message: "예약이 취소되었습니다",
      refund_points: reservation.points_used,
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
