/**
 * 카카오페이 + 자체 결제 흐름의 에러 사유를 사용자 친화적 한국어 메시지로 매핑.
 * 호출부는 이 함수의 반환값을 그대로 사용자에게 노출해도 안전.
 */

export type PaymentErrorReason =
  // 카카오페이 API 응답 (kapi.kakaopay.com)
  | "kakao_invalid_request"        // 요청 파라미터 오류
  | "kakao_invalid_tid"            // TID 불일치/만료
  | "kakao_payment_canceled"       // 사용자가 결제창에서 취소
  | "kakao_payment_failed"         // 카드사/은행 거절
  | "kakao_payment_timeout"        // 결제 시간 초과
  | "kakao_insufficient_balance"   // 잔액/한도 부족
  | "kakao_password_failed"        // 결제 비밀번호 인증 실패
  | "kakao_card_invalid"           // 카드 인증 실패
  | "kakao_already_processed"      // 이미 승인된 거래 (멱등성)
  | "kakao_merchant_error"         // 가맹점 설정 오류
  | "kakao_network_error"          // 카카오페이 서버 통신 실패
  // 시간 슬롯/예약 무결성
  | "slot_already_booked"          // 같은 시간 다른 사용자 예약
  | "slot_unavailable"             // 운영시간 외 / 휴무일
  | "reservation_expired"          // 예약 정보 만료 (HOLD timeout 등)
  // 동시성/락
  | "payment_in_progress"          // 한 사용자가 동시 결제 시도
  | "lock_acquire_failed"          // 락 시스템 오류
  // 포인트
  | "insufficient_points"          // 포인트 부족
  | "points_deduct_failed"         // 포인트 차감 RPC 실패
  | "points_refund_failed"         // 환불 실패 (관리자 수동 처리 큐 적재)
  // 인증
  | "auth_required"                // 비로그인
  | "auth_expired"                 // 세션 만료
  | "phone_not_verified"           // 휴대폰 미인증
  // 일반/서버
  | "validation_failed"            // 입력값 검증 실패
  | "server_error"                 // 500
  | "unknown";

const MESSAGE_MAP: Record<PaymentErrorReason, string> = {
  kakao_invalid_request: "결제 실패: 요청 정보가 올바르지 않습니다.",
  kakao_invalid_tid: "결제 실패: 결제 세션이 만료되었거나 일치하지 않습니다. 다시 시도해주세요.",
  kakao_payment_canceled: "결제 취소: 결제창에서 취소되었습니다.",
  kakao_payment_failed: "결제 실패: 결제 승인이 거절되었습니다.",
  kakao_payment_timeout: "결제 실패: 결제 시간이 초과되었습니다.",
  kakao_insufficient_balance: "결제 실패: 잔액 또는 한도가 부족합니다.",
  kakao_password_failed: "결제 실패: 결제 비밀번호 인증에 실패했습니다.",
  kakao_card_invalid: "결제 실패: 카드 인증에 실패했습니다.",
  kakao_already_processed: "결제 실패: 이미 처리된 결제입니다.",
  kakao_merchant_error: "결제 실패: 가맹점 설정 오류입니다. 관리자에게 문의해주세요.",
  kakao_network_error: "결제 실패: 카카오페이 서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.",

  slot_already_booked: "결제 실패: 이미 같은 시간 예약이 존재합니다.",
  slot_unavailable: "결제 실패: 선택하신 시간은 예약할 수 없습니다.",
  reservation_expired: "결제 실패: 예약 정보가 만료되었습니다. 처음부터 다시 진행해주세요.",

  payment_in_progress: "결제 실패: 이미 진행 중인 결제가 있습니다. 잠시 후 다시 시도해주세요.",
  lock_acquire_failed: "결제 실패: 결제 처리 중 일시적 오류가 발생했습니다.",

  insufficient_points: "결제 실패: 포인트가 부족합니다.",
  points_deduct_failed: "결제 실패: 포인트 차감에 실패했습니다.",
  points_refund_failed: "환불 처리가 지연되고 있습니다. 운영팀이 곧 확인합니다.",

  auth_required: "결제 실패: 로그인이 필요합니다.",
  auth_expired: "결제 실패: 인증 정보가 만료되었습니다. 다시 로그인해주세요.",
  phone_not_verified: "결제 실패: 휴대폰 본인인증이 필요합니다.",

  validation_failed: "결제 실패: 입력 정보가 올바르지 않습니다.",
  server_error: "결제 실패: 서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  unknown: "결제 실패: 알 수 없는 오류가 발생했습니다.",
};

export function getPaymentErrorMessage(reason: PaymentErrorReason): string {
  return MESSAGE_MAP[reason] ?? MESSAGE_MAP.unknown;
}

/**
 * 카카오페이 API 응답(JSON 또는 에러 객체)을 PaymentErrorReason으로 매핑.
 * 카카오페이는 표준 코드가 명확히 공개되어 있지 않으므로
 * error_code / error_message / status를 휴리스틱으로 분류한다.
 */
export function classifyKakaoPayError(input: {
  status?: number;
  errorCode?: string | number | null;
  errorMessage?: string | null;
}): PaymentErrorReason {
  const code = String(input.errorCode ?? "").toLowerCase();
  const msg = (input.errorMessage ?? "").toLowerCase();

  if (input.status === 401 || input.status === 403) return "kakao_merchant_error";
  if (input.status && input.status >= 500) return "kakao_network_error";

  if (code.includes("invalid_tid") || msg.includes("tid")) return "kakao_invalid_tid";
  if (code.includes("cancel") || msg.includes("취소") || msg.includes("cancel"))
    return "kakao_payment_canceled";
  if (code.includes("timeout") || msg.includes("시간") || msg.includes("timeout"))
    return "kakao_payment_timeout";
  if (msg.includes("잔액") || msg.includes("한도") || msg.includes("insufficient"))
    return "kakao_insufficient_balance";
  if (msg.includes("비밀번호") || msg.includes("password"))
    return "kakao_password_failed";
  if (msg.includes("카드") || msg.includes("card")) return "kakao_card_invalid";
  if (msg.includes("이미") || msg.includes("already") || msg.includes("duplicate"))
    return "kakao_already_processed";
  if (msg.includes("거절") || msg.includes("rejected") || msg.includes("denied"))
    return "kakao_payment_failed";
  if (input.status === 400) return "kakao_invalid_request";

  return "kakao_payment_failed";
}

/** readyPayment/readyPracticeRoom 등에서 throw된 Error.message(JSON 포함) 분류 보조 */
export function reasonFromCaughtKakaoError(error: unknown): PaymentErrorReason {
  if (error instanceof TypeError) return "kakao_network_error";
  if (!(error instanceof Error)) return "server_error";
  const m = error.message;
  if (/failed to fetch|networkerror|load failed/i.test(m)) return "kakao_network_error";
  const brace = m.indexOf("{");
  if (brace !== -1) {
    try {
      const j = JSON.parse(m.slice(brace)) as Record<string, unknown>;
      const em =
        typeof j.msg === "string"
          ? j.msg
          : typeof j.message === "string"
            ? j.message
            : m;
      return classifyKakaoPayError({
        status: typeof j.status === "number" ? j.status : undefined,
        errorCode: (j.error_code ?? j.code) as string | undefined,
        errorMessage: em,
      });
    } catch {
      return classifyKakaoPayError({ errorMessage: m });
    }
  }
  return classifyKakaoPayError({ errorMessage: m });
}
