export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOtp, isValidKoreanMobile, normalizePhone } from "@/lib/sms-otp";

const sendCodeSchema = z.object({
  phone: z.string().min(10),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = sendCodeSchema.parse(body);
    const phone = normalizePhone(data.phone);

    if (!isValidKoreanMobile(phone)) {
      return NextResponse.json({ error: "?´ë???ë²ˆí˜¸ ?•ì‹???¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤." }, { status: 400 });
    }

    const code = createOtp(phone);

    // TODO: ?¤ì œ SMS ê³µê¸‰???Œë¦¬ê³??”ë¼???? ?°ë™ ???¬ê¸°??ë°œì†¡ ì²˜ë¦¬
    // ?„ì¬??ê°œë°œ ëª¨ë“œ?ì„œë§??ŒìŠ¤??ì½”ë“œë¥??‘ë‹µ?¼ë¡œ ?¸ì¶œ?©ë‹ˆ??
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
      return NextResponse.json({ success: true, message: "?¸ì¦ì½”ë“œë¥?ë°œì†¡?ˆìŠµ?ˆë‹¤." });
    }

    return NextResponse.json({
      success: true,
      message: "ê°œë°œ ëª¨ë“œ: ?ŒìŠ¤???¸ì¦ì½”ë“œë¥??•ì¸?˜ì„¸??",
      debugCode: code,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "?…ë ¥ê°’ì„ ?•ì¸?´ì£¼?¸ìš”.", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "?¸ì¦ì½”ë“œ ë°œì†¡ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤." }, { status: 500 });
  }
}
