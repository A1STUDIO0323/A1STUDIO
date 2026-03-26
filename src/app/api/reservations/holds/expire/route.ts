export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/reservations/holds/expire
 * 만료된 홀드를 EXPIRED 처리하는 크론 API
 * Vercel Cron: vercel.json 에서 "0 * * * *" 등으로 스케줄 등록
 * 
 * 헤더 Authorization: Bearer {CRON_SECRET} 으로 인증
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // DB 연결 시 활성화
    // const { prisma } = await import("@/lib/db");
    // const now = new Date();
    //
    // 만료된 홀드 조회
    // const expiredHolds = await prisma.reservationHold.findMany({
    //   where: { expiresAt: { lt: now } },
    //   include: { reservation: true },
    // });
    //
    // 트랜잭션으로 일괄 만료 처리
    // const result = await prisma.$transaction(
    //   expiredHolds.map((hold) =>
    //     prisma.reservation.update({
    //       where: { id: hold.reservationId },
    //       data: { status: "EXPIRED" },
    //     })
    //   )
    // );
    //
    // 홀드 레코드 삭제 (또는 CASCADE)
    // await prisma.reservationHold.deleteMany({
    //   where: { expiresAt: { lt: now } },
    // });

    return NextResponse.json({
      processed: 0, // result.length
      message: "만료 처리 완료",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[POST /api/reservations/holds/expire]", error);
    return NextResponse.json({ error: "처리 중 오류 발생" }, { status: 500 });
  }
}
