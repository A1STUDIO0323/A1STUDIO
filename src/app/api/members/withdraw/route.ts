import { NextResponse } from "next/server";
import { withdrawMemberByUserId } from "@/lib/member-role-db";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
    }

    await withdrawMemberByUserId(user.id, user.email ?? null);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/members/withdraw]", error);
    const message = error instanceof Error ? error.message : "회원탈퇴 처리에 실패했습니다.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
