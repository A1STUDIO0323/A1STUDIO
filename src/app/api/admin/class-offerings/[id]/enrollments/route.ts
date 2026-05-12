import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminOrLegacy } from "@/lib/admin-auth";

/**
 * 관리자 — 특정 상품의 신청자 목록
 * GET /api/admin/class-offerings/[id]/enrollments
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrLegacy(req);
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;

  const enrollments = await prisma.class_enrollments.findMany({
    where: { offering_id: id },
    orderBy: { enrolled_at: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  return NextResponse.json({ enrollments });
}
