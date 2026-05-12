import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminOrLegacy } from "@/lib/admin-auth";

/**
 * 관리자 — CM 신청 목록 조회
 * GET /api/admin/cm-applications?status=PENDING
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminOrLegacy(req);
  if ("error" in auth) return auth.error;

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
