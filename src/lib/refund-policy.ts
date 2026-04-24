/**
 * 예약 취소 환불 규정 (연습실 / 파티룸)
 */

/** 연습실 환불 비율 (정책 문서·UI용) */
export const PRACTICE_ROOM_REFUND_POLICY = {
  twoDaysBefore: 0.5,
  oneDayBefore: 0,
  sameDay: 0,
} as const;

/** 파티룸 환불 비율 (정책 문서·UI용) */
export const PARTY_ROOM_REFUND_POLICY = {
  sevenDaysBefore: 1.0,
  threeDaysBefore: 0.5,
  withinThreeDays: 0,
} as const;

/**
 * 레거시: “최소 며칠 전까지 취소 가능” 등과 맞추기 위한 힌트 (시간 단위)
 * 실제 취소 가능 여부는 `canCancelReservation`의 일수 규칙을 따름.
 */
export const REFUND_POLICY = {
  cancellationDeadlineHours: 48,
} as const;

/**
 * 연습실 취소 환불율 계산
 * - 이용 시작 시각 기준 **2일(48시간) 이상** 남았으면 50% 환불
 * - 그 외(전날·당일 구간): 환불율 0% (취소 자체는 `canCancelReservation`에서 2일 미만이면 차단)
 */
export function calculatePracticeRoomRefundRate(reservationDateTime: Date): {
  refundRate: number;
  description: string;
} {
  const now = new Date();
  const diffMs = reservationDateTime.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays >= 2) {
    return {
      refundRate: PRACTICE_ROOM_REFUND_POLICY.twoDaysBefore,
      description: "이용 2일 전 취소: 50% 환불",
    };
  }

  return {
    refundRate: 0,
    description: "이용 전날 및 당일: 환불 불가",
  };
}

/**
 * 연습실 환불 금액 (포인트 = 원화 동일 단위)
 */
export function calculatePracticeRoomRefund(
  reservationDateTime: Date,
  totalAmount: number
): { refundRate: number; refundAmount: number; reason: string } {
  const { refundRate, description } =
    calculatePracticeRoomRefundRate(reservationDateTime);
  return {
    refundRate,
    refundAmount: Math.floor(totalAmount * refundRate),
    reason: description,
  };
}

/**
 * 파티룸 취소 환불율 계산
 * - 7일 이상 전: 100%
 * - 3일 이상 ~ 7일 미만: 50%
 * - 3일 미만: 0%
 */
export function calculatePartyRoomRefundRate(reservationDateTime: Date): {
  refundRate: number;
  description: string;
} {
  const now = new Date();
  const diffMs = reservationDateTime.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays >= 7) {
    return {
      refundRate: PARTY_ROOM_REFUND_POLICY.sevenDaysBefore,
      description: "7일 전까지 취소: 전액 환불",
    };
  }

  if (diffDays >= 3) {
    return {
      refundRate: PARTY_ROOM_REFUND_POLICY.threeDaysBefore,
      description: "3일 전까지 취소: 50% 환불",
    };
  }

  return {
    refundRate: PARTY_ROOM_REFUND_POLICY.withinThreeDays,
    description: "3일 이내 취소: 환불 불가",
  };
}

/**
 * 파티룸 환불 금액
 */
export function calculatePartyRoomRefund(
  reservationDateTime: Date,
  totalAmount: number
): { refundRate: number; refundAmount: number; reason: string } {
  const { refundRate, description } =
    calculatePartyRoomRefundRate(reservationDateTime);
  return {
    refundRate,
    refundAmount: Math.floor(totalAmount * refundRate),
    reason: description,
  };
}

/**
 * 취소 가능 여부 확인
 * @param reservationDateTime 예약 시작 일시
 * @param roomType 예약 타입
 */
export function canCancelReservation(
  reservationDateTime: Date,
  roomType: "practice" | "party"
): {
  canCancel: boolean;
  message: string;
} {
  const now = new Date();
  const diffMs = reservationDateTime.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (roomType === "practice") {
    if (diffDays < 2) {
      return {
        canCancel: false,
        message:
          "이용 2일 전까지만 취소할 수 있습니다. (전날·당일 취소 및 환불 불가)",
      };
    }

    return {
      canCancel: true,
      message: "취소 가능",
    };
  }

  if (diffDays < 3) {
    return {
      canCancel: false,
      message: "취소 불가 기간입니다. (이용 시작 3일 이내)",
    };
  }

  return {
    canCancel: true,
    message: "취소 가능",
  };
}
