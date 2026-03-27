export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: false, error: "이메일 회원가입은 종료되었습니다. 소셜 로그인만 지원합니다." },
    { status: 410 }
  );
}
