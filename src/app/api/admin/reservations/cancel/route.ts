export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getPointBalanceServiceRole,
  refundPointsDBServiceRole,
} from "@/lib/supabase-points";
import {
  calculatePartyRoomRefund,
  calculatePracticeRoomRefund,
  canCancelReservation,
} from "@/lib/refund-policy";

function requireAdmin(request: NextRequest): NextResponse | null {
  const pw = request.headers.get("x-admin-password");
  if (!pw || pw !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }
  return null;
}

export async function POST(request: NextRequest) {
  const forbidden = requireAdmin(request);
  if (forbidden) return forbidden;

  try {
    const body = await request.json();
    const reservationId: string | undefined =
      body.reservationId ?? body.reservation_id;
    if (!reservationId) {
      return NextResponse.json(
        { error: "reservationId가 필요합니다" },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      return NextResponse.json(
        { error: "예약을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const statusUpper = String(reservation.status).toUpperCase();
    if (!["PAID", "CONFIRMED"].includes(statusUpper)) {
      return NextResponse.json(
        { error: "결제완료·확정 예약만 관리자 취소할 수 있습니다" },
        { status: 400 }
      );
    }

    const isPartyRoom = reservation.reservationType === "party-room";
    const roomKind = isPartyRoom ? "party" : "practice";
    const reservationDateTime = new Date(
      `${reservation.date}T${reservation.startTime}`
    );

    const cancelCheck = canCancelReservation(reservationDateTime, roomKind);
    if (!cancelCheck.canCancel) {
      return NextResponse.json({ error: cancelCheck.message }, { status: 400 });
    }

    const originalAmount = reservation.totalAmount ?? 0;
    const refundInfo = isPartyRoom
      ? calculatePartyRoomRefund(reservationDateTime, originalAmount)
      : calculatePracticeRoomRefund(reservationDateTime, originalAmount);

    console.log("[관리자 예약 취소]", {
      reservationId,
      refundRate: refundInfo.refundRate,
      refundAmount: refundInfo.refundAmount,
      reason: refundInfo.reason,
    });

    let balanceAfter: number | null = null;

    if (refundInfo.refundAmount > 0) {
      if (!reservation.userId) {
        return NextResponse.json(
          {
            error:
              "환불할 포인트가 있으나 예약에 회원(user_id)이 없습니다. 수동 처리해 주세요.",
          },
          { status: 400 }
        );
      }
      const refundResult = await refundPointsDBServiceRole({
        userId: reservation.userId,
        points: refundInfo.refundAmount,
        description: `[관리자 취소] ${refundInfo.reason}`,
        reservationId,
      });
      if (!refundResult.success) {
        return NextResponse.json(
          { error: refundResult.error || "포인트 환불에 실패했습니다" },
          { status: 500 }
        );
      }
      balanceAfter = refundResult.newBalance;
    } else if (reservation.userId) {
      balanceAfter = await getPointBalanceServiceRole(reservation.userId);
    }

    await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: "CANCELLED" },
    });

    if (isPartyRoom && reservation.packageType === "day") {
      await prisma.blockedSlot.deleteMany({
        where: {
          roomId: "party-room",
          date: reservation.date,
          startTime: "17:00",
          endTime: "19:00",
        },
      });
    }

    return NextResponse.json({
      success: true,
      refund_rate: refundInfo.refundRate,
      refund_points: refundInfo.refundAmount,
      reason: refundInfo.reason,
      balance_after: balanceAfter,
    });
  } catch (e) {
    console.error("[관리자 예약 취소]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "예약 취소에 실패했습니다" },
      { status: 500 }
    );
  }
}
