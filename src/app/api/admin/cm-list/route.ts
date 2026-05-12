import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminOrLegacy } from "@/lib/admin-auth";

/**
 * 관리자 — 활성 CM 목록 (상품 등록 시 매핑용)
 * GET /api/admin/cm-list
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminOrLegacy(req);
  if ("error" in auth) return auth.error;

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
