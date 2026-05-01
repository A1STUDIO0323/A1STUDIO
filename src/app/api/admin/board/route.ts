import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/admin/board — 전체 게시글 (관리자)
export async function GET(request: NextRequest) {
  try {
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

    const headerPassword = request.headers.get("x-admin-password");
    if (!headerPassword || headerPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "관리자 권한이 필요합니다" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limitRaw = parseInt(searchParams.get("limit") || "50", 10) || 50;
    const limit = Math.min(100, Math.max(1, limitRaw));
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      prisma.boardPost.findMany({
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          categoryText: true,
          authorId: true,
          views: true,
          isNotice: true,
          isPinned: true,
          isHidden: true,
          createdAt: true,
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
      }),
      prisma.boardPost.count(),
    ]);

    return NextResponse.json({
      success: true,
      posts: posts.map((post) => ({
        id: post.id,
        title: post.title,
        categoryText: post.categoryText,
        authorId: post.authorId,
        views: post.views,
        isNotice: post.isNotice,
        isPinned: post.isPinned,
        isHidden: post.isHidden,
        commentCount: post._count.comments,
        likeCount: post._count.likes,
        createdAt: post.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/board]", error);
    return NextResponse.json(
      { success: false, error: "게시글 조회 실패" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/board — 게시글 일괄 삭제
export async function DELETE(request: NextRequest) {
  try {
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

    const headerPassword = request.headers.get("x-admin-password");
    if (!headerPassword || headerPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "관리자 권한이 필요합니다" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as { postIds?: unknown };
    const postIds = body.postIds;

    if (!Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "삭제할 게시글을 선택해주세요" },
        { status: 400 }
      );
    }

    const ids = postIds.filter((id): id is string => typeof id === "string" && id.length > 0);

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: "유효한 게시글 id가 없습니다" },
        { status: 400 }
      );
    }

    const result = await prisma.boardPost.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("[DELETE /api/admin/board]", error);
    return NextResponse.json(
      { success: false, error: "게시글 삭제 실패" },
      { status: 500 }
    );
  }
}
