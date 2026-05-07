import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { deductPointsDB, refundPointsDB } from "@/lib/supabase-points";

/**
 * 클래스/레슨 신청 + 포인트 HOLD
 * POST /api/class-enrollments
 *
 * 흐름:
 *  1. 로그인 + 상품 OPEN 확인
 *  2. 정원 확인 (HELD/COMPLETED 합산)
 *  3. 동일 사용자 중복 신청 차단
 *  4. 포인트 즉시 차감 (HOLD = 차감 후 보관)
 *  5. enrollments insert (status=HELD, points_held=price)
 *  6. 실패 시 포인트 자동 환불
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const body = await req.json();
  const { offering_id, request_note } = body as {
    offering_id?: string;
    request_note?: string;
  };

  if (!offering_id || typeof offering_id !== "string") {
    return NextResponse.json({ error: "상품 ID가 필요합니다" }, { status: 400 });
  }

  // 상품 + 활성 신청 수 동시 조회
  const offering = await prisma.class_offerings.findUnique({
    where: { id: offering_id },
    include: {
      _count: {
        select: { enrollments: { where: { status: { in: ["HELD", "COMPLETED"] } } } },
      },
    },
  });

  if (!offering) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });
  }
  if (offering.status !== "OPEN") {
    return NextResponse.json(
      { error: "현재 신청을 받지 않는 상품입니다" },
      { status: 400 }
    );
  }
  if (offering._count.enrollments >= offering.capacity) {
    return NextResponse.json({ error: "정원이 마감되었습니다" }, { status: 409 });
  }

  // 중복 신청 차단 (HELD/COMPLETED인 본인 신청이 이미 있으면)
  const dup = await prisma.class_enrollments.findFirst({
    where: {
      offering_id,
      user_id: user.id,
      status: { in: ["HELD", "COMPLETED"] },
    },
    select: { id: true },
  });
  if (dup) {
    return NextResponse.json(
      { error: "이미 신청한 상품입니다" },
      { status: 409 }
    );
  }

  // 포인트 차감 (HOLD)
  const description = `[${offering.type === "oneday" ? "원데이클래스" : "개인레슨"} 신청 HOLD] ${offering.title}`;
  const deductResult = await deductPointsDB({
    userId: user.id,
    points: offering.price_points,
    description,
  });

  if (!deductResult.success) {
    const insufficient = /부족|insufficient|잔액/i.test(deductResult.error ?? "");
    return NextResponse.json(
      {
        error: insufficient ? "포인트가 부족합니다" : (deductResult.error ?? "포인트 차감 실패"),
        reason: insufficient ? "insufficient_points" : "deduct_failed",
      },
      { status: insufficient ? 400 : 500 }
    );
  }

  // enrollment 생성
  try {
    const enrollment = await prisma.class_enrollments.create({
      data: {
        offering_id,
        user_id: user.id,
        status: "HELD",
        points_held: offering.price_points,
        request_note: typeof request_note === "string" && request_note.trim() ? request_note.trim() : null,
      },
      select: { id: true, status: true, points_held: true, enrolled_at: true },
    });

    return NextResponse.json({
      success: true,
      enrollment,
      balance_after: deductResult.newBalance,
    });
  } catch (insertError) {
    // 차감은 됐는데 insert 실패 → 자동 환불
    console.error("[class-enrollments] insert 실패, 포인트 자동 환불 시도:", insertError);
    const refund = await refundPointsDB({
      userId: user.id,
      points: offering.price_points,
      description: `${description} (생성 실패 자동 환불)`,
      reservationId: null,
    });
    return NextResponse.json(
      {
        error: refund.success
          ? "신청 생성에 실패했습니다. 포인트는 환불되었습니다."
          : "신청 생성 및 포인트 환불 실패. 고객센터로 문의해주세요.",
        needsManualRefund: !refund.success,
      },
      { status: 500 }
    );
  }
}
