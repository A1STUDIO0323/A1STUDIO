export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRoleByEmail, upsertRoleByEmail } from "@/lib/member-role-db";

const postSchema = z.object({
  email: z.string().email(),
  role: z.enum(["CM", "MEMBER"]),
});

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json({ role: "MEMBER" });
    }
    const role = await getRoleByEmail(email.trim().toLowerCase());
    return NextResponse.json({ role });
  } catch {
    // DB ?¥ì•  ?œì—??ê¸°ë³¸ ?Œì›ê¶Œí•œ?¼ë¡œ ?ë¦„??? ì??©ë‹ˆ??
    return NextResponse.json({ role: "MEMBER", skipped: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = postSchema.parse(body);
    const email = data.email.trim().toLowerCase();

    await upsertRoleByEmail(email, data.role);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "?…ë ¥ê°??¤ë¥˜", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "?Œì›?±ê¸‰ ë³€ê²??¤íŒ¨" }, { status: 500 });
  }
}
