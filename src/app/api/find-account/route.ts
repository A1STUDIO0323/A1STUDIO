import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizePhone, verifyOtp } from "@/lib/sms-otp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const code = searchParams.get("code");

    if (!phone || !code) {
      return NextResponse.json(
        { success: false, error: "전화번호와 인증번호를 입력해주세요" },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);

    const otpResult = verifyOtp(normalizedPhone, code);
    if (!otpResult.ok) {
      return NextResponse.json(
        { success: false, error: otpResult.error },
        { status: 400 }
      );
    }

    const users = await prisma.user.findMany({
      where: { phone: normalizedPhone },
      select: {
        email: true,
        provider: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: "해당 전화번호로 가입된 계정이 없습니다" },
        { status: 404 }
      );
    }

    const accounts = users.map((user) => ({
      email: maskEmail(user.email || ""),
      provider: user.provider || "email",
      createdAt: user.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      accounts,
    });
  } catch (error) {
    console.error("[find-account] 오류:", error);
    return NextResponse.json(
      { success: false, error: "계정 조회 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;

  if (local.length <= 2) {
    return `${local[0]}**@${domain}`;
  }

  const firstChar = local[0];
  const lastChar = local[local.length - 1];
  const masked = "*".repeat(Math.min(local.length - 2, 3));

  return `${firstChar}${masked}${lastChar}@${domain}`;
}
