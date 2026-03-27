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

    // DB ?? ? ?? ?? ???
    // const { prisma } = await import("@/lib/db");
    //
    // 1. ?? ?? ??
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
    //   return NextResponse.json({ error: "?? ??? ?????." }, { status: 409 });
    // }
    //
    // 2. ?????? ?? + ?? ??
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

    // ?? ??
    const demoReservationId = `RES-${Date.now()}`;
    return NextResponse.json({
      reservationId: demoReservationId,
      status: "HOLD",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      message: "??? ???????. 10? ??? ??? ??????.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "???? ???? ????.", details: error.issues }, { status: 400 });
    }
    console.error("[POST /api/reservations]", error);
    return NextResponse.json({ error: "??? ??????." }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const roomId = searchParams.get("roomId");

  if (!date || !roomId) {
    return NextResponse.json({ error: "date, roomId ????? ?????." }, { status: 400 });
  }

  // DB ?? ? ?? ?? ???
  // const { prisma } = await import("@/lib/db");
  // const reservations = await prisma.reservation.findMany({
  //   where: { roomId, date, status: { in: ["HOLD", "PAID"] } },
  //   select: { startTime: true, endTime: true, status: true },
  // });

  // ?? ??
  return NextResponse.json({ reservedSlots: [] });
}
