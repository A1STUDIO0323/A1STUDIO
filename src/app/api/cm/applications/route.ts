import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

const VALID_SUBJECTS = ["vocal", "dance", "act", "musical", "etc"] as const;
type Subject = (typeof VALID_SUBJECTS)[number];

/**
 * CM 지원서 제출
 * POST /api/cm/applications
 *
 * 정책:
 * - 로그인 필수
 * - PENDING/APPROVED/HOLD 상태의 신청이 이미 있으면 신규 제출 차단
 * - REJECTED 또는 신청 이력 없음일 경우만 신규 제출 가능
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      phone,
      field,
      intro,
      career,
      portfolio_url,
      profile_image,
      can_oneday,
      can_lesson,
      subjects,
    } = body as Record<string, unknown>;

    // 필수 입력 검증
    if (
      typeof name !== "string" || !name.trim() ||
      typeof phone !== "string" || !phone.trim() ||
      typeof field !== "string" || !field.trim() ||
      typeof intro !== "string" || !intro.trim() ||
      typeof career !== "string" || !career.trim()
    ) {
      return NextResponse.json(
        { error: "이름·연락처·활동분야·소개·경력은 필수 입력 항목입니다" },
        { status: 400 }
      );
    }

    if (!can_oneday && !can_lesson) {
      return NextResponse.json(
        { error: "원데이클래스 또는 개인레슨 중 최소 하나는 선택해야 합니다" },
        { status: 400 }
      );
    }

    const cleanSubjects: Subject[] = Array.isArray(subjects)
      ? (subjects.filter(
          (s): s is Subject =>
            typeof s === "string" && (VALID_SUBJECTS as readonly string[]).includes(s)
        ))
      : [];

    if (cleanSubjects.length === 0) {
      return NextResponse.json(
        { error: "수업 가능 분야를 한 가지 이상 선택해주세요" },
        { status: 400 }
      );
    }

    // 진행 중 신청 존재 여부 확인 (REJECTED는 재신청 허용)
    const existing = await prisma.cm_applications.findFirst({
      where: {
        user_id: user.id,
        status: { in: ["PENDING", "APPROVED", "HOLD"] },
      },
      select: { id: true, status: true },
    });

    if (existing) {
      const msg =
        existing.status === "APPROVED"
          ? "이미 승인된 CM입니다. 마이페이지에서 프로필을 관리해주세요."
          : "검토 중인 신청이 있습니다. 결과가 나온 후 다시 신청해주세요.";
      return NextResponse.json(
        { error: msg, status: existing.status },
        { status: 409 }
      );
    }

    const created = await prisma.cm_applications.create({
      data: {
        user_id: user.id,
        name: name.trim(),
        phone: phone.trim(),
        field: field.trim(),
        intro: intro.trim(),
        career: career.trim(),
        portfolio_url: typeof portfolio_url === "string" && portfolio_url.trim() ? portfolio_url.trim() : null,
        profile_image: typeof profile_image === "string" && profile_image.trim() ? profile_image.trim() : null,
        can_oneday: Boolean(can_oneday),
        can_lesson: Boolean(can_lesson),
        subjects: cleanSubjects,
        status: "PENDING",
      },
      select: { id: true, status: true, created_at: true },
    });

    return NextResponse.json({ success: true, application: created });
  } catch (error) {
    console.error("[CM 신청] 오류:", error);
    return NextResponse.json(
      { error: "신청 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
