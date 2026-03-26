export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { banMemberByEmail, unbanMemberByEmail, withdrawMemberByEmail } from "@/lib/member-role-db";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";

const actionSchema = z.object({
  adminPassword: z.string(),
  email: z.string().email(),
  action: z.enum(["WITHDRAW", "BAN", "UNBAN"]),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = actionSchema.parse(body);
    if (data.adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ success: false, error: "Í∂åÌïú ?ÜÏùå" }, { status: 403 });
    }

    const email = data.email.trim().toLowerCase();
    if (data.action === "WITHDRAW") {
      await withdrawMemberByEmail(email);
      return NextResponse.json({ success: true });
    }
    if (data.action === "BAN") {
      await banMemberByEmail(email, data.reason);
      return NextResponse.json({ success: true });
    }
    await unbanMemberByEmail(email);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "?ÖÎ†•Í∞??§Î•ò", details: error.issues }, { status: 400 });
    }
    console.error("[POST /api/admin/members/actions]", error);
    const message = error instanceof Error ? error.message : "?ëÏóÖ Ï≤òÎ¶¨ ?§Ìå®";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
