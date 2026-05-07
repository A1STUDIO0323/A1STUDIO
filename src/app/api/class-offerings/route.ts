import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const VALID_TYPES = ["oneday", "lesson"] as const;

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
