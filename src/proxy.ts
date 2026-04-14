import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sanitizePostAuthRedirect } from "@/lib/safe-redirect";

const isBookingEnabled = process.env.NEXT_PUBLIC_BOOKING_ENABLED === "true";
const PHONE_OTP_ENABLED =
  process.env.NEXT_PUBLIC_PHONE_OTP_ENABLED === "true";

function isBookingPath(pathname: string) {
  return pathname.startsWith("/booking") || pathname.startsWith("/availability");
}

function isBookingApiPath(pathname: string) {
  return (
    pathname.startsWith("/api/payments") ||
    pathname.startsWith("/api/reservations")
  );
}

const PROTECTED_PREFIXES = ["/dashboard", "/mypage"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

/** 보호 경로: 리디렉트 또는 세션 쿠키가 반영된 NextResponse */
async function authGuardResponse(
  req: NextRequest,
  user: any | null
): Promise<NextResponse | null> {
  if (!isProtectedPath(req.nextUrl.pathname)) return null;

  const dest = sanitizePostAuthRedirect(
    `${req.nextUrl.pathname}${req.nextUrl.search}`
  );

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("callbackUrl", dest);
    if (process.env.NODE_ENV === "development") {
      console.log("[proxy] -> /login (unauthenticated)", {
        dest: dest.length > 100 ? `${dest.slice(0, 100)}…` : dest,
      });
    }
    return NextResponse.redirect(url);
  }

  if (PHONE_OTP_ENABLED && !user.phone_confirmed_at) {
    const url = req.nextUrl.clone();
    url.pathname = "/onboarding/phone";
    url.search = "";
    url.searchParams.set("next", dest);
    if (process.env.NODE_ENV === "development") {
      console.log("[proxy] -> /onboarding/phone (phone pending)", {
        dest: dest.length > 100 ? `${dest.slice(0, 100)}…` : dest,
      });
    }
    return NextResponse.redirect(url);
  }

  return null;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Supabase 세션 쿠키 갱신 (모든 요청에 대해)
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: req,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 세션 갱신 (중요!)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (process.env.NODE_ENV === "development" && pathname !== "/api/debug/auth-config") {
    console.log("[proxy]", pathname, "- User:", user ? user.id.substring(0, 8) + "..." : "None");
  }

  // 예약 기능 비활성화 처리
  if (!isBookingEnabled) {
    if (isBookingApiPath(pathname)) {
      return NextResponse.json(
        {
          success: false,
          error: "예약/결제 기능은 준비 중입니다.",
        },
        { status: 503 }
      );
    }

    if (isBookingPath(pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/guide";
      url.searchParams.set("feature", "booking-soon");
      return NextResponse.redirect(url);
    }
  }

  // 보호된 경로 인증 체크
  const authResult = await authGuardResponse(req, user);
  if (authResult) return authResult;

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
