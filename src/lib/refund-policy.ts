/**
 * 예약 취소 환불 규정
 */

/**
 * 연습실 취소 환불율 계산
 * @param reservationDateTime 예약 시작 일시
 * @returns 환불율 (0.0 ~ 1.0)
 */
export function calculatePracticeRoomRefundRate(reservationDateTime: Date): {
  refundRate: number;
  description: string;
} {
  const now = new Date();
  const diffMs = reservationDateTime.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // 3일 이상 전: 전액 환불
  if (diffDays >= 3) {
    return {
      refundRate: 1.0,
      description: '이용 3일 이상 전 취소: 전액 환불',
    };
  }

  // 2일 전: 50% 환불
  if (diffDays >= 2) {
    return {
      refundRate: 0.5,
      description: '이용 2일 전 취소: 50% 환불',
    };
  }

  // 전날 및 당일: 환불 불가
  return {
    refundRate: 0,
    description: '이용 전날 및 당일: 환불 불가',
  };
}

/**
 * 파티룸 취소 환불율 계산
 * @param reservationDateTime 예약 시작 일시
 * @returns 환불율 (0.0 ~ 1.0)
 */
export function calculatePartyRoomRefundRate(reservationDateTime: Date): {
  refundRate: number;
  description: string;
} {
  const now = new Date();
  const diffMs = reservationDateTime.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // 7일 이상 전: 전액 환불
  if (diffDays >= 7) {
    return {
      refundRate: 1.0,
      description: '7일 전 취소: 전액 환불',
    };
  }

  // 3~7일 전: 50% 환불
  if (diffDays >= 3) {
    return {
      refundRate: 0.5,
      description: '3~7일 전 취소: 50% 환불',
    };
  }

  // 3일 이내: 환불 불가
  return {
    refundRate: 0,
    description: '3일 이내 취소: 환불 불가',
  };
}

/**
 * 취소 가능 여부 확인
 * @param reservationDateTime 예약 시작 일시
 * @param roomType 예약 타입
 * @returns 취소 가능 여부 및 메시지
 */
export function canCancelReservation(
  reservationDateTime: Date,
  roomType: 'practice' | 'party'
): {
  canCancel: boolean;
  message: string;
} {
  const now = new Date();
  const diffMs = reservationDateTime.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (roomType === 'practice') {
    // 연습실: 2일 전까지 취소 가능
    if (diffDays < 2) {
      return {
        canCancel: false,
        message: '이용 2일 전까지만 취소 가능합니다 (전날 및 당일 취소 불가)',
      };
    }
    
    return {
      canCancel: true,
      message: '취소 가능',
    };
  } else {
    // 파티룸: 3일 전까지 취소 가능
    if (diffDays < 3) {
      return {
        canCancel: false,
        message: '취소 불가 기간입니다 (이용 시작 3일 이내)',
      };
    }
    
    return {
      canCancel: true,
      message: '취소 가능',
    };
  }
}
