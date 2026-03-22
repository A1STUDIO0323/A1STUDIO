import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isBookingEnabled = process.env.NEXT_PUBLIC_BOOKING_ENABLED === "true";

function isBookingPath(pathname: string) {
  return pathname.startsWith("/booking") || pathname.startsWith("/availability");
}

function isBookingApiPath(pathname: string) {
  return (
    pathname.startsWith("/api/payments") ||
    pathname.startsWith("/api/reservations")
  );
}

export function proxy(req: NextRequest) {
  if (isBookingEnabled) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/booking/:path*", "/availability", "/api/payments/:path*", "/api/reservations/:path*"],
};
