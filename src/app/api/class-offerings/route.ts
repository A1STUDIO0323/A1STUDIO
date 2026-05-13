import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

const LOG_PREFIX = "[api:class-offerings]";
const VALID_TYPES = ["oneday", "lesson"] as const;
const VALID_SUBJECTS = ["vocal", "dance", "act", "musical", "etc"] as const;

/**
 * 공개 상품 목록 (OPEN 상태)
 * GET /api/class-offerings?type=oneday
 */
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");

  const where: Record<string, unknown> = { status: "OPEN" };
  if (type && (VALID_TYPES as readonly string[]).includes(type)) {
    where.type = type;
  }

  const offerings = await prisma.class_offerings.findMany({
    where,
    orderBy: [{ scheduled_at: "asc" }, { created_at: "desc" }],
    include: {
      cm: {
        select: {
          id: true,
          cm_profile: {
            select: {
              display_name: true,
              profile_image: true,
              subjects: true,
              is_public: true,
              is_active: true,
            },
          },
        },
      },
      _count: { select: { enrollments: { where: { status: { in: ["HELD", "COMPLETED"] } } } } },
    },
  });

  // 잔여 정원 계산 + 비공개 CM 정보 마스킹
  const result = offerings.map((o) => ({
    id: o.id,
    type: o.type,
    title: o.title,
    description: o.description,
    subject: o.subject,
    duration_minutes: o.duration_minutes,
    capacity: o.capacity,
    price_points: o.price_points,
    scheduled_at: o.scheduled_at,
    enrolled_count: o._count.enrollments,
    remaining: Math.max(0, o.capacity - o._count.enrollments),
    cm:
      o.cm?.cm_profile && o.cm.cm_profile.is_public && o.cm.cm_profile.is_active
        ? {
            display_name: o.cm.cm_profile.display_name,
            profile_image: o.cm.cm_profile.profile_image,
            subjects: o.cm.cm_profile.subjects,
          }
        : null,
  }));

  return NextResponse.json({ offerings: result });
}

/**
 * CM/ADMIN 공고 등록
 * POST /api/class-offerings
 *
 * - Supabase 세션 + users.role 검증 (CM 또는 ADMIN만 등록 가능)
 * - CM이 등록하면 cm_user_id = 본인 id로 자동 세팅
 * - 기본 status='OPEN' 으로 즉시 노출 (모집 중)
 */
const CreateSchema = z.object({
  type: z.enum(VALID_TYPES),
  title: z.string().min(1).max(100),
  description: z.string().max(2000).optional().nullable(),
  subject: z.enum(VALID_SUBJECTS).optional().nullable(),
  duration_minutes: z.number().int().min(30).max(480).default(60),
  capacity: z.number().int().min(1).max(50).optional(),
  price_points: z.number().int().min(0),
  scheduled_at: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  logger.log(`${LOG_PREFIX} POST start`);

  // 1) 인증 — Supabase 세션 필수
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
    userEmail = user?.email ?? null;
  } catch (err) {
    logger.error(`${LOG_PREFIX} auth_failed`, err);
    return NextResponse.json({ error: "인증 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
  if (!userId) {
    logger.warn(`${LOG_PREFIX} unauthenticated`);
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 2) 권한 — users.role === 'CM' 또는 'ADMIN'
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
  if (role !== "CM" && role !== "ADMIN") {
    logger.warn(`${LOG_PREFIX} forbidden userId=${userId} email=${userEmail} role=${role ?? "none"}`);
    return NextResponse.json(
      { error: "공고 등록은 CM(클래스마스터) 또는 관리자만 가능합니다." },
      { status: 403 }
    );
  }

  // 3) 입력 검증
  let parsed;
  try {
    const body = await req.json();
    parsed = CreateSchema.safeParse(body);
  } catch (err) {
    logger.error(`${LOG_PREFIX} invalid_json`, err);
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  if (!parsed.success) {
    logger.warn(`${LOG_PREFIX} validation_failed`, parsed.error.issues);
    return NextResponse.json(
      { error: "입력값을 확인해주세요.", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // 4) CM 활성 프로필 확인 (CM이 본인 공고 등록할 때만)
  if (role === "CM") {
    const cmProfile = await prisma.cm_profiles.findUnique({
      where: { user_id: userId },
      select: { is_active: true },
    });
    if (!cmProfile) {
      logger.warn(`${LOG_PREFIX} no_cm_profile userId=${userId}`);
      return NextResponse.json(
        { error: "CM 프로필이 등록되어 있지 않습니다. 관리자에게 문의해주세요." },
        { status: 400 }
      );
    }
    if (!cmProfile.is_active) {
      logger.warn(`${LOG_PREFIX} inactive_cm userId=${userId}`);
      return NextResponse.json(
        { error: "비활성 CM 상태입니다. 관리자에게 문의해주세요." },
        { status: 403 }
      );
    }
  }

  // 5) 저장
  try {
    const created = await prisma.class_offerings.create({
      data: {
        type: data.type,
        cm_user_id: role === "CM" ? userId : null,
        created_by: userId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        subject: data.subject ?? null,
        duration_minutes: data.duration_minutes,
        capacity: data.capacity ?? (data.type === "lesson" ? 1 : 8),
        price_points: data.price_points,
        scheduled_at: data.scheduled_at ? new Date(data.scheduled_at) : null,
        status: "OPEN",
      },
    });
    logger.log(`${LOG_PREFIX} create success id=${created.id} type=${data.type} userId=${userId} role=${role}`);
    return NextResponse.json({ success: true, offering: created }, { status: 201 });
  } catch (err) {
    logger.error(`${LOG_PREFIX} create_failed userId=${userId}`, err);
    return NextResponse.json({ error: "공고 등록 중 오류가 발생했습니다." }, { status: 500 });
  }
}
