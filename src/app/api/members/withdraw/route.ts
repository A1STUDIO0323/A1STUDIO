export const dynamic = 'force-dynamic'
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
      return NextResponse.json({ success: false, error: "ë¡œê·¸?¸ì´ ?„ìš”?©ë‹ˆ??" }, { status: 401 });
    }

    await withdrawMemberByUserId(user.id, user.email ?? null);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/members/withdraw]", error);
    const message = error instanceof Error ? error.message : "?Œì›?ˆí‡´ ì²˜ë¦¬???¤íŒ¨?ˆìŠµ?ˆë‹¤.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
