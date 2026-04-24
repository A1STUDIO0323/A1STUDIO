export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getAllReviews,
  toggleReviewVisibility,
  deleteReview,
} from "@/lib/supabase-reviews";

// GET: 전체 후기 목록 조회
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증되지 않음" }, { status: 401 });
    }

    const adminPassword = request.headers.get("x-admin-password");
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    const reviews = await getAllReviews();

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("[Admin Reviews GET Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "후기 조회 실패" },
      { status: 500 }
    );
  }
}

// PATCH: 후기 공개/비공개 토글
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증되지 않음" }, { status: 401 });
    }

    const adminPassword = request.headers.get("x-admin-password");
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "후기 ID가 필요합니다" }, { status: 400 });
    }

    await toggleReviewVisibility(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Reviews PATCH Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "후기 업데이트 실패" },
      { status: 500 }
    );
  }
}

// DELETE: 후기 삭제
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증되지 않음" }, { status: 401 });
    }

    const adminPassword = request.headers.get("x-admin-password");
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "후기 ID가 필요합니다" }, { status: 400 });
    }

    await deleteReview(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Reviews DELETE Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "후기 삭제 실패" },
      { status: 500 }
    );
  }
}
