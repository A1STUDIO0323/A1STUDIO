import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";
import prisma from "@/lib/db";

// ── 유효성 검사 스키마 ──────────────────────────────────────
const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(2, "이름은 2자 이상이어야 합니다.")
    .max(20, "이름은 20자 이하이어야 합니다.")
    .optional(),
  birthYear: z
    .number()
    .int()
    .min(1900, "올바른 출생연도를 입력해주세요.")
    .max(new Date().getFullYear(), "올바른 출생연도를 입력해주세요.")
    .optional(),
  phone: z
    .string()
    .regex(/^01[0-9]{8,9}$/, "올바른 전화번호 형식이 아닙니다.")
    .optional(),
  phoneVerified: z.boolean().optional(),
});

// ── GET: 프로필 조회 ────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!profile) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/members/profile]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// ── POST: 프로필 생성/업데이트 (upsert) ─────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "입력값이 올바르지 않습니다.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, birthYear, phone, phoneVerified } = parsed.data;

    // Prisma upsert — auth user id 기준
    const updatedProfile = await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email ?? null,
        name: name ?? null,
        // @ts-ignore — 스키마 확장 필드 (마이그레이션 후 타입 자동 생성됨)
        birthYear: birthYear ?? null,
        phone: phone ?? null,
        phoneVerified: phoneVerified ?? false,
        provider: user.app_metadata?.provider ?? "email",
      },
      update: {
        ...(name !== undefined && { name }),
        // @ts-ignore
        ...(birthYear !== undefined && { birthYear }),
        ...(phone !== undefined && { phone }),
        ...(phoneVerified !== undefined && { phoneVerified }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ profile: updatedProfile }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/members/profile]", error);
    return NextResponse.json({ error: "프로필 저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}
