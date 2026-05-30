import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readyPartyRoomPayment } from "@/lib/kakaopay";
import { calcPartyRoomPoints, PartyRoomPackage, PARTY_ROOM_MAX_HEADCOUNT, PARTY_ROOM_PACKAGES } from "@/lib/pricing";
import { hasPracticeConflict } from "@/lib/space-availability";
import { isAdult } from "@/lib/age-check";
import { cookies } from "next/headers";
import {
  acquirePaymentLock,
  deleteExpiredPaymentLocksForUser,
  getActivePaymentLocksForUser,
  releasePaymentLock,
} from "@/lib/payment-lock";
import {
  getPaymentErrorMessage,
  reasonFromCaughtKakaoError,
  type PaymentErrorReason,
} from "@/lib/payment-errors";

/**
 * 카카오페이 결제 준비 (파티룸용)
 * POST /api/party-room/payments/kakao/ready
 */
export async function POST(request: NextRequest) {
  let orderId: string | null = null;
  let userId: string | null = null;

  try {
    const supabase = await createClient();

    // 로그인 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      const reason: PaymentErrorReason = "auth_required";
      return NextResponse.json(
        { error: getPaymentErrorMessage(reason), reason },
        { status: 401 }
      );
    }
    userId = user.id;

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
      const reason: PaymentErrorReason = "validation_failed";
      return NextResponse.json(
        { error: getPaymentErrorMessage(reason), reason },
        { status: 400 }
      );
    }

    // 1. 성인 여부 서버사이드 재검증 (public.users.birth_year)
    const { data: profile } = await supabase
      .from("users")
      .select("birth_year")
      .eq("id", user.id)
      .maybeSingle();

    const birthYear = profile?.birth_year ?? null;
    if (birthYear == null) {
      return NextResponse.json(
        {
          error:
            "파티룸 예약을 위해서는 출생연도 정보가 필요합니다. 마이페이지에서 프로필을 완성해주세요.",
          reason: "validation_failed" as const,
        },
        { status: 403 }
      );
    }
    if (!isAdult(new Date(birthYear, 11, 31))) {
      return NextResponse.json(
        {
          error: "파티룸은 만 19세 이상 성인만 예약 가능합니다.",
          reason: "validation_failed" as const,
        },
        { status: 403 }
      );
    }

    // 2. 최대 인원 검증
    if (headcount > PARTY_ROOM_MAX_HEADCOUNT) {
      return NextResponse.json(
        {
          error: "최대 10명까지 이용 가능",
          reason: "validation_failed" as const,
        },
        { status: 400 }
      );
    }

    // 3. 중복 예약 확인 (PAID, HOLD, CONFIRMED 상태 모두 포함)
    const { data: existingReservations } = await supabase
      .from("party_reservations")
      .select("id")
      .in("status", ["PAID", "HOLD", "CONFIRMED"])
      .or(`date.eq.${date},end_date.eq.${date}`);

    if (existingReservations && existingReservations.length > 0) {
      return NextResponse.json(
        {
          error: getPaymentErrorMessage("slot_already_booked"),
          reason: "slot_already_booked" as const,
        },
        { status: 409 }
      );
    }

    // 3-1. 공유 공간 교차검사: 같은 시간대 연습실(reservations) 예약과 충돌 확인
    {
      const pkgInfo = PARTY_ROOM_PACKAGES[package_type as PartyRoomPackage];
      const endDateObj = new Date(date);
      if (package_type === "night" || package_type === "allday") {
        endDateObj.setDate(endDateObj.getDate() + 1);
      }
      const endDateStr = endDateObj.toISOString().split("T")[0];
      if (
        pkgInfo &&
        (await hasPracticeConflict(supabase, {
          date,
          startTime: pkgInfo.start,
          endTime: pkgInfo.end,
          endDate: endDateStr,
        }))
      ) {
        console.warn("[파티룸 카카오 ready] 연습실 예약과 시간 충돌:", {
          date,
          package_type,
        });
        return NextResponse.json(
          {
            error: getPaymentErrorMessage("slot_already_booked"),
            reason: "slot_already_booked" as const,
          },
          { status: 409 }
        );
      }
    }

    await deleteExpiredPaymentLocksForUser(user.id, "reservation");
    const activePartyLocks = await getActivePaymentLocksForUser(
      user.id,
      "reservation"
    );
    if (activePartyLocks.length > 0) {
      const nowMs = Date.now();
      let minExpires = Infinity;
      for (const row of activePartyLocks) {
        const t = new Date(row.expires_at).getTime();
        if (t < minExpires) minExpires = t;
      }
      const retryAfter = Math.max(
        1,
        Math.ceil((minExpires - nowMs) / 1000)
      );
      console.log(
        "[PaymentLock] 파티룸 활성 락 존재, retryAfter:",
        retryAfter,
        "초"
      );
      return NextResponse.json(
        {
          error: getPaymentErrorMessage("payment_in_progress"),
          reason: "payment_in_progress" as const,
          retryAfter,
        },
        { status: 409 }
      );
    }

    // 4. 포인트 계산
    const reservationDate = new Date(date);
    const pricing = calcPartyRoomPoints(reservationDate, package_type as PartyRoomPackage);
    const amount = pricing.isEvent ? pricing.eventPrice : pricing.originalPrice;

    // 5. 주문 ID 생성
    orderId = `PR-${Date.now()}-${user.id.substring(0, 8)}`;

    const lockOk = await acquirePaymentLock(
      user.id,
      "reservation",
      orderId,
      600
    );
    if (!lockOk) {
      const again = await getActivePaymentLocksForUser(user.id, "reservation");
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
            reason: "payment_in_progress" as const,
            retryAfter,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          error: getPaymentErrorMessage("lock_acquire_failed"),
          reason: "lock_acquire_failed" as const,
        },
        { status: 500 }
      );
    }

    // 6. 카카오페이 결제 준비
    const kakaoResult = await readyPartyRoomPayment({
      userId: user.id,
      orderId,
      packageType: package_type,
      packageDate: date,
      amount,
    });

    const tid = kakaoResult.tid;
    if (!tid || String(tid).trim() === "") {
      await releasePaymentLock(user.id, "reservation", orderId);
      return NextResponse.json(
        {
          error: getPaymentErrorMessage("kakao_invalid_tid"),
          reason: "kakao_invalid_tid" as const,
        },
        { status: 500 }
      );
    }

    // 7. 쿠키에 결제 정보 저장
    const cookieStore = await cookies();
    cookieStore.set("party_kakao_tid", tid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
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
      tid,
    });
  } catch (error) {
    let reason: PaymentErrorReason = "server_error";
    if (
      error instanceof Error &&
      (/카카오페이/i.test(error.message) || /\{[\s\S]*\}/.test(error.message))
    ) {
      reason = reasonFromCaughtKakaoError(error);
    }
    console.error("카카오페이 결제 준비 오류:", reason, error);
    if (userId && orderId) {
      await releasePaymentLock(userId, "reservation", orderId);
    }
    return NextResponse.json(
      { error: getPaymentErrorMessage(reason), reason },
      { status: 500 }
    );
  }
}
