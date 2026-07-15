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

/**
 * 보안이 낮은(신원확인 불필요) 메뉴 경로.
 * 홈·소개·이용안내·오시는길·문의 등 단순 열람 페이지로,
 * 로그인/전화번호 인증이 없어도 누구나 둘러볼 수 있다.
 *
 * ⚠️ 여기에 "없는" 경로는 기본적으로 신원확인(전화번호 인증)을 강제한다.
 *    (예약하기·원데이클래스·개인레슨·게시판·마이페이지 등은 의도적으로 제외)
 *    분류를 빠뜨려도 더 안전한(인증 강제) 쪽으로 동작하도록 화이트리스트 방식 사용.
 */
const LOW_SECURITY_PATHS = [
  "/", // 홈
  "/about", // 소개 (회사소개(대표소개 통합)/공간소개)
  "/equipment", // 비품및시설 (소개 하위)
  "/spaces", // 공간소개
  "/pricing", // 이용안내 - 요금안내
  "/guide", // 이용안내 - 이용수칙·FAQ
  "/location", // 오시는길
  "/contact", // 문의
  "/notices", // 게시판 - 공지·이벤트 (열람 공개)
  "/reviews", // 게시판 - 후기 (열람 공개)
  "/events", // 오픈이벤트 안내
  "/availability", // 예약가능 시간 열람
  "/privacy", // 개인정보처리방침
  "/terms", // 이용약관
];

// 비로그인 사용자에게 허용되는 공개 경로
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/about",
  "/spaces",
  "/equipment",
  "/pricing",
  "/guide",
  "/events",
  "/contact",
  "/location",
  "/notices",
  "/reviews",
  "/availability",
  "/privacy",
  "/terms",
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

  // 3-2. 신원확인 게이트 — 보안 낮은 메뉴는 미인증 상태여도 열람 허용,
  //      그 외(예약하기·원데이클래스·개인레슨·게시판·마이페이지 등)는
  //      클릭 즉시 프로필 완성 + 전화번호 인증을 강제한다.
  const isLowSecurityPath = matchesPath(pathname, LOW_SECURITY_PATHS);

  if (isLowSecurityPath) {
    // 보안 낮은 경로 → 온보딩 게이트 스킵, 둘러보기 허용
    console.log(
      `${ONB_LOG_PREFIX} low-security path → skip identity gate userId=${user.id} path=${pathname}`
    );
  } else {
    // 신원확인 필요 경로 → 프로필/전화번호 인증 강제 검증
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
          `${LOG_PREFIX} profile fetch failed status=${profileRes.status} userId=${user.id} path=${pathname}`
        );
      }
    } catch (err) {
      console.error(
        `${LOG_PREFIX} profile check error userId=${user.id} path=${pathname}`,
        err
      );
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

    // 카카오 사용자는 자동 완성 — 온보딩 강제 스킵
    const skipOnboarding = profile?.provider === "kakao";

    if (!skipOnboarding) {
      // 프로필 미완성 (이름/출생연도) → /onboarding/profile
      if (!profile || !profile.name || !profile.birthYear) {
        console.log(
          `${ONB_LOG_PREFIX} forcing /onboarding/profile userId=${user.id} from=${pathname}`
        );
        return NextResponse.redirect(
          new URL("/onboarding/profile", request.url)
        );
      }
      // 전화번호 미인증 → /onboarding/phone (신원확인 필요 메뉴 클릭 시점)
      if (!profile.phoneVerified) {
        console.log(
          `${ONB_LOG_PREFIX} forcing /onboarding/phone userId=${user.id} from=${pathname}`
        );
        return NextResponse.redirect(new URL("/onboarding/phone", request.url));
      }
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
