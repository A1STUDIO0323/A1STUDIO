import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/board/[id]/like - 좋아요 토글
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id: postId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    const postExists = await prisma.boardPost.findFirst({
      where: { id: postId, isHidden: false },
      select: { id: true },
    });
    if (!postExists) {
      return NextResponse.json(
        { success: false, error: "게시글을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const existing = await prisma.boardLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId: user.id,
        },
      },
    });

    if (existing) {
      await prisma.boardLike.delete({
        where: { id: existing.id },
      });

      return NextResponse.json({
        success: true,
        liked: false,
      });
    }

    await prisma.boardLike.create({
      data: {
        postId,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      liked: true,
    });
  } catch (error) {
    console.error("[POST /api/board/[id]/like]", error);
    return NextResponse.json(
      { success: false, error: "좋아요 처리 실패" },
      { status: 500 }
    );
  }
}
