import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/board/[id]/comments
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body = (await request.json()) as {
      content?: string;
      parentId?: string | null;
    };
    const { content, parentId } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { success: false, error: "댓글 내용은 필수입니다" },
        { status: 400 }
      );
    }

    const post = await prisma.boardPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.isHidden) {
      return NextResponse.json(
        { success: false, error: "게시글을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    let parentIdValue: string | null = parentId ?? null;
    if (parentIdValue) {
      const parentComment = await prisma.boardComment.findUnique({
        where: { id: parentIdValue },
      });
      if (!parentComment || parentComment.postId !== postId) {
        return NextResponse.json(
          { success: false, error: "잘못된 대댓글 대상입니다" },
          { status: 400 }
        );
      }
    }

    const comment = await prisma.boardComment.create({
      data: {
        postId,
        authorId: user.id,
        content: content.trim(),
        parentId: parentIdValue,
      },
    });

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
      },
    });
  } catch (error) {
    console.error("[POST /api/board/[id]/comments]", error);
    return NextResponse.json(
      { success: false, error: "댓글 작성 실패" },
      { status: 500 }
    );
  }
}
