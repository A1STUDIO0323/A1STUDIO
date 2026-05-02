import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { approvePartyRoomPayment } from "@/lib/kakaopay";
import { PARTY_ROOM_PACKAGES, PartyRoomPackage } from "@/lib/pricing";
import { cookies } from "next/headers";
import { formatPhoneNumber, isValidPhoneNumber, normalizePhoneNumber } from "@/lib/phone-utils";
import { releasePaymentLock } from "@/lib/payment-lock";
import { getPaymentErrorMessage } from "@/lib/payment-errors";

function timeToHHMM(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.slice(0, 5);
  return String(value).slice(0, 5);
}

/**
 * 카카오페이 결제 승인 (파티룸용)
 * GET /api/party-room/payments/kakao/approve?pg_token=...
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pg_token = searchParams.get("pg_token");

    if (!pg_token) {
      return NextResponse.redirect(new URL("/party-room/booking?failed=true", request.url));
    }

    const supabase = await createClient();

    // 로그인 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // 쿠키에서 결제 정보 읽기
    const cookieStore = await cookies();
    const tid = cookieStore.get("party_kakao_tid")?.value;
    const orderId = cookieStore.get("party_order_id")?.value;
    const packageType = cookieStore.get("party_package_type")?.value;
    const date = cookieStore.get("party_date")?.value;
    const amount = cookieStore.get("party_amount")?.value;
    const guestName = cookieStore.get("party_guest_name")?.value;
    const guestPhone = cookieStore.get("party_guest_phone")?.value;
    const memo = cookieStore.get("party_memo")?.value;
    const headcount = cookieStore.get("party_headcount")?.value;
    const priceType = cookieStore.get("party_price_type")?.value;
    const isEvent = cookieStore.get("party_is_event")?.value === 'true';

    if (!tid || !orderId || !packageType || !date || !amount) {
      return NextResponse.redirect(new URL("/party-room/booking?failed=true", request.url));
    }

    // TODO(stability): 카카오 기본 리다이렉트는 pg_token만 붙임.tid 쿼리는 ready의 approval_url에 붙이면 교차검증이 상시 동작함.
    const requestTid = searchParams.get("tid");
    if (requestTid != null && requestTid !== "" && requestTid !== tid) {
      return NextResponse.json(
        {
          error: getPaymentErrorMessage("kakao_invalid_tid"),
          reason: "kakao_invalid_tid" as const,
        },
        { status: 400 }
      );
    }

    // 카카오페이 결제 승인
    await approvePartyRoomPayment({
      tid,
      partner_order_id: orderId,
      partner_user_id: user.id,
      pg_token,
    });

    // end_date 계산
    const endDate = new Date(date);
    if (packageType === 'night' || packageType === 'allday') {
      endDate.setDate(endDate.getDate() + 1);
    }
    const endDateStr = endDate.toISOString().split('T')[0];

    const packageInfo = PARTY_ROOM_PACKAGES[packageType as keyof typeof PARTY_ROOM_PACKAGES];
    const durationHours = packageInfo.hours;

    // party_reservations INSERT
    const { data: reservation, error: insertError } = await supabase
      .from("party_reservations")
      .insert({
        user_id: user.id,
        package_type: packageType,
        date,
        start_time: packageInfo.start,
        end_time: packageInfo.end,
        end_date: endDateStr,
        duration_hours: durationHours,
        price_type: priceType,
        is_event_price: isEvent,
        total_amount: parseInt(amount),
        payment_method: 'kakaopay',
        points_used: 0,
        status: 'confirmed',
        kakaopay_tid: tid,
        kakaopay_order_id: orderId,
        kakaopay_payment_status: "approved",
        kakaopay_approved_at: new Date().toISOString(),
        headcount: parseInt(headcount || '10'),
        guest_name: guestName,
        guest_phone: guestPhone,
        memo,
      })
      .select()
      .single();

    if (insertError) {
      console.error("파티룸 예약 생성 실패:", insertError);
      throw new Error("예약 생성에 실패했습니다");
    }

    // 낮 패키지인 경우 17:00~19:00 BlockedSlot 자동 생성
    if (packageType === 'day') {
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

    const guestPhoneNorm = normalizePhoneNumber(reservation.guest_phone);
    if (guestPhoneNorm && isValidPhoneNumber(guestPhoneNorm)) {
      try {
        console.log("[파티룸 SMS] 발송 시작");
        const { sendMessage, logMessage } = await import("@/lib/sms");
        const { getPartyRoomConfirmMessage } = await import("@/lib/message-templates");

        const guestPhoneDisplay =
          formatPhoneNumber(guestPhoneNorm) || reservation.guest_phone || guestPhoneNorm;
        const pkg = packageType as PartyRoomPackage;
        const messageContent = getPartyRoomConfirmMessage({
          guestName: reservation.guest_name?.trim() || "회원",
          guestPhone: guestPhoneDisplay,
          date: typeof reservation.date === "string" ? reservation.date : String(reservation.date),
          startTime: timeToHHMM(reservation.start_time),
          endTime: timeToHHMM(reservation.end_time),
          roomType: "party",
          packageType: pkg,
        });

        const smsResult = await sendMessage({
          to: guestPhoneNorm,
          text: messageContent,
        });

        await logMessage({
          userId: user.id,
          reservationId: reservation.id,
          phoneNumber: guestPhoneDisplay,
          messageType: "reservation_confirm",
          content: messageContent,
          status: smsResult.success ? "success" : "failed",
          errorMessage: smsResult.error,
          messageId: smsResult.messageId,
        });

        if (smsResult.success) {
          console.log("[파티룸 SMS] 발송 성공:", smsResult.messageId);
        } else {
          console.warn("[파티룸 SMS] 발송 실패:", smsResult.error);
        }
      } catch (smsError) {
        console.error("[파티룸 SMS] 예외 발생:", smsError);
      }
    } else {
      console.log(
        "[파티룸 SMS] 유효한 연락처 없음 — 발송 건너뜀:",
        reservation.guest_phone ?? "(없음)"
      );
    }

    await releasePaymentLock(user.id, "reservation", orderId);

    // 쿠키 정리
    cookieStore.delete("party_kakao_tid");
    cookieStore.delete("party_order_id");
    cookieStore.delete("party_package_type");
    cookieStore.delete("party_date");
    cookieStore.delete("party_amount");
    cookieStore.delete("party_guest_name");
    cookieStore.delete("party_guest_phone");
    cookieStore.delete("party_memo");
    cookieStore.delete("party_headcount");
    cookieStore.delete("party_price_type");
    cookieStore.delete("party_is_event");

    // 예약 완료 페이지로 리디렉트
    return NextResponse.redirect(
      new URL(`/party-room/booking/complete?id=${reservation.id}`, request.url)
    );
  } catch (error) {
    console.error("카카오페이 결제 승인 오류:", error);
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const cookieStore = await cookies();
      const oid = cookieStore.get("party_order_id")?.value ?? null;
      if (user && oid) {
        await releasePaymentLock(user.id, "reservation", oid);
      }
    } catch (e) {
      console.error("[파티룸 승인] 락 해제 실패:", e);
    }
    return NextResponse.redirect(new URL("/party-room/booking?failed=true", request.url));
  }
}
