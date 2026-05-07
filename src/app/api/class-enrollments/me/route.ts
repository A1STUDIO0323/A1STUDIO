import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

/**
 * 내 클래스/레슨 신청 내역
 * GET /api/class-enrollments/me
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const enrollments = await prisma.class_enrollments.findMany({
    where: { user_id: user.id },
    orderBy: { enrolled_at: "desc" },
    include: {
      offering: {
        select: {
          id: true,
          type: true,
          title: true,
          subject: true,
          duration_minutes: true,
          scheduled_at: true,
          status: true,
        },
      },
    },
  });

  return NextResponse.json({ enrollments });
}
