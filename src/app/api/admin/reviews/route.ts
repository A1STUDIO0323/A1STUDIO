export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  getAllReviews,
  toggleReviewVisibility,
  deleteReview,
} from "@/lib/supabase-reviews";
import { requireAdminOrLegacy } from "@/lib/admin-auth";

// GET: 전체 후기 목록 조회
export async function GET(request: Request) {
  try {
    const auth = await requireAdminOrLegacy(request);
    if ("error" in auth) return auth.error;

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
    const auth = await requireAdminOrLegacy(request);
    if ("error" in auth) return auth.error;

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
    const auth = await requireAdminOrLegacy(request);
    if ("error" in auth) return auth.error;

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
