import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";

const requestSchema = z.object({
  email: z.string().email(),
});

function isDbConnectionError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = (error as { message?: string }).message;
  return typeof message === "string" && message.toLowerCase().includes("network");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = requestSchema.parse(body);
    const email = data.email.trim().toLowerCase();
    const supabase = createSupabaseAuthClient();
    const redirectTo = `${req.nextUrl.origin}/reset-password`;
    await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "입력값 오류" }, { status: 400 });
    }
    if (isDbConnectionError(error)) {
      return NextResponse.json(
        { success: false, error: "DB 연결이 불안정합니다. 잠시 후 다시 시도해주세요." },
        { status: 503 }
      );
    }
    console.error("[POST /api/auth/password-reset/request]", error);
    return NextResponse.json({ success: false, error: "비밀번호 재설정 요청 실패" }, { status: 500 });
  }
}
