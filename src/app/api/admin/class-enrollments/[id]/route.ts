import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { refundPointsDBServiceRole } from "@/lib/supabase-points";

function isAdmin(req: NextRequest): boolean {
  const pw = req.headers.get("x-admin-password");
  return !!pw && pw === process.env.ADMIN_PASSWORD;
}

const RATIO_BY_TYPE: Record<"oneday" | "lesson", number> = {
  oneday: 50,
  lesson: 70,
};

/**
 * 관리자 — enrollment 처리
 * PATCH /api/admin/class-enrollments/[id]
 *
 * body.action:
 *  - 'complete'  : 수업 완료 → points_held → points_used + cm_settlements 자동 생성
 *  - 'cancel'    : 취소 → 포인트 환불 (refund) + points_held → points_refunded
 *  - 'no_show'   : 노쇼 → 환불 불가 처리, points_used 전환 + cm_settlements 자동 생성 (정책 10-4)
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json();
  const { action, reason } = body as { action?: string; reason?: string };

  if (!action || !["complete", "cancel", "no_show"].includes(action)) {
    return NextResponse.json(
      { error: "action은 complete / cancel / no_show 중 하나여야 합니다" },
      { status: 400 }
    );
  }

  const enrollment = await prisma.class_enrollments.findUnique({
    where: { id },
    include: {
      offering: { select: { id: true, type: true, title: true, cm_user_id: true } },
    },
  });

  if (!enrollment) {
    return NextResponse.json({ error: "신청을 찾을 수 없습니다" }, { status: 404 });
  }

  if (enrollment.status !== "HELD") {
    return NextResponse.json(
      { error: `현재 상태(${enrollment.status})에서는 처리할 수 없습니다` },
      { status: 400 }
    );
  }

  const offeringType = enrollment.offering.type as "oneday" | "lesson";

  // ===== CANCEL: 환불 처리 =====
  if (action === "cancel") {
    const heldAmount = enrollment.points_held;
    if (heldAmount > 0) {
      const refund = await refundPointsDBServiceRole({
        userId: enrollment.user_id,
        points: heldAmount,
        description: `[${offeringType === "oneday" ? "원데이클래스" : "개인레슨"} 취소 환불] ${enrollment.offering.title}`,
        reservationId: null,
      });
      if (!refund.success) {
        return NextResponse.json(
          { error: refund.error ?? "포인트 환불 실패. 잠시 후 다시 시도해주세요." },
          { status: 500 }
        );
      }
    }

    const updated = await prisma.class_enrollments.update({
      where: { id },
      data: {
        status: "CANCELLED",
        points_held: 0,
        points_refunded: heldAmount,
        cancelled_at: new Date(),
        cancelled_reason: typeof reason === "string" && reason.trim() ? reason.trim() : null,
      },
    });
    return NextResponse.json({ success: true, enrollment: updated });
  }

  // ===== COMPLETE / NO_SHOW: 포인트 사용 확정 + 정산 row 생성 =====
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.class_enrollments.update({
      where: { id },
      data: {
        status: action === "complete" ? "COMPLETED" : "NO_SHOW",
        points_used: enrollment.points_held,
        points_held: 0,
        completed_at: action === "complete" ? new Date() : enrollment.completed_at,
      },
    });

    // 정산 row 자동 생성 (CM 지정된 경우만)
    if (enrollment.offering.cm_user_id && enrollment.points_held > 0) {
      const ratio = RATIO_BY_TYPE[offeringType];
      const base = enrollment.points_held;
      const amount = Math.floor((base * ratio) / 100);
      // upsert (혹시 중복 호출 대비)
      await tx.cm_settlements.upsert({
        where: { enrollment_id: id },
        update: {},
        create: {
          enrollment_id: id,
          cm_user_id: enrollment.offering.cm_user_id,
          type: offeringType,
          base_amount: base,
          ratio,
          amount,
          status: "PENDING",
        },
      });
    }

    return updated;
  });

  return NextResponse.json({ success: true, enrollment: result });
}
