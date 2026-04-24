import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { releasePaymentLock } from "@/lib/payment-lock";

/**
 * 카카오페이 결제 취소 (사용자가 결제창에서 취소)
 * GET /api/party-room/payments/kakao/cancel
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const cookieStore = await cookies();

    if (user) {
      const orderId = cookieStore.get("party_order_id")?.value ?? null;
      if (orderId) {
        console.log("[파티룸 결제 취소] PaymentLock 해제 시작:", orderId);
        await releasePaymentLock(user.id, "party-room", orderId);
        console.log("[파티룸 결제 취소] PaymentLock 해제 완료");
      }
    }

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

    return NextResponse.redirect(new URL("/party-room/booking?cancelled=true", request.url));
  } catch (error) {
    console.error("카카오페이 결제 취소 처리 오류:", error);
    return NextResponse.redirect(new URL("/party-room/booking", request.url));
  }
}
