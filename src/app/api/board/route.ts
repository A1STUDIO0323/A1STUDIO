import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBoardPost } from "@/lib/board-db";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = (await request.json()) as { title?: string; content?: string };
    const { title, content } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "제목과 내용을 입력해주세요." },
        { status: 400 }
      );
    }

    const post = await createBoardPost({
      title: title.trim(),
      content: content.trim(),
      authorId: user.id,
    });

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/board]", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
