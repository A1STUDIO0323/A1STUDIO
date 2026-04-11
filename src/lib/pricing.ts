/**
 * 요금 계산 유틸리티
 */

export type PriceType = 
  | "weekday_offpeak"    // 평일 00:00-18:00
  | "weekday_peak"       // 평일 18:00-00:00
  | "weekend_offpeak"    // 주말/공휴일 00:00-13:00
  | "weekend_peak";      // 주말/공휴일 13:00-00:00

// 요금표 (1시간 기준, 이벤트가 기준)
const PRICES = {
  weekday_offpeak:  { original: 9000,  event: 7000  },
  weekday_peak:     { original: 11000, event: 9000  },
  weekend_offpeak:  { original: 10000, event: 8000  },
  weekend_peak:     { original: 12000, event: 10000 },
};

/**
 * 이벤트 기간 체크
 */
export function isEventPeriod(date: Date = new Date()): boolean {
  const eventStart = new Date("2026-04-08");
  const eventEnd = new Date("2026-04-30");
  eventEnd.setHours(23, 59, 59, 999);
  
  return date >= eventStart && date <= eventEnd;
}

/**
 * 주말/공휴일 체크
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 일요일(0) 또는 토요일(6)
}

/**
 * 날짜/시간 → price_type 판별
 */
export function getPriceType(date: Date, startHour: number): PriceType {
  const weekend = isWeekend(date);
  
  if (weekend) {
    // 주말/공휴일
    if (startHour < 13) {
      return "weekend_offpeak";
    } else {
      return "weekend_peak";
    }
  } else {
    // 평일
    if (startHour < 18) {
      return "weekday_offpeak";
    } else {
      return "weekday_peak";
    }
  }
}

/**
 * price_type + 시간 → 포인트 계산 (이벤트 기간 자동 적용)
 */
export function calcPoints(
  priceType: PriceType,
  hours: number,
  date: Date = new Date()
): {
  originalPrice: number;
  eventPrice: number;
  isEvent: boolean;
  pricePerHour: number;
} {
  const pricing = PRICES[priceType];
  const isEvent = isEventPeriod(date);
  const pricePerHour = isEvent ? pricing.event : pricing.original;
  
  return {
    originalPrice: pricing.original * hours,
    eventPrice: pricing.event * hours,
    isEvent,
    pricePerHour,
  };
}

/**
 * 시간 문자열 → 시간(숫자) 변환
 */
export function timeToHour(timeStr: string): number {
  const [hour] = timeStr.split(":").map(Number);
  return hour;
}

/**
 * 시작/종료 시간 → 이용 시간(시간) 계산
 */
export function calcDuration(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  const durationMinutes = endMinutes - startMinutes;
  return durationMinutes / 60; // 시간 단위로 반환
}

/**
 * 가격 타입 한글명
 */
export function getPriceTypeName(priceType: PriceType): string {
  const names: Record<PriceType, string> = {
    weekday_offpeak: "평일 비피크",
    weekday_peak: "평일 피크타임",
    weekend_offpeak: "주말/공휴일 비피크",
    weekend_peak: "주말/공휴일 피크타임",
  };
  return names[priceType];
}
