import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readyPracticeRoomPayment } from "@/lib/kakaopay";
import {
  acquirePaymentLock,
  deleteExpiredPaymentLocksForUser,
  getActivePaymentLocksForUser,
  releasePaymentLock,
} from "@/lib/payment-lock";
import { calcDuration, calcPoints, getPriceType } from "@/lib/pricing";
import { cookies } from "next/headers";
import { validateUserExists, USER_NOT_FOUND_ERROR } from "@/lib/user-validation";
import { prisma } from "@/lib/db";
import { normalizePhoneNumber } from "@/lib/phone-utils";
import {
  getPaymentErrorMessage,
  reasonFromCaughtKakaoError,
  type PaymentErrorReason,
} from "@/lib/payment-errors";

/**
 * 연습실 카카오페이 결제 준비
 * POST /api/reservations/payments/kakao/ready
 */
export async function POST(request: NextRequest) {
  let partner_order_id: string | null = null;
  let userId: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      const reason: PaymentErrorReason = "auth_required";
      return NextResponse.json(
        { error: getPaymentErrorMessage(reason), reason },
        { status: 401 }
      );
    }
    userId = user.id;

    const body = await request.json();
    const { date, startTime, endTime } = body as {
      date?: string;
      startTime?: string;
      endTime?: string;
    };

    if (!date || !startTime || !endTime) {
      const reason: PaymentErrorReason = "validation_failed";
      return NextResponse.json(
        { error: getPaymentErrorMessage(reason), reason },
        { status: 400 }
      );
    }

    if (!(await validateUserExists(user.id))) {
      return NextResponse.json(
        { ...USER_NOT_FOUND_ERROR, reason: "validation_failed" as const },
        { status: 400 }
      );
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
      const reason: PaymentErrorReason = "slot_already_booked";
      return NextResponse.json(
        { error: getPaymentErrorMessage(reason), reason },
        { status: 409 }
      );
    }

    await deleteExpiredPaymentLocksForUser(user.id, "reservation");
    const activePracticeLocks = await getActivePaymentLocksForUser(
      user.id,
      "reservation"
    );
    if (activePracticeLocks.length > 0) {
      const nowMs = Date.now();
      let minExpires = Infinity;
      for (const row of activePracticeLocks) {
        const t = new Date(row.expires_at).getTime();
        if (t < minExpires) minExpires = t;
      }
      const retryAfter = Math.max(
        1,
        Math.ceil((minExpires - nowMs) / 1000)
      );
      console.log(
        "[PaymentLock] 연습실 활성 락 존재, retryAfter:",
        retryAfter,
        "초"
      );
      return NextResponse.json(
        {
          error: getPaymentErrorMessage("payment_in_progress"),
          reason: "payment_in_progress",
          retryAfter,
        },
        { status: 409 }
      );
    }

    const reservationDate = new Date(date);
    const startHour = parseInt(startTime.split(":")[0], 10);
    const priceType = getPriceType(reservationDate, startHour);
    const duration = calcDuration(startTime, endTime);
    const pricing = calcPoints(priceType, duration, reservationDate);
    const totalAmount = pricing.isEvent ? pricing.eventPrice : pricing.originalPrice;

    partner_order_id = `practice-${user.id}-${Date.now()}`;
    const lockOk = await acquirePaymentLock(
      user.id,
      "reservation",
      partner_order_id,
      600
    );

    if (!lockOk) {
      const again = await getActivePaymentLocksForUser(
        user.id,
        "reservation"
      );
      if (again.length > 0) {
        const nowMs = Date.now();
        let minExpires = Infinity;
        for (const row of again) {
          const t = new Date(row.expires_at).getTime();
          if (t < minExpires) minExpires = t;
        }
        const retryAfter = Math.max(
          1,
          Math.ceil((minExpires - nowMs) / 1000)
        );
        return NextResponse.json(
          {
            error: getPaymentErrorMessage("payment_in_progress"),
            reason: "payment_in_progress",
            retryAfter,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          error: getPaymentErrorMessage("lock_acquire_failed"),
          reason: "lock_acquire_failed",
        },
        { status: 500 }
      );
    }

    const userProfile = await prisma.users.findUnique({
      where: { id: user.id },
      select: { phone: true, name: true },
    });
    const normalizedPhone = normalizePhoneNumber(userProfile?.phone || user.phone);

    const itemName = `A1 STUDIO 연습실 예약 (${date} ${startTime}~${endTime})`;

    const kakaoResult = await readyPracticeRoomPayment({
      userId: user.id,
      orderId: partner_order_id,
      itemName,
      amount: totalAmount,
    });

    const reservationPayload = {
      date,
      startTime,
      endTime,
      totalAmount,
      guestName:
        userProfile?.name?.trim() || user.email?.split("@")[0] || "회원",
      guestPhone: normalizedPhone || "",
    };

    const cookieStore = await cookies();
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    } as const;

    cookieStore.set("practice_kakao_tid", kakaoResult.tid, cookieOpts);
    cookieStore.set("practice_kakao_order_id", partner_order_id, cookieOpts);
    cookieStore.set(
      "practice_reservation_data",
      JSON.stringify(reservationPayload),
      cookieOpts
    );

    return NextResponse.json({
      success: true,
      tid: kakaoResult.tid,
      next_redirect_pc_url: kakaoResult.next_redirect_pc_url,
      next_redirect_mobile_url: kakaoResult.next_redirect_mobile_url,
      redirect_url: kakaoResult.next_redirect_pc_url,
    });
  } catch (error) {
    let reason: PaymentErrorReason = "server_error";
    if (error instanceof Error && (/카카오페이/i.test(error.message) || /\{[\s\S]*\}/.test(error.message))) {
      reason = reasonFromCaughtKakaoError(error);
    }
    console.error("[연습실 카카오페이] 결제 준비 오류:", reason, error);
    if (userId && partner_order_id) {
      await releasePaymentLock(userId, "reservation", partner_order_id);
    }
    return NextResponse.json(
      {
        error: getPaymentErrorMessage(reason),
        reason,
      },
      { status: 500 }
    );
  }
}
