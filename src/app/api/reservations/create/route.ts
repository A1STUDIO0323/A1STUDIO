import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPriceType, calcPoints, calcDuration } from "@/lib/pricing";

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
    const { date, start_time, end_time } = body;

    if (!date || !start_time || !end_time) {
      return NextResponse.json(
        { error: "date, start_time, end_time이 필요합니다" },
        { status: 400 }
      );
    }

    // 중복 예약 체크
    const { data: existingReservations, error: checkError } = await supabase
      .from("reservations")
      .select("id")
      .eq("date", date)
      .eq("status", "confirmed")
      .or(`and(start_time.lte.${start_time},end_time.gt.${start_time}),and(start_time.lt.${end_time},end_time.gte.${end_time}),and(start_time.gte.${start_time},end_time.lte.${end_time})`);

    if (checkError) {
      throw new Error(`중복 체크 실패: ${checkError.message}`);
    }

    if (existingReservations && existingReservations.length > 0) {
      return NextResponse.json(
        { error: "이미 예약된 시간대입니다" },
        { status: 409 }
      );
    }

    // 요금 계산
    const reservationDate = new Date(date);
    const startHour = parseInt(start_time.split(":")[0]);
    const priceType = getPriceType(reservationDate, startHour);
    const duration = calcDuration(start_time, end_time);
    const pricing = calcPoints(priceType, duration, reservationDate);
    
    const pointsToUse = pricing.isEvent ? pricing.eventPrice : pricing.originalPrice;

    // 포인트 잔액 확인 및 차감 (use_points 함수 호출)
    const { data: usePointsResult, error: usePointsError } = await supabase.rpc("use_points", {
      p_user_id: user.id,
      p_amount: pointsToUse,
      p_description: `${date} ${start_time}~${end_time} 예약`,
      p_reservation_id: null, // 예약 ID는 나중에 업데이트
    });

    if (usePointsError || !usePointsResult) {
      return NextResponse.json(
        { error: "포인트가 부족합니다" },
        { status: 402 }
      );
    }

    // 예약 생성
    const { data: reservation, error: insertError } = await supabase
      .from("reservations")
      .insert({
        user_id: user.id,
        date,
        start_time,
        end_time,
        duration_hours: duration,
        price_type: priceType,
        points_used: pointsToUse,
        status: "confirmed",
      })
      .select()
      .single();

    if (insertError) {
      // 예약 생성 실패 시 포인트 환불 처리 필요
      console.error("예약 생성 실패:", insertError);
      throw new Error("예약 생성에 실패했습니다");
    }

    // 생성된 예약 ID를 거래 내역에 업데이트
    await supabase
      .from("point_transactions")
      .update({ reservation_id: reservation.id })
      .eq("user_id", user.id)
      .eq("description", `${date} ${start_time}~${end_time} 예약`)
      .is("reservation_id", null)
      .order("created_at", { ascending: false })
      .limit(1);

    // 현재 잔액 조회
    const { data: userPoints } = await supabase
      .from("user_points")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      reservation_id: reservation.id,
      points_used: pointsToUse,
      balance_after: userPoints?.balance || 0,
      reservation,
    });
  } catch (error) {
    console.error("예약 생성 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "예약 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
