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
async function authGuardResponse(req: NextRequest): Promise<NextResponse | null> {
  if (!isProtectedPath(req.nextUrl.pathname)) return null;

  let supabaseResponse = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  return supabaseResponse;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

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

  const authResult = await authGuardResponse(req);
  if (authResult) return authResult;

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/booking/:path*",
    "/availability",
    "/api/payments/:path*",
    "/api/reservations/:path*",
    "/dashboard/:path*",
    "/mypage/:path*",
  ],
};
