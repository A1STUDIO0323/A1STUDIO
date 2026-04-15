import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    
    if (email) {
      // 특정 이메일 조회
      const profile = await prisma.$queryRaw`
        SELECT email, birth_date, phone, created_at, updated_at
        FROM member_profiles
        WHERE email = ${email.trim().toLowerCase()}
        LIMIT 1
      `;
      
      return NextResponse.json({ success: true, profile });
    }
    
    // 전체 목록 조회
    const profiles = await prisma.$queryRaw`
      SELECT email, birth_date, phone, created_at, updated_at
      FROM member_profiles
      ORDER BY updated_at DESC
      LIMIT 10
    `;
    
    return NextResponse.json({ success: true, profiles });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
