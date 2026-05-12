export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/db";

/**
 * A1 STUDIO 라우트 가드 미들웨어 (Phase B-5b 옵션 B 강화)
 *
 * 적용 규칙:
 * 1. 비로그인 사용자
 *    - PUBLIC_PATHS → 통과
 *    - 그 외 → /login?next=...
 *
 * 2. 로그인 사용자 — 온보딩 완전 강제
 *    a. /api, /_next, /auth/callback, 정적파일 → 항상 통과
 *    b. /onboarding/* → 통과 (인증 진행 페이지 자체는 접근 허용)
 *    c. 프로필 미완성 (이름/출생연도) → /onboarding/profile (모든 경로에서)
 *    d. 전화번호 미인증 → /onboarding/phone (모든 경로에서)
 *    e. AUTH_ONLY (/login, /signup) → /
 *    f. /admin → users.role === 'ADMIN' 만 통과, 아니면 /
 *    g. 그 외 → 통과
 *
 * 카카오 사용자 예외: /auth/callback에서 자동 완성되므로 (c, d) 스킵.
 */

const ADMIN_PATHS = ["/admin"];
const ONBOARDING_PATHS = ["/onboarding/profile", "/onboarding/phone"];
const AUTH_ONLY_PATHS = ["/login", "/signup"];

// 비로그인 사용자에게 허용되는 공개 경로
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/spaces",
  "/equipment",
  "/pricing",
  "/guide",
  "/events",
  "/contact",
  "/location",
  "/availability",
  "/privacy",
  "/auth",
  "/api",
];

const LOG_PREFIX = "[middleware]";
const ADMIN_LOG_PREFIX = "[middleware:admin]";
const ONB_LOG_PREFIX = "[middleware:onboarding]";

function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. 정적/시스템 경로 통과 ───────────────────────────────
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/static") ||
    /\.(jpg|jpeg|png|gif|svg|ico|webp|css|js|woff|woff2)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const isOnboardingPath = matchesPath(pathname, ONBOARDING_PATHS);
  const isPublicPath = matchesPath(pathname, PUBLIC_PATHS);
  const isAdminPath = matchesPath(pathname, ADMIN_PATHS);
  const isAuthOnlyPath = AUTH_ONLY_PATHS.includes(pathname);

  // Supabase 클라이언트 (미들웨어용 — 세션 쿠키 갱신 포함)
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── 2. 비로그인 사용자 ─────────────────────────────────────
  if (!user) {
    // 온보딩 경로는 로그인 필요 → /login
    if (isOnboardingPath) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // 공개 경로 통과
    if (isPublicPath) return response;
    // 비공개 경로 → 로그인
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 3. 로그인 사용자 ───────────────────────────────────────

  // 3-1. 온보딩 경로 자체는 통과 (정보 입력 단계)
  if (isOnboardingPath) {
    return response;
  }

  // 3-2. 프로필 완성 여부 강제 검증 — 모든 경로에 적용 (옵션 B)
  let profile: {
    name?: string | null;
    birthYear?: number | null;
    phoneVerified?: boolean;
    provider?: string | null;
  } | null = null;

  try {
    const profileRes = await fetch(
      new URL("/api/members/profile", request.url).toString(),
      {
        headers: {
          cookie: request.headers.get("cookie") ?? "",
        },
      }
    );

    if (profileRes.ok) {
      const data = await profileRes.json();
      profile = data?.profile ?? null;
    } else {
      console.warn(
        `${LOG_PREFIX} profile fetch failed status=${profileRes.status} userId=${user.id}`
      );
    }
  } catch (err) {
    console.error(`${LOG_PREFIX} profile check error userId=${user.id}`, err);
    // production: 안전상 /login 강제 (계속 진행 시 락 가능성)
    if (process.env.NODE_ENV === "production") {
      console.error(
        `${LOG_PREFIX} production: redirecting to /login due to profile error`
      );
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // dev: 통과 (디버깅 편의)
    console.warn(`${LOG_PREFIX} dev: allowing access despite profile error`);
  }

  // 3-3. 카카오 사용자는 자동 완성 — 온보딩 강제 스킵
  const skipOnboarding = profile?.provider === "kakao";

  if (!skipOnboarding) {
    // 프로필 미완성 (이름/출생연도) → /onboarding/profile
    if (!profile || !profile.name || !profile.birthYear) {
      console.log(
        `${ONB_LOG_PREFIX} forcing /onboarding/profile userId=${user.id} from=${pathname}`
      );
      return NextResponse.redirect(new URL("/onboarding/profile", request.url));
    }
    // 전화번호 미인증 → /onboarding/phone
    if (!profile.phoneVerified) {
      console.log(
        `${ONB_LOG_PREFIX} forcing /onboarding/phone userId=${user.id} from=${pathname}`
      );
      return NextResponse.redirect(new URL("/onboarding/phone", request.url));
    }
  }

  // 3-4. AUTH_ONLY 경로(이미 로그인됨) → /
  if (isAuthOnlyPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 3-5. /admin 가드 (Phase B-3): role !== ADMIN → /
  if (isAdminPath) {
    console.log(
      `${ADMIN_LOG_PREFIX} start userId=${user.id} email=${user.email ?? "-"} path=${pathname}`
    );
    try {
      const userRow = await prisma.users.findUnique({
        where: { id: user.id },
        select: { role: true },
      });
      const role = userRow?.role ?? "MEMBER";

      if (role !== "ADMIN") {
        console.warn(
          `${ADMIN_LOG_PREFIX} blocked userId=${user.id} email=${user.email ?? "-"} role=${role} path=${pathname}`
        );
        return NextResponse.redirect(new URL("/", request.url));
      }
      console.log(
        `${ADMIN_LOG_PREFIX} success userId=${user.id} role=${role} path=${pathname}`
      );
    } catch (err) {
      console.error(
        `${ADMIN_LOG_PREFIX} role_check_failed userId=${user.id} path=${pathname}`,
        err
      );
      if (process.env.NODE_ENV === "production") {
        return NextResponse.redirect(new URL("/", request.url));
      }
      console.warn(`${ADMIN_LOG_PREFIX} dev: role_check_failed → pass`);
    }
  }

  // 3-6. 그 외 → 통과
  return response;
}

export const config = {
  matcher: [
    /*
     * 모든 요청에 적용 (API routes, static files, images 제외)
     */
    "/((?!api/|_next/|static/|favicon.ico|.*\\.).*)",
  ],
};
