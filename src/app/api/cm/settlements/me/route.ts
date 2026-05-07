import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

/**
 * CM 본인 정산 내역
 * GET /api/cm/settlements/me
 *
 * 비공개 정보(은행/계좌)는 응답에 포함하지 않음 (이미 본인 정보지만 공개 카드 정책과 분리).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const settlements = await prisma.cm_settlements.findMany({
    where: { cm_user_id: user.id },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      type: true,
      base_amount: true,
      ratio: true,
      amount: true,
      status: true,
      approved_at: true,
      paid_at: true,
      paid_method: true,
      created_at: true,
      enrollment: {
        select: {
          completed_at: true,
          offering: { select: { title: true, scheduled_at: true } },
        },
      },
    },
  });

  // 상태별 합계
  const totals = settlements.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + s.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  return NextResponse.json({ settlements, totals });
}
