import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/board/[id]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const post = await prisma.boardPost.findUnique({
      where: { id },
      include: {
        category: {
          select: { name: true, slug: true },
        },
        comments: {
          where: { isHidden: false, parentId: null },
          orderBy: { createdAt: "asc" },
          include: {
            replies: {
              where: { isHidden: false },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        _count: {
          select: { likes: true },
        },
      },
    });

    if (!post || post.isHidden) {
      return NextResponse.json(
        { success: false, error: "게시글을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    await prisma.boardPost.update({
      where: { id },
      data: { views: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
        authorId: post.authorId,
        category: post.category,
        views: post.views + 1,
        isNotice: post.isNotice,
        isPinned: post.isPinned,
        likeCount: post._count.likes,
        comments: post.comments,
        createdAt: post.createdAt,
      },
    });
  } catch (error) {
    console.error("[GET /api/board/[id]]", error);
    return NextResponse.json(
      { success: false, error: "게시글 조회 실패" },
      { status: 500 }
    );
  }
}

// DELETE /api/board/[id] - 작성자만
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    const post = await prisma.boardPost.findUnique({ where: { id } });

    if (!post) {
      return NextResponse.json(
        { success: false, error: "게시글을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (post.authorId !== user.id) {
      return NextResponse.json(
        { success: false, error: "권한이 없습니다" },
        { status: 403 }
      );
    }

    await prisma.boardPost.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/board/[id]]", error);
    return NextResponse.json(
      { success: false, error: "게시글 삭제 실패" },
      { status: 500 }
    );
  }
}
