/**
 * 관리자/스태프 인증 헬퍼 (서버 전용)
 *
 * 메모리 규칙 준수:
 * - 인증=Supabase, 비즈로직 CRUD=Prisma 분리
 *   → user.id 추출은 Supabase, role 조회는 Prisma
 * - 자동 ADMIN 부여 없음 — 명시적 SQL 부트스트랩 또는 관리자 UI에서만 승격
 * - 상세 로그: [admin:auth] prefix + start/success/failed 3단계
 *
 * 사용 예:
 *   const ctx = await requireAdmin(req);
 *   if ('error' in ctx) return ctx.error;
 *   // ctx.userId, ctx.email, ctx.role 사용
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const LOG_PREFIX = "[admin:auth]";

export type Role = "MEMBER" | "CM" | "ADMIN";

export type AuthContext = {
  userId: string;
  email: string | null;
  role: Role;
};

export type AuthError = {
  error: NextResponse;
};

function unauthorized(message = "로그인이 필요합니다") {
  return NextResponse.json({ error: message }, { status: 401 });
}

function forbidden(message = "권한이 없습니다") {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * 현재 로그인 사용자 + role 반환
 * - 비로그인이면 null
 */
export async function getCurrentUserWithRole(): Promise<AuthContext | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // role은 Prisma로 조회 (메모리 규칙: 비즈로직 CRUD는 Prisma)
    const profile = await prisma.users.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, role: true },
    });

    if (!profile) {
      // Auth 사용자는 있지만 users 테이블 row 없음 — 신규 가입 직후 등
      return {
        userId: user.id,
        email: user.email ?? null,
        role: "MEMBER",
      };
    }

    const role = (profile.role === "CM" || profile.role === "ADMIN") ? profile.role : "MEMBER";
    return {
      userId: profile.id,
      email: profile.email,
      role,
    };
  } catch (err) {
    logger.error(`${LOG_PREFIX} getCurrentUserWithRole failed`, err);
    return null;
  }
}

/**
 * ADMIN만 통과
 *
 * 사용:
 *   const ctx = await requireAdmin();
 *   if ('error' in ctx) return ctx.error;
 *   // ctx.userId, ctx.email, ctx.role === "ADMIN"
 */
export async function requireAdmin(): Promise<AuthContext | AuthError> {
  return requireRole(["ADMIN"]);
}

/**
 * 지정한 role 중 하나면 통과
 *
 * 사용:
 *   const ctx = await requireRole(["ADMIN", "CM"]);
 *   if ('error' in ctx) return ctx.error;
 */
export async function requireRole(allowedRoles: Role[]): Promise<AuthContext | AuthError> {
  logger.info(`${LOG_PREFIX} start required=${allowedRoles.join(",")}`);

  const ctx = await getCurrentUserWithRole();

  if (!ctx) {
    logger.warn(`${LOG_PREFIX} failed reason=unauthorized`);
    return { error: unauthorized() };
  }

  if (!allowedRoles.includes(ctx.role)) {
    logger.warn(
      `${LOG_PREFIX} failed reason=insufficient_role userId=${ctx.userId} email=${ctx.email ?? "-"} role=${ctx.role} required=${allowedRoles.join(",")}`
    );
    return { error: forbidden() };
  }

  logger.info(
    `${LOG_PREFIX} success userId=${ctx.userId} email=${ctx.email ?? "-"} role=${ctx.role}`
  );
  return ctx;
}

/**
 * 레거시 비밀번호 헤더 인증 (마이그레이션 기간 동안만 유지)
 *
 * Phase B-3~B-6 동안 점진적으로 requireAdmin()으로 교체.
 * 모든 admin API가 새 헬퍼로 전환되면 본 함수 제거 예정.
 */
export function legacyAdminPasswordCheck(req: Request): AuthContext | AuthError {
  const pw = req.headers.get("x-admin-password");
  const expected = process.env.ADMIN_PASSWORD;

  if (!pw || !expected || pw !== expected) {
    logger.warn(`${LOG_PREFIX} legacy_password failed`);
    return { error: unauthorized("관리자 권한이 필요합니다") };
  }

  logger.info(`${LOG_PREFIX} legacy_password success`);
  // 레거시 인증은 user 정보 없음 — 의사 ADMIN 컨텍스트 반환
  return {
    userId: "legacy-admin",
    email: null,
    role: "ADMIN",
  };
}

/**
 * 통합 가드: 신규(세션+role) 우선, 실패 시 레거시(비번 헤더) 폴백
 *
 * Phase B-3~B-5에서 라우트들이 이 함수를 호출하면 점진적 마이그레이션 가능.
 * 사용자가 Supabase 로그인 + ADMIN role 승격되면 자동으로 신규 방식으로 통과.
 * 아직 마이그레이션 안 한 클라이언트는 기존 비번 헤더로 통과.
 */
export async function requireAdminOrLegacy(req: Request): Promise<AuthContext | AuthError> {
  const sessionResult = await requireRole(["ADMIN"]);
  if (!("error" in sessionResult)) {
    return sessionResult;
  }

  // 세션 인증 실패 → 레거시 비번 헤더 시도
  const legacyResult = legacyAdminPasswordCheck(req);
  if (!("error" in legacyResult)) {
    logger.info(`${LOG_PREFIX} fallback_to_legacy_password`);
    return legacyResult;
  }

  // 둘 다 실패
  return { error: unauthorized("관리자 권한이 필요합니다") };
}
