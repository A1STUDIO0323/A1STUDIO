import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function isAdmin(req: NextRequest): boolean {
  const pw = req.headers.get("x-admin-password");
  return !!pw && pw === process.env.ADMIN_PASSWORD;
}

const VALID_STATUSES = ["PENDING", "APPROVED", "PAID", "FAILED"] as const;

/**
 * 관리자 — CM 정산 목록
 * GET /api/admin/cm-settlements?status=PENDING&cm_user_id=...&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * 응답: settlements + totals(상태별 합계)
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 401 });
  }

  const url = req.nextUrl.searchParams;
  const status = url.get("status");
  const cmUserId = url.get("cm_user_id");
  const from = url.get("from");
  const to = url.get("to");

  const where: Record<string, unknown> = {};
  if (status && (VALID_STATUSES as readonly string[]).includes(status)) where.status = status;
  if (cmUserId) where.cm_user_id = cmUserId;
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      range.lte = end;
    }
    where.created_at = range;
  }

  const settlements = await prisma.cm_settlements.findMany({
    where,
    orderBy: { created_at: "desc" },
    include: {
      cm: {
        select: {
          id: true,
          name: true,
          email: true,
          cm_profile: {
            select: { display_name: true, bank_name: true, account_number: true, account_holder: true },
          },
        },
      },
      enrollment: {
        select: {
          id: true,
          status: true,
          completed_at: true,
          offering: { select: { id: true, type: true, title: true, scheduled_at: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  // 상태별 합계 (현재 필터 적용된 결과 기준)
  const totals = settlements.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + s.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  return NextResponse.json({ settlements, totals });
}
