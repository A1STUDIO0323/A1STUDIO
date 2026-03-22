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
      return NextResponse.json({ error: "휴대폰 번호 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const code = createOtp(phone);

    // TODO: 실제 SMS 공급자(알리고/솔라피 등) 연동 시 여기서 발송 처리
    // 현재는 개발 모드에서만 테스트 코드를 응답으로 노출합니다.
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
      return NextResponse.json({ success: true, message: "인증코드를 발송했습니다." });
    }

    return NextResponse.json({
      success: true,
      message: "개발 모드: 테스트 인증코드를 확인하세요.",
      debugCode: code,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "입력값을 확인해주세요.", details: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "인증코드 발송 중 오류가 발생했습니다." }, { status: 500 });
  }
}
