import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Supabase 연결 테스트
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    const config = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKeyConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      supabaseKeyLength: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.length,
      kakaoConfigured: process.env.NEXT_PUBLIC_KAKAO_CONFIGURED === "true",
      googleConfigured: process.env.NEXT_PUBLIC_GOOGLE_CONFIGURED === "true",
      kakaoClientId: process.env.AUTH_KAKAO_ID ? "설정됨 (" + process.env.AUTH_KAKAO_ID.substring(0, 8) + "...)" : "미설정",
      kakaoClientSecret: process.env.AUTH_KAKAO_SECRET ? "설정됨 (길이: " + process.env.AUTH_KAKAO_SECRET.length + ")" : "미설정",
      sessionError: sessionError?.message || null,
      currentSession: session ? "활성" : "없음",
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    };
    
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "알 수 없는 오류",
    }, { status: 500 });
  }
}
