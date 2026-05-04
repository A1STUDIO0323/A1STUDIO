/**
 * 요금 계산 유틸리티
 */

export type PriceType = 
  | "weekday_offpeak"    // 평일 00:00-18:00
  | "weekday_peak"       // 평일 18:00-00:00
  | "weekend_offpeak"    // 주말/공휴일 00:00-13:00
  | "weekend_peak";      // 주말/공휴일 13:00-00:00

// 연습실 요금표 (1시간 기준)
const PRICES = {
  weekday_offpeak:  { original: 9000,  event: 7000  },
  weekday_peak:     { original: 11000, event: 9000  },
  weekend_offpeak:  { original: 10000, event: 8000  },
  weekend_peak:     { original: 12000, event: 10000 },
};

// ================================
// 파티룸 전용 가격 로직 (연습실과 완전 별개)
// ================================

export type PartyRoomPackage = 'day' | 'night' | 'allday';
export type PartyRoomPriceType = 'peak' | 'off_peak';

// 패키지 시간 정의
export const PARTY_ROOM_PACKAGES = {
  day:    { start: '10:00', end: '17:00', hours: 7 },   // 낮 패키지
  night:  { start: '19:00', end: '07:00', hours: 12 },  // 야간 패키지 (익일 07:00)
  allday: { start: '10:00', end: '07:00', hours: 21 },  // 종일권 (익일 07:00)
} as const;

// 파티룸 가격표 (연습실 PRICES와 완전 별개)
// 오픈이벤트가 = 현재 비품 기준 (음악반응 조명만 제공)
// 정가 = 냉장고·노래방·보드게임 설치 완료 후 적용 예정
export const PARTY_ROOM_PRICES = {
  day: {
    off_peak: { 정가: 100000, 이벤트: 70000 },
    peak:     { 정가: 130000, 이벤트: 90000 },
  },
  night: {
    off_peak: { 정가: 140000, 이벤트: 100000 },
    peak:     { 정가: 160000, 이벤트: 120000 },
  },
  allday: {
    off_peak: { 정가: 210000, 이벤트: 150000 },
    peak:     { 정가: 250000, 이벤트: 180000 },
  },
};

export const PARTY_ROOM_MAX_HEADCOUNT = 10;

/**
 * 이벤트 기간 체크
 */
export function isEventPeriod(date: Date = new Date()): boolean {
  const eventStart = new Date("2026-04-08");
  // 이벤트 종료일 하드코딩 제거 - 항상 이벤트 가격 적용
  return date >= eventStart;
}

/**
 * 주말/공휴일 체크
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 일요일(0) 또는 토요일(6)
}

/**
 * 공휴일 체크 (기본 구현)
 * TODO: 향후 공휴일 데이터베이스 또는 외부 API 연동
 */
export function checkIsHoliday(date: Date): boolean {
  // 기본 공휴일 목록 (2026년 기준)
  const holidays = [
    '2026-01-01', // 신정
    '2026-02-16', '2026-02-17', '2026-02-18', // 설날
    '2026-03-01', // 삼일절
    '2026-05-05', // 어린이날
    '2026-05-24', // 부처님오신날
    '2026-06-06', // 현충일
    '2026-08-15', // 광복절
    '2026-09-28', '2026-09-29', '2026-09-30', // 추석
    '2026-10-03', // 개천절
    '2026-10-09', // 한글날
    '2026-12-25', // 크리스마스
  ];
  
  // 로컬 타임존 기준 YYYY-MM-DD (toISOString은 UTC라 KST 자정이 전날로 밀리는 버그 방지)
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;
  return holidays.includes(dateStr);
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

// ================================
// 파티룸 전용 로직
// ================================

/**
 * 파티룸 피크/비피크 판별
 * 기준: 패키지 시작 시간과 요일 기준으로 판별
 * 
 * 월·화·수·목: 전 시간 비피크
 * 금: 오전(00:00~12:00) 비피크 / 오후·심야(12:00~24:00) 피크
 * 토: 전 시간 피크
 * 일·공휴일: 오전·오후(00:00~18:00) 피크 / 심야(18:00~24:00) 비피크
 * 예외: 일·공휴일 심야(18:00~24:00)라도 다음날이 토·일·공휴일이면 피크 적용
 */
export function getPartyRoomPriceType(
  date: Date,
  packageType: PartyRoomPackage
): PartyRoomPriceType {
  const day = date.getDay(); // 0=일, 1=월, ..., 6=토
  const startHour = parseInt(PARTY_ROOM_PACKAGES[packageType].start.split(':')[0]);
  const isHoliday = checkIsHoliday(date);

  // 토요일: 전 시간 피크
  if (day === 6) return 'peak';

  // 금요일: 오전(시작 12시 이전) 비피크 / 오후·심야(12시 이후) 피크
  if (day === 5) {
    return startHour < 12 ? 'off_peak' : 'peak';
  }

  // 일요일 또는 공휴일
  if (day === 0 || isHoliday) {
    // 야간 패키지(19시 시작): 다음날도 토·일·공휴일이면 피크, 아니면 비피크
    if (packageType === 'night') {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayOfWeek = nextDay.getDay();
      const nextIsHoliday = checkIsHoliday(nextDay);
      const nextIsPeak = nextDayOfWeek === 0 || nextDayOfWeek === 6 || nextIsHoliday;
      return nextIsPeak ? 'peak' : 'off_peak';
    }
    // 낮·종일권: 피크
    return 'peak';
  }

  // 월~목: 전 시간 비피크
  return 'off_peak';
}

/**
 * 파티룸 포인트(가격) 계산
 */
export function calcPartyRoomPoints(
  date: Date,
  packageType: PartyRoomPackage
): {
  originalPrice: number;
  eventPrice: number;
  isEvent: boolean;
  priceType: PartyRoomPriceType;
} {
  const priceType = getPartyRoomPriceType(date, packageType);
  const isEvent = isEventPeriod(date);
  const prices = PARTY_ROOM_PRICES[packageType][priceType];
  
  return {
    originalPrice: prices.정가,
    eventPrice: prices.이벤트,
    isEvent,
    priceType,
  };
}
