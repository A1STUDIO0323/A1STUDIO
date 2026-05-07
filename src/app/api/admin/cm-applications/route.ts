import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isAdmin(req: NextRequest): boolean {
  const pw = req.headers.get("x-admin-password");
  return !!pw && pw === process.env.ADMIN_PASSWORD;
}

/**
 * 관리자 — CM 신청 목록 조회
 * GET /api/admin/cm-applications?status=PENDING
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 401 });
  }

  const status = req.nextUrl.searchParams.get("status");
  const validStatuses = ["PENDING", "APPROVED", "REJECTED", "HOLD"];

  const where = status && validStatuses.includes(status)
    ? { status }
    : {};

  const applications = await prisma.cm_applications.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  return NextResponse.json({ applications });
}
