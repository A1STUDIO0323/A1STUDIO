/**
 * 예약 취소 환불 규정 (연습실 / 파티룸)
 * 일수 비교는 **달력 날짜 기준**(시각은 무시)입니다.
 */

/** 연습실 환불 비율 (정책 문서·UI용) */
export const PRACTICE_ROOM_REFUND_POLICY = {
  threeDaysBefore: 1.0,
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
 * 실제 취소·환불은 `getDaysDifference` / `canCancelReservation` 기준.
 */
export const REFUND_POLICY = {
  cancellationDeadlineHours: 48,
} as const;

export type CancelRoomType =
  | "practice"
  | "party"
  | "practice-room"
  | "party-room";

/**
 * 두 시각이 가리키는 **달력 날짜** 사이의 일수 차이 (미래 − 현재)
 * @param futureDate 예약일(시) 등 — 날짜 부분만 사용
 * @param currentDate 기준일(기본: 지금)
 */
export function getDaysDifference(
  futureDate: Date,
  currentDate: Date = new Date()
): number {
  const futureDateOnly = new Date(futureDate);
  futureDateOnly.setHours(0, 0, 0, 0);

  const currentDateOnly = new Date(currentDate);
  currentDateOnly.setHours(0, 0, 0, 0);

  const diffMs = futureDateOnly.getTime() - currentDateOnly.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function normalizeRoomType(roomType: CancelRoomType): "practice" | "party" {
  if (roomType === "party" || roomType === "party-room") return "party";
  return "practice";
}

/**
 * 연습실 취소 환불율 (예약 **날짜** 기준)
 * - 3일 이상 차이: 100% · 2일 차이: 50% · 전날·당일: 0% (취소는 `canCancelReservation`으로 차단)
 */
export function calculatePracticeRoomRefundRate(reservationDateTime: Date): {
  refundRate: number;
  description: string;
} {
  const diffDays = getDaysDifference(reservationDateTime);

  if (diffDays >= 3) {
    return {
      refundRate: PRACTICE_ROOM_REFUND_POLICY.threeDaysBefore,
      description: "이용 3일 전 취소 (전액 환불)",
    };
  }

  if (diffDays === 2) {
    return {
      refundRate: PRACTICE_ROOM_REFUND_POLICY.twoDaysBefore,
      description: "이용 2일 전 취소 (50% 환불)",
    };
  }

  if (diffDays === 1) {
    return {
      refundRate: PRACTICE_ROOM_REFUND_POLICY.oneDayBefore,
      description: "이용 전날은 취소가 불가능합니다",
    };
  }

  return {
    refundRate: PRACTICE_ROOM_REFUND_POLICY.sameDay,
    description: "이용 당일은 취소가 불가능합니다",
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
  const refundAmount =
    refundRate === PRACTICE_ROOM_REFUND_POLICY.threeDaysBefore
      ? totalAmount
      : Math.floor(totalAmount * refundRate);
  return {
    refundRate,
    refundAmount,
    reason: description,
  };
}

/**
 * 파티룸 취소 환불율 (예약 **날짜** 기준)
 * - 7일 이상: 100% · 3~6일: 50% · 3일 미만: 취소 불가 구간(율 0)
 */
export function calculatePartyRoomRefundRate(reservationDateTime: Date): {
  refundRate: number;
  description: string;
} {
  const diffDays = getDaysDifference(reservationDateTime);

  if (diffDays >= 7) {
    return {
      refundRate: PARTY_ROOM_REFUND_POLICY.sevenDaysBefore,
      description: "7일 전 취소 (전액 환불)",
    };
  }

  if (diffDays >= 3) {
    return {
      refundRate: PARTY_ROOM_REFUND_POLICY.threeDaysBefore,
      description: "3일 전 취소 (50% 환불)",
    };
  }

  return {
    refundRate: PARTY_ROOM_REFUND_POLICY.withinThreeDays,
    description: "3일 이내는 취소가 불가능합니다",
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
  const refundAmount =
    refundRate === PARTY_ROOM_REFUND_POLICY.sevenDaysBefore
      ? totalAmount
      : Math.floor(totalAmount * refundRate);
  return {
    refundRate,
    refundAmount,
    reason: description,
  };
}

/**
 * 예약 취소 가능 여부 (달력 날짜 기준)
 */
export function canCancelReservation(
  reservationDate: Date,
  roomType: CancelRoomType
): {
  canCancel: boolean;
  message: string;
} {
  const kind = normalizeRoomType(roomType);
  const diffDays = getDaysDifference(reservationDate);

  if (kind === "practice") {
    if (diffDays < 2) {
      return {
        canCancel: false,
        message: "전날·당일에는 취소가 불가능합니다.",
      };
    }
    return { canCancel: true, message: "취소 가능" };
  }

  if (diffDays < 3) {
    return {
      canCancel: false,
      message: "3일 이내에는 취소가 불가능합니다.",
    };
  }

  return { canCancel: true, message: "취소 가능" };
}
