import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminOrLegacy } from "@/lib/admin-auth";

const VALID_TYPES = ["oneday", "lesson"] as const;
const VALID_SUBJECTS = ["vocal", "dance", "act", "musical", "etc"] as const;
const VALID_STATUSES = ["DRAFT", "OPEN", "CLOSED", "CANCELLED", "COMPLETED"] as const;

/**
 * 관리자 — 클래스/레슨 상품 목록
 * GET /api/admin/class-offerings?type=oneday&status=OPEN
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminOrLegacy(req);
  if ("error" in auth) return auth.error;

  const url = req.nextUrl.searchParams;
  const type = url.get("type");
  const status = url.get("status");

  const where: Record<string, unknown> = {};
  if (type && (VALID_TYPES as readonly string[]).includes(type)) where.type = type;
  if (status && (VALID_STATUSES as readonly string[]).includes(status)) where.status = status;

  const offerings = await prisma.class_offerings.findMany({
    where,
    orderBy: [{ scheduled_at: "desc" }, { created_at: "desc" }],
    include: {
      cm: { select: { id: true, name: true, email: true } },
      _count: { select: { enrollments: true } },
    },
  });

  return NextResponse.json({ offerings });
}

/**
 * 관리자 — 클래스/레슨 상품 생성
 * POST /api/admin/class-offerings
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminOrLegacy(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const {
    type,
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

  if (!type || !(VALID_TYPES as readonly string[]).includes(type as string)) {
    return NextResponse.json({ error: "type은 oneday 또는 lesson 이어야 합니다" }, { status: 400 });
  }
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "제목을 입력해주세요" }, { status: 400 });
  }
  if (typeof price_points !== "number" || price_points < 0 || !Number.isFinite(price_points)) {
    return NextResponse.json({ error: "가격(포인트)은 0 이상의 숫자여야 합니다" }, { status: 400 });
  }
  if (subject != null && !(VALID_SUBJECTS as readonly string[]).includes(subject as string)) {
    return NextResponse.json({ error: "subject 값이 올바르지 않습니다" }, { status: 400 });
  }
  if (status && !(VALID_STATUSES as readonly string[]).includes(status as string)) {
    return NextResponse.json({ error: "status 값이 올바르지 않습니다" }, { status: 400 });
  }

  // CM 검증 — cm_user_id 지정 시 cm_profiles에 활성 row 존재해야 함
  if (cm_user_id) {
    const cmProfile = await prisma.cm_profiles.findUnique({
      where: { user_id: cm_user_id as string },
      select: { user_id: true, is_active: true },
    });
    if (!cmProfile) {
      return NextResponse.json(
        { error: "지정한 CM은 승인된 CM 프로필이 없습니다" },
        { status: 400 }
      );
    }
    if (!cmProfile.is_active) {
      return NextResponse.json(
        { error: "지정한 CM은 비활성 상태입니다" },
        { status: 400 }
      );
    }
  }

  const created = await prisma.class_offerings.create({
    data: {
      type: type as string,
      cm_user_id: (cm_user_id as string) ?? null,
      title: title.trim(),
      description: typeof description === "string" && description.trim() ? description.trim() : null,
      subject: typeof subject === "string" ? subject : null,
      duration_minutes: typeof duration_minutes === "number" ? duration_minutes : 60,
      capacity: typeof capacity === "number" && capacity > 0 ? capacity : (type === "lesson" ? 1 : 8),
      price_points: Math.round(price_points),
      scheduled_at: scheduled_at ? new Date(scheduled_at as string) : null,
      status: (status as string) ?? "DRAFT",
    },
  });

  return NextResponse.json({ success: true, offering: created });
}
