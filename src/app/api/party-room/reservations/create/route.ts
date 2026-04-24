import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { deductPointsDB } from "@/lib/supabase-points";
import { calcPartyRoomPoints, PartyRoomPackage, PARTY_ROOM_MAX_HEADCOUNT, PARTY_ROOM_PACKAGES } from "@/lib/pricing";
import { isAdult } from "@/lib/age-check";
import { acquirePaymentLock, releasePaymentLock } from "@/lib/payment-lock";
import { normalizePhoneNumber, isValidPhoneNumber } from "@/lib/phone-utils";

/**
 * 파티룸 예약 생성 (포인트 결제)
 * POST /api/party-room/reservations/create
 */
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
      package_type,
      date,
      guest_name,
      guest_phone: rawGuestPhone,
      memo,
      headcount = 10,
    } = body;

    // 전화번호 정규화 (82XXXXXXXXXX → 010XXXXXXXX)
    // 우선순위: 1) body의 guest_phone, 2) Supabase Auth
    const guest_phone = normalizePhoneNumber(rawGuestPhone || user.phone) || rawGuestPhone;

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

    // 결제 중복 방지 락 획득
    lockKey = `party_${date}_${package_type}`;
    const lockAcquired = await acquirePaymentLock(user.id, "party-room", lockKey, 300); // 5분
    
    if (!lockAcquired) {
      return NextResponse.json(
        { error: "이미 진행 중인 예약이 있습니다. 잠시 후 다시 시도해주세요." },
        { status: 409 }
      );
    }

    // 1. 성인 여부 — public.users 는 PostgREST(RLS)로 읽으면 permission denied 될 수 있어 Prisma(DB 직결) 사용
    console.log("[Party Room Create] Step age: Checking age verification (Prisma users.birth_year)");
    let profileRow: { birth_year: number | null } | null = null;
    try {
      profileRow = await prisma.users.findUnique({
        where: { id: user.id },
        select: { birth_year: true },
      });
    } catch (prismaErr) {
      console.error("[Party Room Create] Prisma users lookup failed:", prismaErr);
      return NextResponse.json(
        { error: "프로필 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
        { status: 500 }
      );
    }

    console.log("[Party Room Create] Profile row (Prisma):", profileRow);
    const birthYear = profileRow?.birth_year ?? null;
    console.log("[Party Room Create] birth_year:", birthYear);

    if (birthYear == null) {
      console.log("[Party Room Create] No birth_year on users row (Prisma)");
      return NextResponse.json(
        {
          error:
            "파티룸 예약을 위해서는 출생연도 정보가 필요합니다. 마이페이지에서 프로필을 완성해주세요.",
        },
        { status: 403 }
      );
    }

    const birthDateForAge = new Date(birthYear, 11, 31);
    const isAdultUser = isAdult(birthDateForAge);
    console.log("[Party Room Create] isAdult (end-of-birth-year):", isAdultUser);

    if (!isAdultUser) {
      console.log("[Party Room Create] Age verification failed");
      return NextResponse.json(
        { error: "파티룸은 만 19세 이상 성인만 예약 가능합니다." },
        { status: 403 }
      );
    }

    // 2. 최대 인원 검증
    if (headcount > PARTY_ROOM_MAX_HEADCOUNT) {
      return NextResponse.json({ error: '최대 10명까지 이용 가능' }, { status: 400 });
    }

    // 3. 중복 예약 확인 (PAID, HOLD, CONFIRMED 상태 모두 포함)
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
      .in("status", ["PAID", "HOLD", "CONFIRMED"])
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

    const pointDescription = `파티룸 ${package_type} 예약 (${date})`;

    const pointResult = await deductPointsDB({
      userId: user.id,
      points: pointsToUse,
      description: pointDescription,
    });

    if (!pointResult.success) {
      return NextResponse.json(
        { error: pointResult.error || "포인트 차감 실패" },
        { status: 400 }
      );
    }

    // 6. party_reservations INSERT (실패 시 메시지에 users 권한이 보이면 DB 트리거·RLS를 점검)
    console.log("[Party Room Create] About to insert party_reservations", {
      userId: user.id,
      date,
      package_type,
    });
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
        status: 'PAID',
        headcount,
        guest_name,
        guest_phone,
        memo,
      })
      .select()
      .single();

    if (insertError) {
      console.error("파티룸 예약 생성 실패:", insertError);
      
      // 포인트 환불 처리
      console.log("포인트 환불 시작...");
      
      // 1. 현재 잔액 조회
      const { data: currentPoints, error: pointsError } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (pointsError) {
        console.error('[PartyRoomCreate] 포인트 조회 실패:', pointsError);
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
            description: `파티룸 예약 실패로 인한 환불 (${date})`,
            reservation_id: null,
          });
      }
      
      throw new Error(`예약 생성에 실패했습니다: ${insertError.message}`);
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
      .eq("description", pointDescription)
      .is("reservation_id", null)
      .order("created_at", { ascending: false })
      .limit(1);

    // 9. 예약 확정 메시지 발송 (전화번호가 유효한 경우만)
    const hasValidPhone = isValidPhoneNumber(guest_phone);
    
    if (hasValidPhone) {
      try {
        const { sendMessage, logMessage } = await import('@/lib/sms');
        const { getPartyRoomConfirmMessage } = await import('@/lib/message-templates');
        
        const messageContent = getPartyRoomConfirmMessage({
          guestName: guest_name,
          guestPhone: guest_phone,
          date,
          startTime: packageInfo.start,
          endTime: packageInfo.end,
          roomType: 'party',
          packageType: package_type as 'day' | 'night' | 'allday',
        });

        const smsResult = await sendMessage({
          to: guest_phone,
          text: messageContent,
        });

        // 로그 저장
        await logMessage({
          userId: user.id,
          reservationId: reservation.id,
          phoneNumber: guest_phone,
          messageType: 'reservation_confirm',
          content: messageContent,
          status: smsResult.success ? 'success' : 'failed',
          errorMessage: smsResult.error,
          messageId: smsResult.messageId,
        });

        if (smsResult.success) {
          console.log('[파티룸 예약] 확정 메시지 발송 성공:', smsResult.messageId);
        } else {
          console.warn('[파티룸 예약] 확정 메시지 발송 실패:', smsResult.error);
        }
      } catch (smsError) {
        // 메시지 발송 실패는 예약을 취소하지 않음
        console.error('[파티룸 예약] 메시지 발송 오류:', smsError);
      }
    } else {
      console.log('[파티룸 예약] 전화번호 미등록으로 SMS 발송 건너뜀:', guest_phone);
    }

    // 예약 성공 시 락 해제
    if (lockKey && userId) {
      await releasePaymentLock(userId, "party-room", lockKey);
    }

    return NextResponse.json({
      success: true,
      reservation_id: reservation.id,
      points_used: pointsToUse,
      pointBalance: pointResult.newBalance,
      reservation,
    });
  } catch (error) {
    // 에러 발생 시 락 해제
    if (lockKey && userId) {
      await releasePaymentLock(userId, "party-room", lockKey);
    }
    
    console.error("파티룸 예약 생성 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "예약 생성에 실패했습니다" },
      { status: 500 }
    );
  }
}
