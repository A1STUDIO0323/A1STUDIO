import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calcPartyRoomPoints, PartyRoomPackage, PARTY_ROOM_MAX_HEADCOUNT, PARTY_ROOM_PACKAGES } from "@/lib/pricing";
import { isAdult } from "@/lib/age-check";

/**
 * 파티룸 예약 생성 (포인트 결제)
 * POST /api/party-room/reservations/create
 */
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
      package_type,
      date,
      guest_name,
      guest_phone,
      memo,
      headcount = 10,
    } = body;

    if (!package_type || !date) {
      return NextResponse.json(
        { error: "package_type과 date가 필요합니다" },
        { status: 400 }
      );
    }

    if (!['day', 'night', 'allday'].includes(package_type)) {
      return NextResponse.json(
        { error: "유효하지 않은 패키지 타입입니다" },
        { status: 400 }
      );
    }

    // 1. 성인 여부 서버사이드 재검증
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('birthdate')
      .eq('id', user.id)
      .single();

    const birthdate = userProfile?.birthdate || user.user_metadata?.birthdate;
    
    if (!birthdate || !isAdult(birthdate)) {
      return NextResponse.json({ error: '성인 인증 필요' }, { status: 403 });
    }

    // 2. 최대 인원 검증
    if (headcount > PARTY_ROOM_MAX_HEADCOUNT) {
      return NextResponse.json({ error: '최대 10명까지 이용 가능' }, { status: 400 });
    }

    // 3. 중복 예약 확인
    const packageInfo = PARTY_ROOM_PACKAGES[package_type as PartyRoomPackage];
    const reservationDate = new Date(date);
    
    // end_date 계산 (야간/종일권은 익일)
    const endDate = new Date(date);
    if (package_type === 'night' || package_type === 'allday') {
      endDate.setDate(endDate.getDate() + 1);
    }
    const endDateStr = endDate.toISOString().split('T')[0];

    // 해당 날짜에 이미 예약이 있는지 확인
    const { data: existingReservations } = await supabase
      .from("party_reservations")
      .select("id")
      .eq("status", "confirmed")
      .or(`date.eq.${date},end_date.eq.${date}`);

    if (existingReservations && existingReservations.length > 0) {
      return NextResponse.json(
        { error: "이미 예약된 날짜입니다" },
        { status: 409 }
      );
    }

    // 4. 포인트 계산
    const pricing = calcPartyRoomPoints(reservationDate, package_type as PartyRoomPackage);
    const pointsToUse = pricing.isEvent ? pricing.eventPrice : pricing.originalPrice;

    // 5. 포인트 잔액 확인 및 차감
    const { data: usePointsResult, error: usePointsError } = await supabase.rpc("use_points", {
      p_user_id: user.id,
      p_amount: pointsToUse,
      p_description: `파티룸 ${package_type} 예약 (${date})`,
      p_reservation_id: null,
    });

    if (usePointsError || !usePointsResult) {
      return NextResponse.json(
        { error: "포인트가 부족합니다" },
        { status: 402 }
      );
    }

    // 6. party_reservations INSERT
    const { data: reservation, error: insertError } = await supabase
      .from("party_reservations")
      .insert({
        user_id: user.id,
        package_type,
        date,
        start_time: packageInfo.start,
        end_time: packageInfo.end,
        end_date: endDateStr,
        price_type: pricing.priceType,
        is_event_price: pricing.isEvent,
        total_amount: pointsToUse,
        payment_method: 'points',
        points_used: pointsToUse,
        status: 'confirmed',
        headcount,
        guest_name,
        guest_phone,
        memo,
      })
      .select()
      .single();

    if (insertError) {
      console.error("파티룸 예약 생성 실패:", insertError);
      throw new Error("예약 생성에 실패했습니다");
    }

    // 7. 낮 패키지인 경우 17:00~19:00 BlockedSlot 자동 생성
    if (package_type === 'day') {
      await supabase
        .from("blocked_slots")
        .insert({
          room_id: 'party-room',
          date,
          start_time: '17:00',
          end_time: '19:00',
          reason: '청소 및 환기 시간',
        });
    }

    // 8. 거래 내역에 예약 ID 연결
    await supabase
      .from("point_transactions")
      .update({ reservation_id: reservation.id })
      .eq("user_id", user.id)
      .eq("description", `파티룸 ${package_type} 예약 (${date})`)
      .is("reservation_id", null)
      .order("created_at", { ascending: false })
      .limit(1);

    return NextResponse.json({
      reservation_id: reservation.id,
      points_used: pointsToUse,
      reservation,
    });
  } catch (error) {
    console.error("파티룸 예약 생성 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "예약 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
