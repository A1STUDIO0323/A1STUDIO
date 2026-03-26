export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CreateReservationSchema = z.object({
  roomId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  headcount: z.number().int().min(1).max(20),
  guestName: z.string().min(1).max(50),
  guestPhone: z.string().regex(/^010\d{7,8}$/),
  guestEmail: z.string().email().optional(),
  memo: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateReservationSchema.parse(body);

    // DB 연결 시 아래 코드 활성화
    // const { prisma } = await import("@/lib/db");
    //
    // 1. 슬롯 중복 확인
    // const conflict = await prisma.reservationHold.findFirst({
    //   where: {
    //     roomId: data.roomId,
    //     date: data.date,
    //     OR: [
    //       { startTime: { lte: data.startTime }, endTime: { gt: data.startTime } },
    //       { startTime: { lt: data.endTime }, endTime: { gte: data.endTime } },
    //     ],
    //     expiresAt: { gt: new Date() },
    //   },
    // });
    // if (conflict) {
    //   return NextResponse.json({ error: "이미 예약된 시간대입니다." }, { status: 409 });
    // }
    //
    // 2. 트랜잭션으로 예약 + 홀드 생성
    // const reservation = await prisma.$transaction(async (tx) => {
    //   const res = await tx.reservation.create({
    //     data: { ...data, status: "HOLD", totalAmount: calculateAmount(data), authCode: generateAuthCode() },
    //   });
    //   await tx.reservationHold.create({
    //     data: {
    //       roomId: data.roomId,
    //       reservationId: res.id,
    //       date: data.date,
    //       startTime: data.startTime,
    //       endTime: data.endTime,
    //       expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    //     },
    //   });
    //   return res;
    // });

    // 데모 응답
    const demoReservationId = `RES-${Date.now()}`;
    return NextResponse.json({
      reservationId: demoReservationId,
      status: "HOLD",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      message: "슬롯이 홀드되었습니다. 10분 내 결제를 완료해 주세요.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값이 올바르지 않습니다.", details: error.issues }, { status: 400 });
    }
    console.error("[POST /api/reservations]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const roomId = searchParams.get("roomId");

  if (!date || !roomId) {
    return NextResponse.json({ error: "date, roomId 파라미터가 필요합니다." }, { status: 400 });
  }

  // DB 연결 시 활성화
  // const { prisma } = await import("@/lib/db");
  // const reservations = await prisma.reservation.findMany({
  //   where: { roomId, date, status: { in: ["HOLD", "PAID"] } },
  //   select: { startTime: true, endTime: true, status: true },
  // });

  // 데모 데이터
  return NextResponse.json({ reservedSlots: [] });
}
