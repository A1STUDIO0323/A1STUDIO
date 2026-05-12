export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAdminOrLegacy } from "@/lib/admin-auth";

const LOG_PREFIX = "[admin:intakes:list]";

const ALLOWED_STATUS = ["NEW", "CONSULTING", "QUOTED", "CONTRACTED", "IN_PROGRESS", "DONE", "REJECTED"] as const;

export async function GET(req: NextRequest) {
  const auth = await requireAdminOrLegacy(req);
  if ("error" in auth) return auth.error;

  const status = req.nextUrl.searchParams.get("status");
  const where = status && (ALLOWED_STATUS as readonly string[]).includes(status) ? { status } : {};

  try {
    const items = await prisma.intake_submissions.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: 500,
    });
    logger.info(`${LOG_PREFIX} success count=${items.length} status=${status ?? "ALL"}`);
    return NextResponse.json({ items });
  } catch (err) {
    logger.error(`${LOG_PREFIX} db_failed`, err);
    return NextResponse.json({ error: "조회 중 오류가 발생했습니다" }, { status: 500 });
  }
}
