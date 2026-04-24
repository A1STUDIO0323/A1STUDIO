import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { releasePaymentLock } from "@/lib/payment-lock";

export async function GET() {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const cookieStore = await cookies();
      const partner_order_id =
        cookieStore.get("practice_kakao_order_id")?.value ?? null;

      if (partner_order_id) {
        console.log(
          "[연습실 결제 취소] PaymentLock 해제 시작:",
          partner_order_id
        );
        await releasePaymentLock(user.id, "practice-room", partner_order_id);
        console.log("[연습실 결제 취소] PaymentLock 해제 완료");
      }

      cookieStore.delete("practice_kakao_tid");
      cookieStore.delete("practice_kakao_order_id");
      cookieStore.delete("practice_reservation_data");
    }
  } catch (error) {
    console.error("[연습실 결제 취소] 정리 중 오류:", error);
  }

  return NextResponse.redirect(`${origin}/booking?cancelled=true`);
}
