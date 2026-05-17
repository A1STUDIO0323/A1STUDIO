export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAdminOrLegacy } from "@/lib/admin-auth";
import { cancelScheduledMessage } from "@/lib/sms";

const LOG_PREFIX = "[admin:long-term-bookings:id]";

const ALLOWED_STATUS = ["DRAFT", "PENDING_PAYMENT", "SCHEDULED", "COMPLETED", "CANCELLED"] as const;

const PatchSchema = z.object({
  status: z.enum(ALLOWED_STATUS).optional(),
  adminMemo: z.string().max(2000).nullable().optional(),
  paymentConfirmed: z.boolean().optional(),
});

type UsageScheduleEntry = {
  day: number;
  scheduledAt: string;
  groupId?: string;
  success: boolean;
  error?: string;
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrLegacy(req);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id가 필요합니다" }, { status: 400 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch (err) {
    logger.error(`${LOG_PREFIX} patch invalid_json id=${id}`, err);
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해주세요" }, { status: 400 });
  }

  const data = parsed.data;
  logger.info(`${LOG_PREFIX} patch start id=${id} status=${data.status ?? "-"} paymentConfirmed=${data.paymentConfirmed ?? "-"}`);

  try {
    const updated = await prisma.long_term_bookings.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.adminMemo !== undefined ? { admin_memo: data.adminMemo } : {}),
        ...(data.paymentConfirmed === true ? { payment_confirmed_at: new Date() } : {}),
        ...(data.paymentConfirmed === false ? { payment_confirmed_at: null } : {}),
      },
    });
    logger.info(`${LOG_PREFIX} patch success id=${id} status=${updated.status}`);
    return NextResponse.json({ ok: true, item: updated });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "P2025") {
      return NextResponse.json({ error: "해당 항목을 찾을 수 없습니다" }, { status: 404 });
    }
    logger.error(`${LOG_PREFIX} patch db_failed id=${id}`, err);
    return NextResponse.json({ error: "수정 중 오류가 발생했습니다" }, { status: 500 });
  }
}

/**
 * DELETE — 예약 취소 + 솔라피 예약 발송 일괄 취소 시도
 * 실제 DB row는 status=CANCELLED로 soft cancel.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrLegacy(req);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id가 필요합니다" }, { status: 400 });

  logger.info(`${LOG_PREFIX} cancel start id=${id}`);

  const booking = await prisma.long_term_bookings.findUnique({ where: { id } });
  if (!booking) {
    return NextResponse.json({ error: "해당 항목을 찾을 수 없습니다" }, { status: 404 });
  }

  // hard=true → 이미 취소된 항목을 DB에서 완전 삭제
  const url = new URL(req.url);
  if (url.searchParams.get("hard") === "true") {
    if (booking.status !== "CANCELLED") {
      logger.warn(`${LOG_PREFIX} hard_delete blocked id=${id} status=${booking.status}`);
      return NextResponse.json({ error: "취소된 항목만 완전 삭제할 수 있습니다" }, { status: 400 });
    }
    try {
      await prisma.long_term_bookings.delete({ where: { id } });
      logger.info(`${LOG_PREFIX} hard_delete success id=${id}`);
      return NextResponse.json({ ok: true, hardDeleted: true });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "P2025") {
        return NextResponse.json({ error: "해당 항목을 찾을 수 없습니다" }, { status: 404 });
      }
      logger.error(`${LOG_PREFIX} hard_delete db_failed id=${id}`, err);
      return NextResponse.json({ error: "삭제 중 오류가 발생했습니다" }, { status: 500 });
    }
  }

  const schedule = (booking.usage_notice_schedule as unknown as UsageScheduleEntry[] | null) ?? [];
  const cancelResults: Array<{ day: number; groupId?: string; success: boolean; error?: string }> = [];

  for (const entry of schedule) {
    if (!entry.success || !entry.groupId) {
      continue;
    }
    const r = await cancelScheduledMessage(entry.groupId);
    cancelResults.push({ day: entry.day, groupId: entry.groupId, success: r.success, error: r.error });
    if (!r.success) {
      logger.warn(`${LOG_PREFIX} cancel solapi_failed id=${id} day=${entry.day} groupId=${entry.groupId} error=${r.error}`);
    } else {
      logger.info(`${LOG_PREFIX} cancel solapi_success id=${id} day=${entry.day} groupId=${entry.groupId}`);
    }
  }

  const updated = await prisma.long_term_bookings.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  logger.info(`${LOG_PREFIX} cancel done id=${id} cancelled=${cancelResults.filter((c) => c.success).length}/${cancelResults.length}`);
  return NextResponse.json({ ok: true, item: updated, cancelResults });
}
