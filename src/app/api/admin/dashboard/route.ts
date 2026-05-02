export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [monthReservationCount, holdCount, paidAgg, uniqueGuests, reservations] = await Promise.all([
      prisma.reservation.count({
        where: { createdAt: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.reservation.count({
        where: { status: "HOLD" },
      }),
      prisma.reservation.aggregate({
        where: { status: "PAID" },
        _sum: { totalAmount: true },
      }),
      prisma.reservation.findMany({
        distinct: ["guestPhone"],
        select: { guestPhone: true },
      }),
      prisma.reservation.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          guestName: true,
          guestPhone: true,
          date: true,
          startTime: true,
          endTime: true,
          roomId: true,
          totalAmount: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        monthReservationCount,
        totalPaidAmount: paidAgg._sum.totalAmount ?? 0,
        holdCount,
        uniqueGuestCount: uniqueGuests.length,
      },
      reservations,
    });
  } catch (error) {
    console.error("[GET /api/admin/dashboard]", error);
    return NextResponse.json(
      {
        stats: {
          monthReservationCount: 0,
          totalPaidAmount: 0,
          holdCount: 0,
          uniqueGuestCount: 0,
        },
        reservations: [],
      },
      { status: 500 }
    );
  }
}
