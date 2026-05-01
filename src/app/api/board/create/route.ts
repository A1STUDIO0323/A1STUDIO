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
      categoryText?: string | null;
    };
    const { title, content, categoryText } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { success: false, error: "제목과 내용은 필수입니다" },
        { status: 400 }
      );
    }

    let finalCategoryText: string | null = null;
    if (categoryText?.trim()) {
      const trimmed = categoryText.trim();

      if (trimmed.length > 20) {
        return NextResponse.json(
          { success: false, error: "카테고리는 20자 이하로 입력해주세요" },
          { status: 400 }
        );
      }

      const bannedWords = ["욕설", "비속어", "광고"];
      if (bannedWords.some((word) => trimmed.includes(word))) {
        return NextResponse.json(
          { success: false, error: "부적절한 카테고리명입니다" },
          { status: 400 }
        );
      }

      finalCategoryText = trimmed;
    }

    const post = await prisma.boardPost.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        categoryText: finalCategoryText,
        authorId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        title: post.title,
        categoryText: post.categoryText,
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
