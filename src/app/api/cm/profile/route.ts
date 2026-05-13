import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

const VALID_SUBJECTS = ["vocal", "dance", "act", "musical", "etc"] as const;
type Subject = (typeof VALID_SUBJECTS)[number];

/**
 * 본인 CM 프로필 조회
 * GET /api/cm/profile
 *
 * - 승인된 CM에게만 cm_profiles row가 존재함
 * - 없으면 404 (CM 미승인)
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

  const profile = await prisma.cm_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!profile) {
    return NextResponse.json({ error: "CM 프로필 없음", code: "NOT_CM" }, { status: 404 });
  }

  return NextResponse.json({ profile });
}

/**
 * 본인 CM 프로필 수정
 * PUT /api/cm/profile
 *
 * 수정 가능 항목:
 *  - 공개: display_name, bio, career, subjects, profile_image, portfolio_url, is_public
 *  - 비공개: bank_name, account_number, account_holder
 *
 * 변경 불가 (관리자만): is_active
 */
export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const existing = await prisma.cm_profiles.findUnique({
    where: { user_id: user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "CM 프로필이 없습니다" }, { status: 404 });
  }

  const body = await request.json();
  const {
    display_name,
    bio,
    career,
    subjects,
    profile_image,
    portfolio_url,
    is_public,
    show_in_section,
    show_in_list,
    bank_name,
    account_number,
    account_holder,
  } = body as Record<string, unknown>;

  if (typeof display_name !== "string" || !display_name.trim()) {
    return NextResponse.json({ error: "공개 프로필명은 필수입니다" }, { status: 400 });
  }

  const cleanSubjects: Subject[] = Array.isArray(subjects)
    ? subjects.filter((s): s is Subject =>
        typeof s === "string" && (VALID_SUBJECTS as readonly string[]).includes(s)
      )
    : [];

  const optStr = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  // 노출 토글: 신규 컬럼(show_in_section/list)이 제공되면 그 값을 사용,
  // is_public 은 두 토글의 OR 로 자동 동기화 (레거시 호환)
  const sectionFlag =
    typeof show_in_section === "boolean" ? show_in_section : undefined;
  const listFlag =
    typeof show_in_list === "boolean" ? show_in_list : undefined;
  const computedIsPublic =
    sectionFlag !== undefined || listFlag !== undefined
      ? Boolean((sectionFlag ?? true) || (listFlag ?? true))
      : typeof is_public === "boolean"
      ? is_public
      : undefined;

  const updated = await prisma.cm_profiles.update({
    where: { user_id: user.id },
    data: {
      display_name: display_name.trim(),
      bio: optStr(bio),
      career: optStr(career),
      subjects: cleanSubjects,
      profile_image: optStr(profile_image),
      portfolio_url: optStr(portfolio_url),
      is_public: computedIsPublic,
      show_in_section: sectionFlag,
      show_in_list: listFlag,
      bank_name: optStr(bank_name),
      account_number: optStr(account_number),
      account_holder: optStr(account_holder),
    },
  });

  return NextResponse.json({ success: true, profile: updated });
}
