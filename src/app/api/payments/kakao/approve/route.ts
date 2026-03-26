export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestKakaoPayApprove } from "@/lib/payment/kakaopay";

const ApproveSchema = z.object({
  orderId: z.string().min(1),
  partnerUserId: z.string().min(1),
  pgToken: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = ApproveSchema.parse(body);

    const approved = await requestKakaoPayApprove({
      orderId: data.orderId,
      partnerUserId: data.partnerUserId,
      pgToken: data.pgToken,
    });

    return NextResponse.json({
      success: true,
      orderId: approved.partner_order_id,
      amount: approved.amount.total,
      approvedAt: approved.approved_at,
      paymentMethod: approved.payment_method_type,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "?ÖÎ†•Í∞??§Î•ò", details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Ïπ¥Ïπ¥?§Ìéò???πÏù∏ ?§Ìå®";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
