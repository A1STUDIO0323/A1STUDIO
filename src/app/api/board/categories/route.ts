import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/board/categories - 카테고리 목록 조회
export async function GET() {
  try {
    const categories = await prisma.boardCategory.findMany({
      where: { isActive: true },
      orderBy: [{ isOfficial: "desc" }, { createdAt: "asc" }],
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        isOfficial: cat.isOfficial,
        postCount: cat._count.posts,
      })),
    });
  } catch (error) {
    console.error("[GET /api/board/categories]", error);
    return NextResponse.json(
      { success: false, error: "카테고리 목록 조회 실패" },
      { status: 500 }
    );
  }
}

// POST /api/board/categories - 카테고리 생성 (회원만)
export async function POST(request: NextRequest) {
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

    const body = (await request.json()) as {
      name?: string;
      slug?: string;
      description?: string;
    };
    const { name, slug, description } = body;

    if (!name?.trim() || !slug?.trim()) {
      return NextResponse.json(
        { success: false, error: "카테고리명과 slug는 필수입니다" },
        { status: 400 }
      );
    }

    const existing = await prisma.boardCategory.findUnique({
      where: { slug: slug.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "이미 존재하는 카테고리입니다" },
        { status: 409 }
      );
    }

    const category = await prisma.boardCategory.create({
      data: {
        name: name.trim(),
        slug: slug.trim(),
        description: description?.trim() ? description.trim() : null,
        createdBy: user.id,
        isOfficial: false,
      },
    });

    return NextResponse.json({
      success: true,
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
      },
    });
  } catch (error) {
    console.error("[POST /api/board/categories]", error);
    return NextResponse.json(
      { success: false, error: "카테고리 생성 실패" },
      { status: 500 }
    );
  }
}
