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
    CreateReservationSchema.parse(body);

    // 데모 응답 (실제 예약은 `/api/reservations/create` 등 사용)
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

  return NextResponse.json({ reservedSlots: [] });
}
