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
      return NextResponse.json({ error: "휴대폰 번호 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const result = verifyOtp(phone, data.code);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값을 확인해주세요.", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "인증코드 확인 중 오류가 발생했습니다." }, { status: 500 });
  }
}
