export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: 전체 후기 목록 조회
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("id, author_name, rating, content, is_visible, created_at, image_url, video_url")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/reviews] GET error:", error);
      return NextResponse.json(
        { success: false, error: "후기 목록 조회 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, reviews: reviews ?? [] });
  } catch (error) {
    console.error("[admin/reviews] GET error:", error);
    return NextResponse.json(
      { success: false, error: "후기 목록 조회 실패" },
      { status: 500 }
    );
  }
}

// PATCH: 후기 공개/비공개 처리
export async function PATCH(req: NextRequest) {
  try {
    const { id, isVisible } = await req.json();

    if (!id || typeof isVisible !== "boolean") {
      return NextResponse.json(
        { success: false, error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    const { error } = await supabase
      .from("reviews")
      .update({ is_visible: isVisible })
      .eq("id", id);

    if (error) {
      console.error("[admin/reviews] PATCH error:", error);
      return NextResponse.json(
        { success: false, error: "후기 업데이트 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/reviews] PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "후기 업데이트 실패" },
      { status: 500 }
    );
  }
}

// DELETE: 후기 삭제
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "후기 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[admin/reviews] DELETE error:", error);
      return NextResponse.json(
        { success: false, error: "후기 삭제 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[admin/reviews] DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "후기 삭제 실패" },
      { status: 500 }
    );
  }
}
