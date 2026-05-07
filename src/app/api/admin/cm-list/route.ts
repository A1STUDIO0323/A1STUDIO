import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isAdmin(req: NextRequest): boolean {
  const pw = req.headers.get("x-admin-password");
  return !!pw && pw === process.env.ADMIN_PASSWORD;
}

/**
 * 관리자 — 활성 CM 목록 (상품 등록 시 매핑용)
 * GET /api/admin/cm-list
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 401 });
  }

  const cms = await prisma.cm_profiles.findMany({
    where: { is_active: true },
    orderBy: { created_at: "asc" },
    select: {
      user_id: true,
      display_name: true,
      subjects: true,
      is_public: true,
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ cms });
}
