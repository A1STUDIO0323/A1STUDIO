export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * A1 STUDIO 라우트 가드 미들웨어
 *
 * 적용 규칙:
 * 1. 로그인하지 않은 사용자가 보호된 페이지 접근 → /login
 * 2. 로그인했지만 프로필 미완성(이름/출생연도 없음) → /onboarding/profile
 * 3. 로그인했지만 전화번호 미인증 → /onboarding/phone
 * 4. 이미 로그인한 사용자가 /login, /signup 접근 → /
 */

// 로그인 없이도 접근 가능한 공개 경로
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

// 온보딩 전용 경로 (로그인 후 isOnboardingPath로 식별, 완료 전 본인 확인·정보 입력)
const ONBOARDING_PATHS = ["/onboarding/profile", "/onboarding/phone"];

// 로그인 후 접근 불필요한 경로 (리다이렉트 대상)
const AUTH_ONLY_PATHS = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 온보딩 경로: 인증만 있으면 본인 확인용 페이지 접근(프로필 완성·전화 이전 단계)
  const isOnboardingPath = ONBOARDING_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  console.log("[middleware] 실행됨:", request.nextUrl.pathname);

  // /api, /_next, /auth/callback 등 항상 통과
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/static") ||
    /\.(jpg|jpeg|png|gif|svg|ico|webp|css|js|woff|woff2)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Supabase 클라이언트 (미들웨어용)
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

  // ── 비로그인 사용자 처리 ─────────────────────────────────
  if (!user) {
    // 공개 경로 또는 온보딩 경로는 통과
    const isPublic = PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
    if (isPublic) return response;

    // 보호된 경로 → 로그인 페이지
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 로그인 사용자가 auth 전용 경로 접근 ─────────────────
  if (AUTH_ONLY_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // ── 프로필 완성 여부 확인 (보호된 경로 접근 시) ─────────
  // 공개 경로는 프로필 체크 스킵
  const isPublicPath = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isPublicPath) return response;

  // 보호된 경로: 프로필 데이터 확인
  try {
    const profileRes = await fetch(
      new URL("/api/members/profile", request.url).toString(),
      {
        headers: {
          cookie: request.headers.get("cookie") ?? "",
        },
      }
    );

    console.log("[middleware] profile fetch status:", profileRes.status);
    const rawText = await profileRes.text();
    console.log("[middleware] profile raw response:", rawText);

    if (profileRes.ok) {
      const { profile } = JSON.parse(rawText);

      console.log("[middleware] profile response:", JSON.stringify(profile));
      console.log("[middleware] provider:", profile?.provider);
      console.log(
        "[middleware] name:",
        profile?.name,
        "birthYear:",
        profile?.birthYear,
        "phoneVerified:",
        profile?.phoneVerified
      );

      // 온보딩 페이지 자체는 접근 허용 (여기서 정보 입력하도록)
      if (isOnboardingPath) {
        return response;
      }

      // 온보딩 페이지가 아닌 경우에만 프로필 완성 체크
      // 카카오 사용자는 온보딩 체크 스킵 (이미 정보 수집됨)
      if (profile?.provider === "kakao") {
        // 카카오는 /auth/callback에서 모든 정보를 자동으로 설정하므로 통과
        return response;
      }

      // 구글 또는 기타 provider: 온보딩 강제
      // 이름 또는 출생연도 없음 → /onboarding/profile
      if (!profile || !profile.name || !profile.birthYear) {
        console.log("[middleware] Redirecting to /onboarding/profile");
        return NextResponse.redirect(new URL("/onboarding/profile", request.url));
      }

      // 전화번호 미인증 → /onboarding/phone
      if (!profile.phoneVerified) {
        console.log("[middleware] Redirecting to /onboarding/phone");
        return NextResponse.redirect(new URL("/onboarding/phone", request.url));
      }
    }
  } catch (err) {
    // 프로필 API 오류 시 조용히 통과 (UX 우선)
    console.error("[middleware] profile check error:", err);
  }

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
