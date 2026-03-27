export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/reservations/holds/expire
 * ??? ??? EXPIRED ???? ?? API
 * Vercel Cron: vercel.json? "0 * * * *" ?? ??
 *
 * Authorization: Bearer {CRON_SECRET} ?? ??
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // DB ?? ? ?? ?? ???
    // const { prisma } = await import("@/lib/db");
    // const now = new Date();
    //
    // ??? ?? ??
    // const expiredHolds = await prisma.reservationHold.findMany({
    //   where: { expiresAt: { lt: now } },
    //   include: { reservation: true },
    // });
    //
    // ?????? ?? ??
    // const result = await prisma.$transaction(
    //   expiredHolds.map((hold) =>
    //     prisma.reservation.update({
    //       where: { id: hold.reservationId },
    //       data: { status: "EXPIRED" },
    //     })
    //   )
    // );
    //
    // ?? ??? ?? (?? CASCADE)
    // await prisma.reservationHold.deleteMany({
    //   where: { expiresAt: { lt: now } },
    // });

    return NextResponse.json({
      processed: 0, // result.length
      message: "?? ??",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[POST /api/reservations/holds/expire]", error);
    return NextResponse.json({ error: "?? ? ??? ??????." }, { status: 500 });
  }
}
