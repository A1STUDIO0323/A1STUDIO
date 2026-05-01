import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/board/create
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
      title?: string;
      content?: string;
      categorySlug?: string;
    };
    const { title, content, categorySlug } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: "제목과 내용은 필수입니다" },
        { status: 400 }
      );
    }

    let categoryId: string | null = null;
    if (categorySlug?.trim()) {
      const category = await prisma.boardCategory.findUnique({
        where: { slug: categorySlug.trim() },
      });

      if (!category) {
        return NextResponse.json(
          { success: false, error: "카테고리를 찾을 수 없습니다" },
          { status: 404 }
        );
      }

      categoryId = category.id;
    }

    const post = await prisma.boardPost.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        categoryId,
        authorId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        title: post.title,
      },
    });
  } catch (error) {
    console.error("[POST /api/board/create]", error);
    return NextResponse.json(
      { success: false, error: "게시글 작성 실패" },
      { status: 500 }
    );
  }
}
