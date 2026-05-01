import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/board?categorySlug=free&page=1&limit=20
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categorySlug = searchParams.get("categorySlug");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limitRaw = parseInt(searchParams.get("limit") || "20", 10) || 20;
    const limit = Math.min(100, Math.max(1, limitRaw));
    const skip = (page - 1) * limit;

    const where: Prisma.BoardPostWhereInput = {
      isHidden: false,
    };

    if (categorySlug) {
      const category = await prisma.boardCategory.findUnique({
        where: { slug: categorySlug },
      });

      if (!category) {
        return NextResponse.json(
          { success: false, error: "카테고리를 찾을 수 없습니다" },
          { status: 404 }
        );
      }

      where.categoryId = category.id;
    }

    const [posts, total] = await Promise.all([
      prisma.boardPost.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        include: {
          category: {
            select: { name: true, slug: true },
          },
          _count: {
            select: {
              comments: true,
              likes: true,
            },
          },
        },
      }),
      prisma.boardPost.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      posts: posts.map((post) => ({
        id: post.id,
        title: post.title,
        content:
          post.content.length > 100
            ? post.content.substring(0, 100)
            : post.content,
        authorId: post.authorId,
        category: post.category,
        views: post.views,
        isNotice: post.isNotice,
        isPinned: post.isPinned,
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
    console.error("[GET /api/board]", error);
    return NextResponse.json(
      { success: false, error: "게시글 목록 조회 실패" },
      { status: 500 }
    );
  }
}
