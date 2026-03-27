export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestKakaoPayReady } from "@/lib/payment/kakaopay";

const ReadySchema = z.object({
  orderId: z.string().min(1),
  partnerUserId: z.string().min(1),
  itemName: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  totalAmount: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = ReadySchema.parse(body);
    const origin = req.nextUrl.origin;

    const ready = await requestKakaoPayReady({
      orderId: data.orderId,
      partnerUserId: data.partnerUserId,
      itemName: data.itemName,
      quantity: data.quantity,
      totalAmount: data.totalAmount,
      approvalUrl: `${origin}/booking/payment/kakao/success?orderId=${encodeURIComponent(data.orderId)}&partnerUserId=${encodeURIComponent(data.partnerUserId)}`,
      cancelUrl: `${origin}/booking/payment/kakao/cancel`,
      failUrl: `${origin}/booking/payment/kakao/fail`,
    });

    const redirectUrl = ready.next_redirect_pc_url ?? ready.next_redirect_mobile_url;
    if (!redirectUrl) {
      return NextResponse.json({ error: "카카오페이 리다이렉트 URL을 받지 못했습니다." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tid: ready.tid,
      redirectUrl,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값 오류", details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "카카오페이 결제 준비 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
