import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { refundPointsDB } from "@/lib/supabase-points";

/**
 * 본인 신청 취소
 * POST /api/class-enrollments/[id]/cancel
 *
 * - HELD 상태일 때만 취소 가능 (수업 시작 전)
 * - 포인트 자동 환불
 * - 정책: 환불 정책은 추후 (수업 24시간 전 100% 등) 적용 가능
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

  const enrollment = await prisma.class_enrollments.findUnique({
    where: { id },
    select: {
      id: true,
      user_id: true,
      status: true,
      points_held: true,
      offering: { select: { type: true, title: true } },
    },
  });

  if (!enrollment) {
    return NextResponse.json({ error: "신청을 찾을 수 없습니다" }, { status: 404 });
  }
  if (enrollment.user_id !== user.id) {
    return NextResponse.json({ error: "본인 신청만 취소할 수 있습니다" }, { status: 403 });
  }
  if (enrollment.status !== "HELD") {
    return NextResponse.json(
      { error: `현재 상태(${enrollment.status})에서는 취소할 수 없습니다. 관리자에게 문의해주세요.` },
      { status: 400 }
    );
  }

  // 환불 처리
  const heldAmount = enrollment.points_held;
  if (heldAmount > 0) {
    const refund = await refundPointsDB({
      userId: user.id,
      points: heldAmount,
      description: `[${enrollment.offering.type === "oneday" ? "원데이클래스" : "개인레슨"} 본인 취소 환불] ${enrollment.offering.title}`,
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
      cancelled_reason: reason || "본인 취소",
    },
    select: { id: true, status: true, points_refunded: true, cancelled_at: true },
  });

  return NextResponse.json({ success: true, enrollment: updated });
}
