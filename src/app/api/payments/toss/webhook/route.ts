export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/payments/toss/webhook
 * TossPayments 웹훅 처리 (결제 상태 변경 알림)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventType, data } = body as {
      eventType: string;
      data: { paymentKey: string; orderId: string; status: string };
    };

    console.log("[Toss Webhook]", eventType, data);

    // const { prisma } = await import("@/lib/db");

    switch (eventType) {
      case "PAYMENT_STATUS_CHANGED": {
        if (data.status === "CANCELED") {
          // await prisma.$transaction([
          //   prisma.payment.updateMany({ where: { orderId: data.orderId }, data: { status: "CANCELLED" } }),
          //   prisma.reservation.updateMany({
          //     where: { payment: { orderId: data.orderId } },
          //     data: { status: "CANCELLED" },
          //   }),
          // ]);
        }
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[POST /api/payments/toss/webhook]", error);
    return NextResponse.json({ error: "처리 실패" }, { status: 500 });
  }
}
