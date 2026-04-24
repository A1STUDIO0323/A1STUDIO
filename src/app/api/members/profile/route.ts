import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { users } from "@prisma/client";

/** JSON 응답용 — API는 항상 camelCase */
function serializeProfile(row: users) {
  const r = row as users & { nickname?: string | null };
  return {
    id: r.id,
    email: r.email,
    name: r.name,
    nickname: r.nickname ?? null,
    avatarUrl: r.avatar_url,
    provider: r.provider,
    birthYear: r.birth_year,
    phone: r.phone,
    phoneVerified: r.phone_verified,
    marketingAgreed: r.marketing_agreed,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

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
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const profile = await prisma.users.findUnique({
      where: { id: user.id },
    });

    if (!profile) {
      return NextResponse.json({ success: true, profile: null }, { status: 200 });
    }

    return NextResponse.json(
      { success: true, profile: serializeProfile(profile) },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/members/profile]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// ── POST: 프로필 생성/업데이트 (upsert) ─────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
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
      const firstError = parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, birthYear, phone, phoneVerified } = parsed.data;

    // Prisma upsert — auth user id 기준
    const updatedProfile = await prisma.users.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email ?? null,
        name: name ?? null,
        birth_year: birthYear ?? null,
        phone: phone ?? null,
        phone_verified: phoneVerified ?? false,
        provider: user.app_metadata?.provider ?? "email",
        updated_at: new Date(),
      },
      update: {
        ...(name !== undefined && { name }),
        ...(birthYear !== undefined && { birth_year: birthYear }),
        ...(phone !== undefined && { phone }),
        ...(phoneVerified !== undefined && { phone_verified: phoneVerified }),
        updated_at: new Date(),
      },
    });

    return NextResponse.json(
      { success: true, profile: serializeProfile(updatedProfile) },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/members/profile]", error);
    return NextResponse.json({ error: "프로필 저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}
