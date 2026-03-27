export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAuthClient } from "@/lib/supabase-auth";

const confirmSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  password: z.string().min(8).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = confirmSchema.parse(body);
    const supabase = createSupabaseAuthClient();

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
    });
    if (sessionError) {
      return NextResponse.json(
        { success: false, error: "유효하지 않거나 만료된 재설정 링크입니다." },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: data.password,
    });
    if (updateError) {
      return NextResponse.json(
        { success: false, error: "비밀번호 변경에 실패했습니다." },
        { status: 400 }
      );
    }

    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "입력값 오류" }, { status: 400 });
    }
    console.error("[POST /api/auth/password-reset/confirm]", error);
    return NextResponse.json({ success: false, error: "비밀번호 재설정 실패" }, { status: 500 });
  }
}
