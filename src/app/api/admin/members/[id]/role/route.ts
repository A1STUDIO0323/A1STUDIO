export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAdminOrLegacy } from "@/lib/admin-auth";
import { upsertRoleByEmail } from "@/lib/member-role-db";

const LOG_PREFIX = "[admin:members:role]";

const PatchSchema = z.object({
  role: z.enum(["MEMBER", "CM", "ADMIN"]),
});

/**
 * 관리자 — 회원 역할 변경
 *
 * PATCH /api/admin/members/[id]/role
 * Body: { role: "MEMBER" | "CM" | "ADMIN" }
 *
 * 안전 장치:
 *  - ADMIN 권한 필요
 *  - 본인 강등 방지 (lockout 방지)
 *  - 마지막 ADMIN 강등 방지
 *  - users.role 변경 + member_roles 테이블 동기화(레거시 호환)
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrLegacy(req);
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id가 필요합니다" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    logger.error(`${LOG_PREFIX} failed reason=invalid_json id=${id}`, err);
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    logger.warn(
      `${LOG_PREFIX} failed reason=validation id=${id} issues=${JSON.stringify(parsed.error.issues)}`
    );
    return NextResponse.json(
      { error: "role 값이 올바르지 않습니다" },
      { status: 400 }
    );
  }

  const { role: nextRole } = parsed.data;
  const actorId = auth.userId; // legacy 통과 시 "legacy-admin"

  logger.info(
    `${LOG_PREFIX} start actorId=${actorId} actorRole=${auth.role} targetId=${id} nextRole=${nextRole}`
  );

  // 대상 사용자 조회
  let target: { id: string; email: string | null; role: string } | null = null;
  try {
    target = await prisma.users.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });
  } catch (err) {
    logger.error(`${LOG_PREFIX} failed reason=db_lookup id=${id}`, err);
    return NextResponse.json(
      { error: "회원 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }

  if (!target) {
    logger.warn(`${LOG_PREFIX} failed reason=target_not_found id=${id}`);
    return NextResponse.json(
      { error: "해당 회원을 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  // 변경 없음 — no-op
  if (target.role === nextRole) {
    logger.info(`${LOG_PREFIX} noop id=${id} role=${nextRole}`);
    return NextResponse.json({
      ok: true,
      user: { id: target.id, email: target.email, role: nextRole },
      noop: true,
    });
  }

  // 자기 자신 강등 방지 (legacy 통과는 userId="legacy-admin"이므로 영향 없음)
  if (actorId === target.id && nextRole !== "ADMIN") {
    logger.warn(
      `${LOG_PREFIX} failed reason=self_demotion actorId=${actorId} targetId=${id} nextRole=${nextRole}`
    );
    return NextResponse.json(
      { error: "본인의 ADMIN 권한은 본인이 강등할 수 없습니다" },
      { status: 400 }
    );
  }

  // 마지막 ADMIN 강등 방지
  if (target.role === "ADMIN" && nextRole !== "ADMIN") {
    try {
      const adminCount = await prisma.users.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        logger.warn(
          `${LOG_PREFIX} failed reason=last_admin targetId=${id} adminCount=${adminCount}`
        );
        return NextResponse.json(
          {
            error:
              "마지막 ADMIN을 강등할 수 없습니다. 먼저 다른 회원을 ADMIN으로 승격하세요.",
          },
          { status: 400 }
        );
      }
    } catch (err) {
      logger.error(`${LOG_PREFIX} failed reason=admin_count_query`, err);
      return NextResponse.json(
        { error: "권한 변경 안전성 검증에 실패했습니다" },
        { status: 500 }
      );
    }
  }

  // users.role 업데이트 (메모리: 비즈로직 CRUD는 Prisma)
  try {
    await prisma.users.update({
      where: { id },
      data: { role: nextRole },
    });
  } catch (err) {
    logger.error(`${LOG_PREFIX} failed reason=role_update id=${id}`, err);
    return NextResponse.json(
      { error: "권한 변경 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }

  // member_roles 테이블 동기화 (레거시 호환 — CM/MEMBER만 저장)
  if (target.email) {
    try {
      if (nextRole === "CM") {
        await upsertRoleByEmail(target.email.toLowerCase(), "CM");
      } else {
        // MEMBER 또는 ADMIN: member_roles에서 제거 (ADMIN은 별도 추적, MEMBER는 default)
        await upsertRoleByEmail(target.email.toLowerCase(), "MEMBER");
      }
    } catch (err) {
      // 레거시 동기화 실패는 치명적이지 않음 — 경고만
      logger.warn(`${LOG_PREFIX} legacy_sync_failed id=${id} email=${target.email}`, err);
    }
  }

  logger.info(
    `${LOG_PREFIX} success actorId=${actorId} targetId=${id} email=${target.email ?? "-"} from=${target.role} to=${nextRole}`
  );

  return NextResponse.json({
    ok: true,
    user: { id: target.id, email: target.email, role: nextRole },
  });
}
