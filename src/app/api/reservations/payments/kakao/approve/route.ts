import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { approvePayment } from "@/lib/kakaopay";
import { releasePaymentLock } from "@/lib/payment-lock";
import {
  calcHourlyMixed,
  calcStudioPackagePoints,
  STUDIO_PACKAGES,
  StudioPackage,
} from "@/lib/pricing";
import { cookies } from "next/headers";
import {
  formatPhoneNumber,
  isValidPhoneNumber,
  normalizePhoneNumber,
} from "@/lib/phone-utils";
import { getPaymentErrorMessage } from "@/lib/payment-errors";

function timeToHHMM(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.slice(0, 5);
  return String(value).slice(0, 5);
}

type PracticeReservationCookie = {
  date: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  packageType?: StudioPackage | null;
  guestName: string;
  guestPhone: string;
};

/**
 * 연습실 카카오페이 결제 승인
 * GET /api/reservations/payments/kakao/approve?pg_token=...
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  let lockUserId: string | null = null;
  let partner_order_id: string | null = null;

  try {
    const searchParams = request.nextUrl.searchParams;
    const pg_token = searchParams.get("pg_token");

    if (!pg_token) {
      return NextResponse.redirect(new URL("/booking?failed=true", request.url));
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    lockUserId = user.id;

    const tid = cookieStore.get("practice_kakao_tid")?.value;
    partner_order_id =
      cookieStore.get("practice_kakao_order_id")?.value ?? null;
    const rawData = cookieStore.get("practice_reservation_data")?.value;

    if (!tid || tid.trim() === "") {
      return NextResponse.json(
        {
          error: getPaymentErrorMessage("kakao_invalid_tid"),
          reason: "kakao_invalid_tid" as const,
        },
        { status: 400 }
      );
    }

    if (!partner_order_id || !rawData) {
      console.error("[연습실 카카오페이] 쿠키 정보 없음");
      return NextResponse.redirect(new URL("/booking?failed=true", request.url));
    }

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

    let reservationData: PracticeReservationCookie;
    try {
      reservationData = JSON.parse(rawData) as PracticeReservationCookie;
    } catch {
      return NextResponse.redirect(new URL("/booking?failed=true", request.url));
    }

    const { date, guestName, guestPhone, packageType } = reservationData;
    let { startTime, endTime } = reservationData;

    // 연습실 패키지: 시간 강제 (서버 신뢰값)
    if (packageType && ['day', 'night', 'allday'].includes(packageType)) {
      const pkg = STUDIO_PACKAGES[packageType];
      startTime = pkg.start;
      endTime = pkg.end;
    }

    if (!date || !startTime || !endTime) {
      return NextResponse.redirect(new URL("/booking?failed=true", request.url));
    }

    await approvePayment({
      tid,
      partner_order_id,
      partner_user_id: user.id,
      pg_token,
    });

    const reservationDate = new Date(date);
    let totalAmount: number;
    if (packageType) {
      const pricing = calcStudioPackagePoints(reservationDate, packageType);
      totalAmount = pricing.isEvent ? pricing.eventPrice : pricing.originalPrice;
    } else {
      const pricing = calcHourlyMixed(reservationDate, startTime, endTime);
      totalAmount = pricing.isEvent ? pricing.eventPrice : pricing.originalPrice;
    }

    if (Math.abs(totalAmount - reservationData.totalAmount) > 0) {
      console.warn("[연습실 카카오페이] 쿠키 금액과 서버 재계산 불일치 — 서버 금액 사용", {
        cookie: reservationData.totalAmount,
        server: totalAmount,
      });
    }

    const { data: existingReservations, error: checkError } = await supabase
      .from("reservations")
      .select("id")
      .eq("date", date)
      .in("status", ["PAID", "HOLD", "CONFIRMED"])
      .or(
        `and(start_time.lte.${startTime},end_time.gt.${startTime}),and(start_time.lt.${endTime},end_time.gte.${endTime}),and(start_time.gte.${startTime},end_time.lte.${endTime})`
      );

    if (checkError) {
      throw new Error(`중복 체크 실패: ${checkError.message}`);
    }

    if (existingReservations && existingReservations.length > 0) {
      console.error("[연습실 카카오페이] 승인 후 예약 불가 — 시간대 중복");
      throw new Error("이미 예약된 시간대입니다");
    }

    const guestPhoneNorm = normalizePhoneNumber(guestPhone);
    const guest_phone =
      guestPhoneNorm && isValidPhoneNumber(guestPhoneNorm)
        ? guestPhoneNorm
        : guestPhone?.trim() || "미등록";

    const insertPayload: Record<string, unknown> = {
      id: crypto.randomUUID(),
      room_id: "a1-room",
      user_id: user.id,
      guest_name: guestName?.trim() || "회원",
      guest_phone,
      date,
      start_time: startTime,
      end_time: endTime,
      headcount: 1,
      status: "PAID",
      total_amount: totalAmount,
      points_used: 0,
      payment_method: "kakaopay",
      reservation_type: "room",
    };
    if (packageType) {
      insertPayload.package_type = packageType;
    }

    const { data: reservation, error: insertError } = await supabase
      .from("reservations")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error("[연습실 예약 생성 실패]:", insertError);
      throw new Error("예약 생성에 실패했습니다");
    }

    const smsNorm = normalizePhoneNumber(reservation.guest_phone);
    if (smsNorm && isValidPhoneNumber(smsNorm)) {
      try {
        console.log("[연습실 SMS] 발송 시작");
        const { sendMessage, logMessage } = await import("@/lib/sms");
        const { getPracticeRoomConfirmMessage } = await import(
          "@/lib/message-templates"
        );

        const guestPhoneDisplay =
          formatPhoneNumber(smsNorm) || reservation.guest_phone || smsNorm;

        const messageContent = getPracticeRoomConfirmMessage({
          guestName: reservation.guest_name?.trim() || "회원",
          guestPhone: guestPhoneDisplay,
          date: typeof reservation.date === "string" ? reservation.date : String(reservation.date),
          startTime: timeToHHMM(reservation.start_time),
          endTime: timeToHHMM(reservation.end_time),
          roomType: "practice",
        });

        const smsResult = await sendMessage({
          to: smsNorm,
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
          console.log("[연습실 SMS] 발송 성공:", smsResult.messageId);
        } else {
          console.warn("[연습실 SMS] 발송 실패:", smsResult.error);
        }
      } catch (smsError) {
        console.error("[연습실 SMS] 예외:", smsError);
      }
    } else {
      console.log(
        "[연습실 SMS] 유효한 연락처 없음 — 건너뜀:",
        reservation.guest_phone ?? "(없음)"
      );
    }

    await releasePaymentLock(user.id, "reservation", partner_order_id);

    cookieStore.delete("practice_kakao_tid");
    cookieStore.delete("practice_kakao_order_id");
    cookieStore.delete("practice_reservation_data");

    return NextResponse.redirect(
      new URL(
        `/booking/complete?id=${reservation.id}&method=kakaopay`,
        request.url
      )
    );
  } catch (error) {
    console.error("[연습실 카카오페이] 승인 오류:", error);
    if (lockUserId && partner_order_id) {
      await releasePaymentLock(lockUserId, "reservation", partner_order_id);
    }
    cookieStore.delete("practice_kakao_tid");
    cookieStore.delete("practice_kakao_order_id");
    cookieStore.delete("practice_reservation_data");
    return NextResponse.redirect(new URL("/booking?failed=true", request.url));
  }
}
