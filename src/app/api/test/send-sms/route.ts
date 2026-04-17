import { NextRequest, NextResponse } from "next/server";
import { sendMessage, logMessage } from "@/lib/sms";
import { getPracticeRoomConfirmMessage } from "@/lib/message-templates";

/**
 * SMS 발송 테스트 API
 * POST /api/test/send-sms
 * 
 * Body:
 * {
 *   "guestName": "홍길동",
 *   "guestPhone": "01012345678",
 *   "date": "2026-04-15",
 *   "startTime": "14:00",
 *   "endTime": "16:00"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { guestName, guestPhone, date, startTime, endTime } = body;

    // 필수 필드 확인
    if (!guestName || !guestPhone || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "필수 필드가 누락되었습니다" },
        { status: 400 }
      );
    }

    // 메시지 생성
    const messageContent = getPracticeRoomConfirmMessage({
      guestName,
      guestPhone,
      date,
      startTime,
      endTime,
      roomType: 'practice',
    });

    console.log("=== SMS 테스트 발송 ===");
    console.log("수신자:", guestPhone);
    console.log("예약 정보:", { guestName, date, startTime, endTime });
    console.log("메시지 길이:", messageContent.length, "자");

    // SMS 발송
    const result = await sendMessage({
      to: guestPhone,
      text: messageContent,
    });

    // 로그 저장
    await logMessage({
      phoneNumber: guestPhone,
      messageType: 'reservation_confirm',
      content: messageContent,
      status: result.success ? 'success' : 'failed',
      errorMessage: result.error,
      messageId: result.messageId,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "메시지가 성공적으로 발송되었습니다",
        messageId: result.messageId,
        preview: messageContent.substring(0, 200) + "...",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("SMS 테스트 발송 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}
