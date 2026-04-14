import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readyPartyRoomPayment } from "@/lib/kakaopay";
import { calcPartyRoomPoints, PartyRoomPackage, PARTY_ROOM_MAX_HEADCOUNT } from "@/lib/pricing";
import { isAdult } from "@/lib/age-check";
import { cookies } from "next/headers";

/**
 * 카카오페이 결제 준비 (파티룸용)
 * POST /api/party-room/payments/kakao/ready
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

    // 3. 중복 예약 확인 (PAID, HOLD, CONFIRMED 상태 모두 포함)
    const { data: existingReservations } = await supabase
      .from("party_reservations")
      .select("id")
      .in("status", ["PAID", "HOLD", "CONFIRMED"])
      .or(`date.eq.${date},end_date.eq.${date}`);

    if (existingReservations && existingReservations.length > 0) {
      return NextResponse.json(
        { error: "이미 예약된 날짜입니다" },
        { status: 409 }
      );
    }

    // 4. 포인트 계산
    const reservationDate = new Date(date);
    const pricing = calcPartyRoomPoints(reservationDate, package_type as PartyRoomPackage);
    const amount = pricing.isEvent ? pricing.eventPrice : pricing.originalPrice;

    // 5. 주문 ID 생성
    const orderId = `PR-${Date.now()}-${user.id.substring(0, 8)}`;

    // 6. 카카오페이 결제 준비
    const kakaoResult = await readyPartyRoomPayment({
      userId: user.id,
      orderId,
      packageType: package_type,
      packageDate: date,
      amount,
    });

    // 7. 쿠키에 결제 정보 저장
    const cookieStore = await cookies();
    cookieStore.set("party_kakao_tid", kakaoResult.tid, { maxAge: 900 }); // 15분
    cookieStore.set("party_order_id", orderId, { maxAge: 900 });
    cookieStore.set("party_package_type", package_type, { maxAge: 900 });
    cookieStore.set("party_date", date, { maxAge: 900 });
    cookieStore.set("party_amount", String(amount), { maxAge: 900 });
    cookieStore.set("party_guest_name", guest_name || "", { maxAge: 900 });
    cookieStore.set("party_guest_phone", guest_phone || "", { maxAge: 900 });
    cookieStore.set("party_memo", memo || "", { maxAge: 900 });
    cookieStore.set("party_headcount", String(headcount), { maxAge: 900 });
    cookieStore.set("party_price_type", pricing.priceType, { maxAge: 900 });
    cookieStore.set("party_is_event", String(pricing.isEvent), { maxAge: 900 });

    return NextResponse.json({
      redirect_url: kakaoResult.next_redirect_pc_url,
      tid: kakaoResult.tid,
    });
  } catch (error) {
    console.error("카카오페이 결제 준비 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "결제 준비에 실패했습니다" },
      { status: 500 }
    );
  }
}
