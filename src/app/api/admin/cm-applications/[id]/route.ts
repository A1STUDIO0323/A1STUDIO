import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isAdmin(req: NextRequest): boolean {
  const pw = req.headers.get("x-admin-password");
  return !!pw && pw === process.env.ADMIN_PASSWORD;
}

const VALID_NEXT_STATUS = ["APPROVED", "REJECTED", "HOLD"] as const;
type NextStatus = (typeof VALID_NEXT_STATUS)[number];

/**
 * 관리자 — CM 신청 검토 처리
 * PATCH /api/admin/cm-applications/[id]
 *
 * APPROVED 처리 시 부수효과:
 *  1. cm_applications.status = APPROVED
 *  2. cm_profiles 자동 생성 (이미 있으면 유지)
 *  3. member_roles.role = 'CM' (email 기준)
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
  const { status, admin_memo } = body as { status?: string; admin_memo?: string };

  if (!status || !(VALID_NEXT_STATUS as readonly string[]).includes(status)) {
    return NextResponse.json(
      { error: "status는 APPROVED / REJECTED / HOLD 중 하나여야 합니다" },
      { status: 400 }
    );
  }

  const application = await prisma.cm_applications.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  if (!application) {
    return NextResponse.json({ error: "신청을 찾을 수 없습니다" }, { status: 404 });
  }

  const nextStatus = status as NextStatus;
  const memo = typeof admin_memo === "string" ? admin_memo.trim() || null : null;

  if (nextStatus !== "APPROVED") {
    // REJECTED / HOLD: 단순 상태 업데이트
    const updated = await prisma.cm_applications.update({
      where: { id },
      data: {
        status: nextStatus,
        admin_memo: memo,
        reviewed_at: new Date(),
      },
      select: { id: true, status: true, admin_memo: true, reviewed_at: true },
    });
    return NextResponse.json({ success: true, application: updated });
  }

  // APPROVED 처리: 트랜잭션
  if (!application.user.email) {
    return NextResponse.json(
      { error: "신청자 이메일이 없어 CM 권한 부여가 불가합니다" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedApp = await tx.cm_applications.update({
      where: { id },
      data: {
        status: "APPROVED",
        admin_memo: memo,
        reviewed_at: new Date(),
      },
    });

    // cm_profiles upsert (이미 있으면 유지, 없으면 신청 내용으로 초기 생성)
    await tx.cm_profiles.upsert({
      where: { user_id: application.user_id },
      update: {},
      create: {
        user_id: application.user_id,
        display_name: application.user.name?.trim() || application.name,
        bio: application.intro,
        career: application.career,
        subjects: application.subjects,
        profile_image: application.profile_image,
        portfolio_url: application.portfolio_url,
        is_public: false, // 본인이 마이페이지에서 공개 처리할 때까지 비공개
        is_active: true,
      },
    });

    // member_roles.role = 'CM' upsert (email 기준)
    await tx.memberRole.upsert({
      where: { email: application.user.email! },
      update: { role: "CM" },
      create: { email: application.user.email!, role: "CM" },
    });

    return updatedApp;
  });

  return NextResponse.json({
    success: true,
    application: {
      id: result.id,
      status: result.status,
      admin_memo: result.admin_memo,
      reviewed_at: result.reviewed_at,
    },
  });
}
