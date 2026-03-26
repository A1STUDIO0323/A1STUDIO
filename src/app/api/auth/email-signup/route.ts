export const dynamic = 'force-dynamic'
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: false, error: "?´ë©”???Œì›ê°€?…ì? ì¢…ë£Œ?˜ì—ˆ?µë‹ˆ?? ?Œì…œ ë¡œê·¸?¸ë§Œ ì§€?í•©?ˆë‹¤." },
    { status: 410 }
  );
}
