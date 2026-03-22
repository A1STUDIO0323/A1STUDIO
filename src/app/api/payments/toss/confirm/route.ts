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
 * TossPayments 결제 승인 서버사이드 처리
 * 클라이언트에서 결제 위젯 성공 콜백 후 호출
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentKey, orderId, amount } = ConfirmSchema.parse(body);

    // 1. orderId로 예약 조회 및 금액 검증
    // const { prisma } = await import("@/lib/db");
    // const payment = await prisma.payment.findUnique({ where: { orderId }, include: { reservation: true } });
    // if (!payment) return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
    // if (payment.amount !== amount) return NextResponse.json({ error: "결제 금액 불일치" }, { status: 400 });
    // if (payment.status !== "PENDING") return NextResponse.json({ error: "이미 처리된 결제입니다." }, { status: 409 });

    // 2. TossPayments 승인 요청
    const result = await tossPaymentsProvider.confirmPayment({ paymentKey, orderId, amount });

    // 3. DB 상태 업데이트 (트랜잭션)
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
      return NextResponse.json({ error: "입력값 오류", details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "결제 승인 실패";
    console.error("[POST /api/payments/toss/confirm]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
