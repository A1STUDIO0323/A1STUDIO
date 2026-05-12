export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAdminOrLegacy } from "@/lib/admin-auth";

const LOG_PREFIX = "[admin:intakes:update]";

const UpdateSchema = z.object({
  status: z.enum(["NEW", "CONSULTING", "QUOTED", "CONTRACTED", "IN_PROGRESS", "DONE", "REJECTED"]).optional(),
  admin_memo: z.string().max(5000).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrLegacy(req);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id가 필요합니다" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    logger.error(`${LOG_PREFIX} invalid_json id=${id}`, err);
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    logger.error(`${LOG_PREFIX} validation_failed id=${id} issues=${JSON.stringify(parsed.error.issues)}`);
    return NextResponse.json({ error: "입력값을 확인해주세요" }, { status: 400 });
  }

  const data = parsed.data;
  if (!data.status && data.admin_memo === undefined) {
    return NextResponse.json({ error: "변경할 항목이 없습니다" }, { status: 400 });
  }

  logger.info(`${LOG_PREFIX} start id=${id} status=${data.status ?? "-"} memo_changed=${data.admin_memo !== undefined}`);

  try {
    const updated = await prisma.intake_submissions.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.admin_memo !== undefined ? { admin_memo: data.admin_memo } : {}),
      },
      select: { id: true, status: true, admin_memo: true, updated_at: true },
    });
    logger.info(`${LOG_PREFIX} success id=${id} status=${updated.status}`);
    return NextResponse.json({ ok: true, item: updated });
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "P2025") {
      logger.warn(`${LOG_PREFIX} not_found id=${id}`);
      return NextResponse.json({ error: "해당 의뢰서를 찾을 수 없습니다" }, { status: 404 });
    }
    logger.error(`${LOG_PREFIX} db_failed id=${id}`, err);
    return NextResponse.json({ error: "수정 중 오류가 발생했습니다" }, { status: 500 });
  }
}
