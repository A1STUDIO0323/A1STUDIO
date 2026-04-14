import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * 카카오페이 결제 취소 (사용자가 결제창에서 취소)
 * GET /api/party-room/payments/kakao/cancel
 */
export async function GET(request: NextRequest) {
  try {
    // 쿠키 정리
    const cookieStore = await cookies();
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

    // 예약 페이지로 리디렉트
    return NextResponse.redirect(new URL("/party-room/booking?cancelled=true", request.url));
  } catch (error) {
    console.error("카카오페이 결제 취소 처리 오류:", error);
    return NextResponse.redirect(new URL("/party-room/booking", request.url));
  }
}
