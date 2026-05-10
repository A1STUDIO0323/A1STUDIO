import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

const LOG_PREFIX = "[admin:auth:legacy]";

/**
 * 레거시 관리자 비밀번호 인증 + 세션·role 이중 검증 (Phase B-3)
 *
 * 통과 조건 (모두 충족):
 *  1) Supabase 세션 로그인 상태
 *  2) users.role === 'ADMIN'
 *  3) 비밀번호 일치
 *
 * Phase B-5에서 본 라우트 자체를 deprecate 예정. 그 전까지는 이중 검증으로 안전.
 */
export async function POST(req: NextRequest) {
  // 1) Supabase 세션 확인 (인증=Supabase, 메모리 규칙)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn(`${LOG_PREFIX} failed reason=not_logged_in`);
    return NextResponse.json(
      { ok: false, error: "로그인 후 시도해주세요" },
      { status: 401 }
    );
  }

  // 2) role 확인 (비즈로직=Prisma, 메모리 규칙)
  let role = "MEMBER";
  try {
    const profile = await prisma.users.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    role = profile?.role ?? "MEMBER";
  } catch (err) {
    console.error(`${LOG_PREFIX} failed reason=role_query_failed userId=${user.id}`, err);
    return NextResponse.json(
      { ok: false, error: "권한 확인 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }

  if (role !== "ADMIN") {
    console.warn(
      `${LOG_PREFIX} failed reason=insufficient_role userId=${user.id} email=${user.email ?? "-"} role=${role}`
    );
    return NextResponse.json(
      { ok: false, error: "관리자 권한이 없습니다" },
      { status: 403 }
    );
  }

  // 3) 비밀번호 검증 (위 두 단계 통과 후에만 도달)
  let password = "";
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
  } catch (err) {
    console.warn(`${LOG_PREFIX} failed reason=invalid_json userId=${user.id}`, err);
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다" }, { status: 400 });
  }

  if (!password) {
    console.warn(`${LOG_PREFIX} failed reason=empty_password userId=${user.id}`);
    return NextResponse.json({ ok: false, error: "비밀번호가 필요합니다" }, { status: 400 });
  }

  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const plain = process.env.ADMIN_PASSWORD;

  if (!hash && !plain) {
    console.error(`${LOG_PREFIX} failed reason=no_admin_password_configured userId=${user.id}`);
    return NextResponse.json(
      { ok: false, error: "관리자 비밀번호가 설정되지 않았습니다" },
      { status: 500 }
    );
  }

  if (hash) {
    const ok = await bcrypt.compare(password, hash);
    if (ok) {
      console.log(`${LOG_PREFIX} success method=bcrypt userId=${user.id} email=${user.email ?? "-"}`);
      return NextResponse.json({ ok: true });
    }
    console.warn(`${LOG_PREFIX} failed reason=wrong_password method=bcrypt userId=${user.id}`);
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  console.warn(`${LOG_PREFIX} using plaintext fallback — set ADMIN_PASSWORD_HASH`);
  if (password === plain) {
    console.log(`${LOG_PREFIX} success method=plain userId=${user.id} email=${user.email ?? "-"}`);
    return NextResponse.json({ ok: true });
  }

  console.warn(`${LOG_PREFIX} failed reason=wrong_password method=plain userId=${user.id}`);
  return NextResponse.json({ ok: false }, { status: 401 });
}
