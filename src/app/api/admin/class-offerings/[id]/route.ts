import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminOrLegacy } from "@/lib/admin-auth";

const VALID_SUBJECTS = ["vocal", "dance", "act", "musical", "etc"] as const;
const VALID_STATUSES = ["DRAFT", "OPEN", "CLOSED", "CANCELLED", "COMPLETED"] as const;

/**
 * 관리자 — 상품 수정 (제목·가격·상태 등)
 * PATCH /api/admin/class-offerings/[id]
 *
 * 주의: 신청 1건 이상 받은 상품의 가격·일정 변경은 신중히. 본 API는 변경을 허용하지만
 * 운영상 신청 후에는 status 변경(CLOSED/CANCELLED) 위주로 사용 권장.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrLegacy(req);
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const body = await req.json();
  const {
    cm_user_id,
    title,
    description,
    subject,
    duration_minutes,
    capacity,
    price_points,
    scheduled_at,
    status,
  } = body as Record<string, unknown>;

  const existing = await prisma.class_offerings.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "상품을 찾을 수 없습니다" }, { status: 404 });
  }

  // 검증
  if (subject != null && !(VALID_SUBJECTS as readonly string[]).includes(subject as string)) {
    return NextResponse.json({ error: "subject 값이 올바르지 않습니다" }, { status: 400 });
  }
  if (status != null && !(VALID_STATUSES as readonly string[]).includes(status as string)) {
    return NextResponse.json({ error: "status 값이 올바르지 않습니다" }, { status: 400 });
  }
  if (price_points != null && (typeof price_points !== "number" || price_points < 0)) {
    return NextResponse.json({ error: "가격은 0 이상의 숫자여야 합니다" }, { status: 400 });
  }
  if (cm_user_id != null && cm_user_id !== "") {
    const cmProfile = await prisma.cm_profiles.findUnique({
      where: { user_id: cm_user_id as string },
      select: { is_active: true },
    });
    if (!cmProfile) {
      return NextResponse.json({ error: "지정한 CM은 승인된 프로필이 없습니다" }, { status: 400 });
    }
    if (!cmProfile.is_active) {
      return NextResponse.json({ error: "지정한 CM은 비활성 상태입니다" }, { status: 400 });
    }
  }

  // partial update
  const data: Record<string, unknown> = {};
  if (cm_user_id !== undefined) data.cm_user_id = cm_user_id === "" ? null : cm_user_id;
  if (title !== undefined && typeof title === "string") data.title = title.trim();
  if (description !== undefined) data.description = typeof description === "string" && description.trim() ? description.trim() : null;
  if (subject !== undefined) data.subject = typeof subject === "string" && subject ? subject : null;
  if (duration_minutes !== undefined && typeof duration_minutes === "number") data.duration_minutes = duration_minutes;
  if (capacity !== undefined && typeof capacity === "number" && capacity > 0) data.capacity = capacity;
  if (price_points !== undefined) data.price_points = Math.round(price_points as number);
  if (scheduled_at !== undefined) data.scheduled_at = scheduled_at ? new Date(scheduled_at as string) : null;
  if (status !== undefined) data.status = status;

  const updated = await prisma.class_offerings.update({ where: { id }, data });
  return NextResponse.json({ success: true, offering: updated });
}

/**
 * 관리자 — 상품 삭제 (신청 0건일 때만 허용)
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrLegacy(req);
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const enrollmentCount = await prisma.class_enrollments.count({ where: { offering_id: id } });
  if (enrollmentCount > 0) {
    return NextResponse.json(
      { error: "신청이 1건 이상 있는 상품은 삭제할 수 없습니다. CANCELLED 상태로 변경해주세요." },
      { status: 409 }
    );
  }

  await prisma.class_offerings.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
