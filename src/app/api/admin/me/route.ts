export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCurrentUserWithRole } from "@/lib/admin-auth";
import { logger } from "@/lib/logger";

const LOG_PREFIX = "[admin:me]";

/**
 * 현재 로그인 사용자의 역할 조회
 *
 * GET /api/admin/me
 * 응답:
 *   - 200: { user: { id, email, role }, isAdmin: boolean }
 *   - 401: { error: "로그인이 필요합니다" }
 *
 * 클라이언트의 AdminProvider가 이 API로 현재 ADMIN 여부 판단.
 * 세션 기반이므로 헤더에 비밀번호 필요 없음.
 */
export async function GET() {
  const ctx = await getCurrentUserWithRole();

  if (!ctx) {
    logger.info(`${LOG_PREFIX} unauthorized`);
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  logger.info(`${LOG_PREFIX} success userId=${ctx.userId} role=${ctx.role}`);
  return NextResponse.json({
    user: {
      id: ctx.userId,
      email: ctx.email,
      role: ctx.role,
    },
    isAdmin: ctx.role === "ADMIN",
  });
}
