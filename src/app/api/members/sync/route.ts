export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function isDbConnectionError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeCode = (error as { code?: string }).code;
  if (maybeCode === "P1001" || maybeCode === "P1011" || maybeCode === "P2010") return true;
  const maybeMessage = (error as { message?: string }).message;
  if (typeof maybeMessage !== "string") return false;
  return (
    maybeMessage.includes("Can't reach database server") ||
    maybeMessage.includes("self-signed certificate in certificate chain") ||
    maybeMessage.includes("Error opening a TLS connection")
  );
}

function isPrismaTableMissingError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeCode = (error as { code?: string }).code;
  if (maybeCode === "P2021") return true;
  const maybeMessage = (error as { message?: string }).message;
  return typeof maybeMessage === "string" && maybeMessage.includes("does not exist");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
    }
    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      email?: string | null;
      name?: string | null;
      avatarUrl?: string | null;
      provider?: string | null;
    };

    const id = body.id?.trim() || user.id;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing user id" }, { status: 400 });
    }
    if (id !== user.id) {
      return NextResponse.json({ ok: false, error: "Invalid user id" }, { status: 403 });
    }

    const email =
      (body.email ?? user.email ?? "").trim().toLowerCase() || null;
    const userName =
      body.name ??
      (typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : null);
    const avatarUrl =
      body.avatarUrl ??
      (typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : typeof user.user_metadata?.picture === "string"
          ? user.user_metadata.picture
          : null);
    const provider =
      body.provider ??
      (typeof user.app_metadata?.provider === "string"
        ? user.app_metadata.provider
        : null);

    let prismaUserSynced = true;
    try {
      await prisma.user.upsert({
        where: { id },
        update: {
          email,
          name: userName,
          avatarUrl,
          provider,
        },
        create: {
          id,
          email,
          name: userName,
          avatarUrl,
          provider,
        },
      });
    } catch (error) {
      if (isPrismaTableMissingError(error)) {
        prismaUserSynced = false;
      } else {
        throw error;
      }
    }

    try {
      if (id) {
        await supabase.from("profiles").upsert({
          id,
          email,
          full_name: userName,
          updated_at: new Date().toISOString(),
        });
      }
    } catch {
      // profiles 테이블/RLS 미설정 시 무시
    }

    if (!prismaUserSynced) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "PRISMA_USERS_TABLE_MISSING",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isDbConnectionError(error)) {
      return NextResponse.json({ success: true, skipped: true, reason: "DB_UNAVAILABLE" });
    }
    console.error("[POST /api/members/sync]", error);
    return NextResponse.json({ success: false, error: "회원 동기화 실패" }, { status: 500 });
  }
}
