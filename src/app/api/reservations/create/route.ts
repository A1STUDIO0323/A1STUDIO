import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { 
  getPriceType, 
  calcPoints, 
  calcDuration,
  calcPartyRoomPoints,
  PARTY_ROOM_MAX_HEADCOUNT,
  PartyRoomPackage,
} from "@/lib/pricing";
import { isAdult } from "@/lib/age-check";

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
    const { 
      date, 
      start_time, 
      end_time,
      reservation_type = 'room', // 기본값: 연습실
      package_type, // 파티룸일 때만 사용
      headcount, // 파티룸일 때 인원 수
    } = body;

    if (!date || !start_time || !end_time) {
      return NextResponse.json(
        { error: "date, start_time, end_time이 필요합니다" },
        { status: 400 }
      );
    }

    // 파티룸 예약인 경우 추가 검증
    if (reservation_type === 'party-room') {
      // 1. 성인 여부 서버사이드 재검증
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('birthdate')
        .eq('id', user.id)
        .single();

      // user_metadata에서 birthdate 확인 (onboarding에서 저장됨)
      const birthdate = userProfile?.birthdate || user.user_metadata?.birthdate;
      
      if (!birthdate || !isAdult(birthdate)) {
        return NextResponse.json({ error: '성인 인증 필요' }, { status: 403 });
      }

      // 2. 패키지 타입 검증
      if (!package_type || !['day', 'night', 'allday'].includes(package_type)) {
        return NextResponse.json({ error: '패키지 선택 필요' }, { status: 400 });
      }

      // 3. 최대 인원 검증
      if (headcount && headcount > PARTY_ROOM_MAX_HEADCOUNT) {
        return NextResponse.json({ error: '최대 10명까지 이용 가능' }, { status: 400 });
      }

      // 4. 17:00~19:00 시작 시간 차단 (야간 패키지는 19:00부터만)
      const startHour = parseInt(start_time.split(":")[0]);
      if (startHour >= 17 && startHour < 19 && package_type !== 'day') {
        return NextResponse.json({ error: '야간 패키지는 19:00부터 시작 가능합니다' }, { status: 400 });
      }
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

    // 요금 계산 (예약 타입에 따라 분기)
    let pointsToUse: number;
    let priceType: string;
    let duration: number;
    
    if (reservation_type === 'party-room' && package_type) {
      // 파티룸: 패키지 기반 가격 계산
      const reservationDate = new Date(date);
      const pricing = calcPartyRoomPoints(reservationDate, package_type as PartyRoomPackage);
      pointsToUse = pricing.isEvent ? pricing.eventPrice : pricing.originalPrice;
      priceType = pricing.priceType;
      duration = 0; // 패키지는 시간이 고정되어 있음
    } else {
      // 연습실: 기존 시간당 가격 계산
      const reservationDate = new Date(date);
      const startHour = parseInt(start_time.split(":")[0]);
      priceType = getPriceType(reservationDate, startHour);
      duration = calcDuration(start_time, end_time);
      const pricing = calcPoints(priceType as any, duration, reservationDate);
      pointsToUse = pricing.isEvent ? pricing.eventPrice : pricing.originalPrice;
    }

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
    const reservationData: any = {
      user_id: user.id,
      date,
      start_time,
      end_time,
      duration_hours: duration,
      price_type: priceType,
      points_used: pointsToUse,
      status: "confirmed",
      reservation_type,
    };

    // 파티룸일 경우 추가 필드
    if (reservation_type === 'party-room') {
      reservationData.package_type = package_type;
    }

    const { data: reservation, error: insertError } = await supabase
      .from("reservations")
      .insert(reservationData)
      .select()
      .single();

    if (insertError) {
      // 예약 생성 실패 시 포인트 환불 처리 필요
      console.error("예약 생성 실패:", insertError);
      throw new Error("예약 생성에 실패했습니다");
    }

    // 17:00~19:00 버퍼 슬롯 자동 생성 (낮 패키지 예약 시)
    if (reservation_type === 'party-room' && package_type === 'day') {
      await supabase
        .from("blocked_slots")
        .insert({
          date,
          start_time: '17:00',
          end_time: '19:00',
          reason: '청소 및 환기 시간',
        });
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
