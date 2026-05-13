import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const LOG_PREFIX = "[api:class-offerings:id]";

/**
 * 본인 공고 삭제 (CM은 자신의 공고만, ADMIN은 모든 공고)
 * DELETE /api/class-offerings/[id]
 *
 * - 수강 신청(class_enrollments)이 1건이라도 있으면 삭제 불가 (CANCELLED 상태로 전환만 가능)
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  logger.log(`${LOG_PREFIX} DELETE start id=${id}`);

  // 1) 인증
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch (err) {
    logger.error(`${LOG_PREFIX} auth_failed`, err);
    return NextResponse.json({ error: "인증 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 2) 권한
  let role: string | null = null;
  try {
    const u = await prisma.users.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    role = u?.role ?? null;
  } catch (err) {
    logger.error(`${LOG_PREFIX} role_lookup_failed userId=${userId}`, err);
    return NextResponse.json({ error: "권한 확인에 실패했습니다." }, { status: 500 });
  }

  // 3) 대상 조회
  const offering = await prisma.class_offerings.findUnique({
    where: { id },
    select: {
      id: true,
      cm_user_id: true,
      created_by: true,
      _count: { select: { enrollments: true } },
    },
  });
  if (!offering) {
    return NextResponse.json({ error: "공고를 찾을 수 없습니다." }, { status: 404 });
  }

  const isOwner = offering.cm_user_id === userId || offering.created_by === userId;
  const isAdmin = role === "ADMIN";
  if (!isOwner && !isAdmin) {
    logger.warn(`${LOG_PREFIX} forbidden id=${id} userId=${userId} role=${role}`);
    return NextResponse.json({ error: "본인 공고만 삭제할 수 있습니다." }, { status: 403 });
  }

  // 4) 신청 이력 보호
  if (offering._count.enrollments > 0 && !isAdmin) {
    logger.warn(`${LOG_PREFIX} has_enrollments id=${id} count=${offering._count.enrollments}`);
    return NextResponse.json(
      { error: "이미 신청자가 있는 공고는 삭제할 수 없습니다. 관리자에게 취소를 요청해주세요." },
      { status: 409 }
    );
  }

  try {
    await prisma.class_offerings.delete({ where: { id } });
    logger.log(`${LOG_PREFIX} delete success id=${id} userId=${userId} role=${role}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error(`${LOG_PREFIX} delete_failed id=${id}`, err);
    return NextResponse.json({ error: "삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
