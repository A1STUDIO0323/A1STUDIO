export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isValidKoreanMobile, normalizePhone, verifyOtp } from "@/lib/sms-otp";

const verifyCodeSchema = z.object({
  phone: z.string().min(10),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = verifyCodeSchema.parse(body);
    const phone = normalizePhone(data.phone);

    if (!isValidKoreanMobile(phone)) {
      return NextResponse.json({ error: "?´ë???ë²ˆí˜¸ ?•ì‹???¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤." }, { status: 400 });
    }

    const result = verifyOtp(phone, data.code);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "?…ë ¥ê°’ì„ ?•ì¸?´ì£¼?¸ìš”.", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "?¸ì¦ì½”ë“œ ?•ì¸ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤." }, { status: 500 });
  }
}
