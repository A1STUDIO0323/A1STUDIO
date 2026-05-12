import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminOrLegacy } from "@/lib/admin-auth";

/**
 * 관리자 — CM 정산 상태 변경
 * PATCH /api/admin/cm-settlements/[id]
 *
 * action:
 *  - 'approve' : PENDING → APPROVED (이체 대기)
 *  - 'pay'     : APPROVED → PAID    (수동 또는 자동이체 완료)
 *  - 'fail'    : APPROVED → FAILED  (이체 실패)
 *  - 'reset'   : FAILED   → APPROVED (재시도)
 *
 * 자동이체 확장:
 *  추후 외부 지급대행 API 연동 시 'pay' 액션 내부에서
 *  paid_method='auto_api' 로 마킹하고 응답 필드를 paid_memo에 저장.
 *  본 라우트의 호환성을 유지하면서 별도 라우트(/api/admin/cm-settlements/[id]/auto-pay)를
 *  추가하는 방향을 권장.
 */

type Action = "approve" | "pay" | "fail" | "reset";
const VALID_ACTIONS: Action[] = ["approve", "pay", "fail", "reset"];

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrLegacy(req);
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const body = await req.json();
  const action = body?.action as Action | undefined;
  const memo = typeof body?.memo === "string" ? body.memo.trim() : "";
  const failedReason = typeof body?.failed_reason === "string" ? body.failed_reason.trim() : "";
  // paid_method 옵션: 'manual_transfer' (기본) | 'auto_api' (추후)
  const paidMethodInput = typeof body?.paid_method === "string" ? body.paid_method : null;

  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "action이 유효하지 않습니다" }, { status: 400 });
  }

  const current = await prisma.cm_settlements.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "정산을 찾을 수 없습니다" }, { status: 404 });
  }

  // 상태 전이 검증
  const stateGuards: Record<Action, string[]> = {
    approve: ["PENDING"],
    pay:     ["APPROVED"],
    fail:    ["APPROVED"],
    reset:   ["FAILED"],
  };
  if (!stateGuards[action].includes(current.status)) {
    return NextResponse.json(
      { error: `현재 상태(${current.status})에서는 ${action} 처리를 할 수 없습니다` },
      { status: 400 }
    );
  }

  let nextData: Record<string, unknown> = {};

  if (action === "approve") {
    nextData = {
      status: "APPROVED",
      approved_at: new Date(),
      // approved_by: 관리자 user_id를 알 수 없는 password 인증이라 null
      approved_by: null,
    };
  } else if (action === "pay") {
    nextData = {
      status: "PAID",
      paid_at: new Date(),
      paid_by: null,
      paid_method: paidMethodInput === "auto_api" ? "auto_api" : "manual_transfer",
      paid_memo: memo || null,
      failed_reason: null,
    };
  } else if (action === "fail") {
    nextData = {
      status: "FAILED",
      failed_reason: failedReason || "이체 실패",
    };
  } else if (action === "reset") {
    nextData = {
      status: "APPROVED",
      failed_reason: null,
    };
  }

  const updated = await prisma.cm_settlements.update({
    where: { id },
    data: nextData,
  });

  return NextResponse.json({ success: true, settlement: updated });
}
