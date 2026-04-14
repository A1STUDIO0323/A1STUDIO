import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
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
