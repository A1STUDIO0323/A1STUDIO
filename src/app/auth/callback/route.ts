import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizePostAuthRedirect } from "@/lib/safe-redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = sanitizePostAuthRedirect(searchParams.get("next") ?? "/");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const target = `${origin}${nextPath.startsWith("/") ? nextPath : `/${nextPath}`}`;
  if (process.env.NODE_ENV === "development") {
    console.log("[auth/callback] redirect target (path only logged)", {
      pathPreview: nextPath.length > 80 ? `${nextPath.slice(0, 80)}…` : nextPath,
    });
  }
  return NextResponse.redirect(target);
}
