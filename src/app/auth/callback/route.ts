import { NextResponse } from "next/server";
import { sanitizePostAuthRedirect } from "@/lib/safe-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = sanitizePostAuthRedirect(searchParams.get("next") ?? "/");

  if (process.env.NODE_ENV === "development") {
    console.log("[auth/callback] Received code:", code ? "YES" : "NO");
    console.log("[auth/callback] Next path:", nextPath);
  }

  // code 파라미터를 유지하면서 리다이렉트
  // 클라이언트의 Supabase가 자동으로 code를 감지하고 세션을 생성합니다
  const target = new URL(nextPath, origin);
  if (code) {
    target.searchParams.set("code", code);
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[auth/callback] Redirecting to:", target.toString());
  }
  
  return NextResponse.redirect(target.toString());
}
