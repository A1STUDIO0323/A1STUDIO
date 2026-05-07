export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const LOG_PREFIX = "[admin:intakes:list]";

function isAdmin(req: NextRequest): boolean {
  const pw = req.headers.get("x-admin-password");
  return !!pw && pw === process.env.ADMIN_PASSWORD;
}

const ALLOWED_STATUS = ["NEW", "CONSULTING", "QUOTED", "CONTRACTED", "IN_PROGRESS", "DONE", "REJECTED"] as const;

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    logger.warn(`${LOG_PREFIX} unauthorized ip=${req.headers.get("x-forwarded-for") ?? "-"}`);
    return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 401 });
  }

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
