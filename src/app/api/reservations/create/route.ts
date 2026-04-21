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
import { acquirePaymentLock, releasePaymentLock } from "@/lib/payment-lock";
import { normalizePhoneNumber, isValidPhoneNumber } from "@/lib/phone-utils";

export async function POST(request: NextRequest) {
  let lockKey: string | null = null;
  let userId: string | null = null;
  
  try {
    const supabase = await createClient();

    // 로그인 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }
    
    userId = user.id;

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

    // 결제 중복 방지 락 획득
    lockKey = `${date}_${start_time}_${end_time}`;
    const lockAcquired = await acquirePaymentLock(user.id, "reservation", lockKey, 300); // 5분
    
    if (!lockAcquired) {
      return NextResponse.json(
        { error: "이미 진행 중인 예약이 있습니다. 잠시 후 다시 시도해주세요." },
        { status: 409 }
      );
    }

    // 파티룸 예약인 경우 추가 검증
    if (reservation_type === 'party-room') {
      // 1. 성인 여부 서버사이드 재검증
      const { data: profile } = await supabase
        .from('profiles')
        .select('birth_year')
        .eq('id', user.id)
        .single();

      const birthYear = profile?.birth_year;
      
      if (birthYear == null) {
        return NextResponse.json(
          { error: '파티룸 예약을 위해서는 생년월일 정보가 필요합니다. 프로필을 완성해주세요.' }, 
          { status: 403 }
        );
      }
      
      if (!isAdult(new Date(birthYear, 11, 31))) {
        return NextResponse.json(
          { error: '파티룸은 만 19세 이상 성인만 예약 가능합니다.' }, 
          { status: 403 }
        );
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

    // 중복 예약 체크 (PAID, HOLD, CONFIRMED 상태 모두 포함)
    const { data: existingReservations, error: checkError } = await supabase
      .from("reservations")
      .select("id")
      .eq("date", date)
      .in("status", ["PAID", "HOLD", "CONFIRMED"])
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

    // 사용자 프로필 정보 조회 (guest_name, guest_phone)
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone, birth_year')
      .eq('id', user.id)
      .single();

    // 전화번호 정규화 (82XXXXXXXXXX → 010XXXXXXXX)
    // 우선순위: 1) profiles 테이블, 2) Supabase Auth
    const normalizedPhone = normalizePhoneNumber(profile?.phone || user.phone);

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
      id: crypto.randomUUID(), // ID 직접 생성
      room_id: reservation_type === 'party-room' ? 'party-room' : 'a1-room',
      user_id: user.id,
      guest_name: user.email?.split('@')[0] || '회원',
      guest_phone: normalizedPhone || '미등록',
      date,
      start_time,
      end_time,
      headcount: headcount || 1,
      status: "PAID",
      total_amount: pointsToUse,
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
      console.error("예약 생성 실패:", insertError);
      
      // 포인트 환불 처리
      console.log("포인트 환불 시작...");
      
      // 1. 현재 잔액 조회
      const { data: currentPoints, error: pointsError } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (pointsError) {
        console.error('[ReservationCreate] 포인트 조회 실패:', pointsError);
      }
      
      if (currentPoints) {
        // 2. 잔액 업데이트
        await supabase
          .from('user_points')
          .update({ 
            balance: currentPoints.balance + pointsToUse,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        
        // 3. 환불 거래 기록
        await supabase
          .from('point_transactions')
          .insert({
            user_id: user.id,
            type: 'refund',
            amount: pointsToUse,
            balance_after: currentPoints.balance + pointsToUse,
            description: `예약 실패로 인한 환불 (${date} ${start_time}~${end_time})`,
            reservation_id: null,
          });
      }
      
      throw new Error(`예약 생성에 실패했습니다: ${insertError.message}`);
    }

    // 17:00~19:00 버퍼 슬롯 자동 생성 (낮 패키지 예약 시)
    if (reservation_type === 'party-room' && package_type === 'day') {
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
    const { data: userPoints, error: pointsQueryError } = await supabase
      .from("user_points")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (pointsQueryError) {
      console.warn('[ReservationCreate] 현재 잔액 조회 실패:', pointsQueryError);
    }

    // 예약 확정 메시지 발송 (전화번호가 유효한 경우만)
    const hasValidPhone = normalizedPhone && isValidPhoneNumber(normalizedPhone);
    
    if (hasValidPhone) {
      try {
        const { sendMessage, logMessage } = await import('@/lib/sms');
        const { getPracticeRoomConfirmMessage, getPartyRoomConfirmMessage } = await import('@/lib/message-templates');
        
        const messageContent = reservation_type === 'party-room'
          ? getPartyRoomConfirmMessage({
              guestName: reservationData.guest_name,
              guestPhone: reservationData.guest_phone,
              date,
              startTime: start_time,
              endTime: end_time,
              roomType: 'party',
              packageType: package_type,
            })
          : getPracticeRoomConfirmMessage({
              guestName: reservationData.guest_name,
              guestPhone: reservationData.guest_phone,
              date,
              startTime: start_time,
              endTime: end_time,
              roomType: 'practice',
            });

        const smsResult = await sendMessage({
          to: reservationData.guest_phone,
          text: messageContent,
        });

        // 로그 저장
        await logMessage({
          userId: user.id,
          reservationId: reservation.id,
          phoneNumber: reservationData.guest_phone,
          messageType: 'reservation_confirm',
          content: messageContent,
          status: smsResult.success ? 'success' : 'failed',
          errorMessage: smsResult.error,
          messageId: smsResult.messageId,
        });

        if (smsResult.success) {
          console.log('[예약] 확정 메시지 발송 성공:', smsResult.messageId);
        } else {
          console.warn('[예약] 확정 메시지 발송 실패:', smsResult.error);
        }
      } catch (smsError) {
        // 메시지 발송 실패는 예약을 취소하지 않음
        console.error('[예약] 메시지 발송 오류:', smsError);
      }
    } else {
      console.log('[예약] 전화번호 미등록으로 SMS 발송 건너뜀:', reservationData.guest_phone);
    }

    // 예약 성공 시 락 해제
    if (lockKey && userId) {
      await releasePaymentLock(userId, "reservation", lockKey);
    }

    return NextResponse.json({
      reservation_id: reservation.id,
      points_used: pointsToUse,
      balance_after: userPoints?.balance || 0,
      reservation,
    });
  } catch (error) {
    // 에러 발생 시 락 해제
    if (lockKey && userId) {
      await releasePaymentLock(userId, "reservation", lockKey);
    }
    
    console.error("예약 생성 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "예약 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
