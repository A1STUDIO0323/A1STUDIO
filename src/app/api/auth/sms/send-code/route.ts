import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOtp, isValidKoreanMobile, normalizePhone } from "@/lib/sms-otp";
import { sendSMS } from "@/lib/sms";

export const dynamic = 'force-dynamic';

const sendCodeSchema = z.object({
  phone: z.string().min(10),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = sendCodeSchema.parse(body);
    const phone = normalizePhone(data.phone);

    if (!isValidKoreanMobile(phone)) {
      return NextResponse.json({ error: "전화번호 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const code = createOtp(phone);

    const result = await sendSMS({
      to: phone,
      text: `[A1 STUDIO] 인증번호는 [${code}]입니다. 3분 내에 입력해주세요.`,
    });

    if (!result.success) {
      console.error("[send-code] SMS 발송 실패:", result.error);
      return NextResponse.json({ error: "인증코드 발송에 실패했습니다. 다시 시도해주세요." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "인증코드가 발송되었습니다." });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값을 확인해주세요.", details: err.issues }, { status: 400 });
    }
    console.error("[send-code] 오류:", err);
    return NextResponse.json({ error: "인증코드 발송 중 오류가 발생했습니다." }, { status: 500 });
  }
}
