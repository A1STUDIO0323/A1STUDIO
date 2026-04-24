export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/reservations/holds/expire
 * ??? ??? EXPIRED ???? ?? API
 * Vercel Cron: vercel.json? "0 * * * *" ?? ??
 *
 * Authorization: Bearer {CRON_SECRET} ?? ??
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({
      processed: 0, // result.length
      message: "?? ??",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[POST /api/reservations/holds/expire]", error);
    return NextResponse.json({ error: "?? ? ??? ??????." }, { status: 500 });
  }
}
