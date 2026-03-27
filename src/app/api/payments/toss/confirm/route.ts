export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { tossPaymentsProvider } from "@/lib/payment/toss";

const ConfirmSchema = z.object({
  paymentKey: z.string(),
  orderId: z.string(),
  amount: z.number().int().positive(),
});

/**
 * POST /api/payments/toss/confirm
 * TossPayments ?? ??
 * ????? ?? ?? ? ??
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentKey, orderId, amount } = ConfirmSchema.parse(body);

    // 1. orderId? ?? ?? ? ?? ??
    // const { prisma } = await import("@/lib/db");
    // const payment = await prisma.payment.findUnique({ where: { orderId }, include: { reservation: true } });
    // if (!payment) return NextResponse.json({ error: "?? ??? ?? ? ????." }, { status: 404 });
    // if (payment.amount !== amount) return NextResponse.json({ error: "?? ?? ???" }, { status: 400 });
    // if (payment.status !== "PENDING") return NextResponse.json({ error: "?? ??? ?????." }, { status: 409 });

    // 2. TossPayments ?? ??
    const result = await tossPaymentsProvider.confirmPayment({ paymentKey, orderId, amount });

    // 3. DB ???? (????)
    // await prisma.$transaction([
    //   prisma.payment.update({
    //     where: { orderId },
    //     data: {
    //       providerPaymentKey: paymentKey,
    //       status: "APPROVED",
    //       approvedAt: new Date(result.approvedAt),
    //       rawResponse: result.raw as object,
    //     },
    //   }),
    //   prisma.reservation.update({
    //     where: { id: payment.reservationId },
    //     data: { status: "PAID" },
    //   }),
    // ]);

    return NextResponse.json({
      success: true,
      paymentKey: result.paymentKey,
      orderId: result.orderId,
      amount: result.amount,
      approvedAt: result.approvedAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "??? ??", details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "?? ?? ?? ??";
    console.error("[POST /api/payments/toss/confirm]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
