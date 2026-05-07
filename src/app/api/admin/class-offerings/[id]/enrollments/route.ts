import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isAdmin(req: NextRequest): boolean {
  const pw = req.headers.get("x-admin-password");
  return !!pw && pw === process.env.ADMIN_PASSWORD;
}

/**
 * 관리자 — 특정 상품의 신청자 목록
 * GET /api/admin/class-offerings/[id]/enrollments
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 401 });
  }

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
