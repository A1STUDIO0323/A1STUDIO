/**
 * 요금 계산 유틸리티
 */

export type PriceType =
  | "weekday_offpeak"    // 평일 00:00-18:00
  | "weekday_peak"       // 평일 18:00-00:00
  | "weekend_offpeak"    // 주말/공휴일 00:00-13:00
  | "weekend_peak";      // 주말/공휴일 13:00-00:00

// 연습실 시간당 요금
const PRICES = {
  weekday_offpeak:  { original: 9000,  event: 7000  },
  weekday_peak:     { original: 11000, event: 9000  },
  weekend_offpeak:  { original: 10000, event: 8000  },
  weekend_peak:     { original: 12000, event: 10000 },
};

// ================================
// 연습실 패키지
// ================================

export type StudioPackage = 'day' | 'night' | 'allday';

// 연습실 패키지 시간 정의 (모두 당일 종료, 익일 넘어감 없음)
export const STUDIO_PACKAGES = {
  day:    { start: '10:00', end: '17:00', hours: 7,  label: '데이 패키지'   },
  night:  { start: '00:00', end: '07:00', hours: 7,  label: '나잇 패키지'   },
  allday: { start: '10:00', end: '22:00', hours: 12, label: '올데이 패키지' },
} as const;

// 연습실 패키지 가격표 (평일 / 주말·공휴일)
// 공식: 시간제 요금 합산 - (총 이용시간 × 1,000원)
export const STUDIO_PACKAGE_PRICES = {
  day: {
    weekday: { original: 56000,  event: 42000  },
    weekend: { original: 71000,  event: 57000  },
  },
  night: {
    weekday: { original: 56000,  event: 42000  },
    weekend: { original: 63000,  event: 49000  },
  },
  allday: {
    weekday: { original: 104000, event: 80000  },
    weekend: { original: 126000, event: 102000 },
  },
} as const;

// 연습실 인원 기준
export const STUDIO_BASE_HEADCOUNT = 8;
export const STUDIO_EXTRA_PERSON_FEE = 10000; // 1인당 (1회성, 고객 인식용)

// ================================
// 파티룸
// ================================

export type PartyRoomPackage = 'day' | 'night' | 'allday';

// 데이/나잇: 2단계
export type PartyRoomDayNightPriceType = 'peak' | 'off_peak';

// 올데이: 4단계 조합형 (당일+익일)
// wd = weekday(평일), we = weekend(주말·공휴일)
export type PartyRoomAlldayPriceType = 'wd_wd' | 'wd_we' | 'we_wd' | 'we_we';

export type PartyRoomPriceType = PartyRoomDayNightPriceType | PartyRoomAlldayPriceType;

// 패키지 시간 정의
export const PARTY_ROOM_PACKAGES = {
  day:    { start: '10:00', end: '17:00', hours: 7  },  // 데이 패키지
  night:  { start: '19:00', end: '07:00', hours: 12 },  // 나잇 패키지 (익일 07:00)
  allday: { start: '10:00', end: '07:00', hours: 21 },  // 올데이 패키지 (익일 07:00)
} as const;

// 파티룸 가격표
// 데이/나잇은 2단계, 올데이는 당일+익일 조합 4단계
export const PARTY_ROOM_PRICES = {
  day: {
    off_peak: { 정가: 100000, 이벤트: 70000 },
    peak:     { 정가: 130000, 이벤트: 90000 },
  },
  night: {
    off_peak: { 정가: 140000, 이벤트: 100000 },
    peak:     { 정가: 160000, 이벤트: 120000 },
  },
  // 올데이 = (데이 + 나잇 합산) × 0.9 (10% 할인)
  allday: {
    wd_wd: { 정가: 216000, 이벤트: 153000 },
    wd_we: { 정가: 234000, 이벤트: 171000 },
    we_wd: { 정가: 243000, 이벤트: 171000 },
    we_we: { 정가: 261000, 이벤트: 189000 },
  },
} as const;

export const PARTY_ROOM_BASE_HEADCOUNT = 10;
export const PARTY_ROOM_EXTRA_PERSON_FEE = 10000; // 1인당 (1회성, 고객 인식용)

// 하위 호환: 기존 코드에서 import 중
export const PARTY_ROOM_MAX_HEADCOUNT = PARTY_ROOM_BASE_HEADCOUNT;

/**
 * 이벤트 기간 체크
 */
export function isEventPeriod(date: Date = new Date()): boolean {
  const eventStart = new Date("2026-04-08");
  return date >= eventStart;
}

/**
 * 주말 체크
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * 한국 임시공휴일 (정부 임시 지정 — 패키지 반영 전까지 직접 추가)
 *
 * 예: 대통령 선거일, 국회의원 선거일, 임시공휴일 지정일
 * date-holidays 패키지가 자동 반영하지 않으면 여기에 'YYYY-MM-DD' 형식으로 추가.
 * 정식 법정공휴일·대체공휴일은 패키지가 처리하므로 여기에 넣지 말 것.
 */
const EXTRA_KR_HOLIDAYS: string[] = [
  // 예시: '2027-04-15', // 22대 국회의원 선거 (가상)
];

// date-holidays 인스턴스 — 모듈 로드 시 1회 생성 (가벼움)
import Holidays from "date-holidays";
const krHolidays = new Holidays("KR");

/**
 * 대체공휴일 대상 공휴일명 (date-holidays 패키지의 한국어 name 기준)
 * - 현충일은 대체공휴일 대상 아님 (2021년 확대에서도 제외)
 * - 신정도 대상 아님
 */
const SUBSTITUTE_TARGET_NAMES = new Set<string>([
  "어린이날",
  "석가탄신일",
  "성탄절",
  "설날",
  "추석",
  "3·1절",
  "광복절",
  "개천절",
  "한글날",
]);

/**
 * 한국 대체공휴일 판정
 *
 * 규칙: 대체 대상 공휴일이 주말(토·일)과 겹치거나 다른 공휴일과 겹치면,
 *       그 직후 첫 평일을 대체공휴일로 지정.
 *
 * 알고리즘: date(평일)에서 거꾸로 1일씩 거슬러 올라가며,
 *   - 평일·非공휴일을 만나면 체인 종료
 *   - 주말 또는 공휴일이 이어지는 동안 트리거(주말+대상공휴일 / 대상공휴일+대상공휴일 겹침) 검출
 */
function isKoreanSubstituteHoliday(date: Date): boolean {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return false; // 주말은 대체공휴일 후보 아님

  // date 자체가 본 공휴일이면 대체공휴일 아님
  const todayResult = krHolidays.isHoliday(date);
  if (todayResult && todayResult.some((h) => h.type === "public")) return false;

  for (let back = 1; back <= 9; back++) {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - back);
    const prevDow = prev.getDay();
    const prevResult = krHolidays.isHoliday(prev);
    const prevPublics = prevResult ? prevResult.filter((h) => h.type === "public") : [];
    const prevIsPublic = prevPublics.length > 0;
    const prevIsWeekend = prevDow === 0 || prevDow === 6;

    if (!prevIsWeekend && !prevIsPublic) break; // 체인 끊김

    if (prevIsPublic) {
      const targets = prevPublics.filter((h) => SUBSTITUTE_TARGET_NAMES.has(h.name));
      // 대상 공휴일이 주말에 떨어짐 → trigger
      if (targets.length >= 1 && prevIsWeekend) return true;
      // 대상 공휴일이 다른 공휴일과 겹침 → trigger
      if (targets.length >= 1 && prevPublics.length >= 2) return true;
    }
  }

  return false;
}

/**
 * 공휴일 체크
 * - 법정공휴일: date-holidays 패키지 (음력 기반 설/추석/부처님오신날 자동)
 * - 대체공휴일: isKoreanSubstituteHoliday (패키지 미지원분 자체 계산)
 * - 임시공휴일: EXTRA_KR_HOLIDAYS 보조 배열
 */
export function checkIsHoliday(date: Date): boolean {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  if (EXTRA_KR_HOLIDAYS.includes(dateStr)) return true;

  const result = krHolidays.isHoliday(date);
  if (result && result.some((h) => h.type === "public")) return true;

  return isKoreanSubstituteHoliday(date);
}

/**
 * 주말 또는 공휴일
 */
export function isWeekendOrHoliday(date: Date): boolean {
  return isWeekend(date) || checkIsHoliday(date);
}

/**
 * 날짜/시간 → price_type 판별 (시간제)
 */
export function getPriceType(date: Date, startHour: number): PriceType {
  const weekend = isWeekendOrHoliday(date);

  if (weekend) {
    return startHour < 13 ? "weekend_offpeak" : "weekend_peak";
  } else {
    return startHour < 18 ? "weekday_offpeak" : "weekday_peak";
  }
}

/**
 * price_type + 시간 → 포인트 계산 (단일 요율, 이벤트 기간 자동 적용)
 * 주의: 시간대가 피크/비피크 경계를 넘는 경우엔 calcHourlyMixed를 사용해야 함
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
 * 시작~종료 시간을 시간대별로 쪼개서 정확한 합계 계산
 * 18시(평일) / 13시(주말) 경계를 넘는 예약을 올바르게 처리
 */
export function calcHourlyMixed(
  date: Date,
  startTime: string,
  endTime: string,
  endsNextDay: boolean = false
): {
  originalPrice: number;
  eventPrice: number;
  isEvent: boolean;
  duration: number;
  breakdown: { priceType: PriceType; hours: number; originalPrice: number; eventPrice: number }[];
} {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const startMin = sh * 60 + (sm || 0);
  // 자정 넘김 예약: 종료가 익일이면 endMin 에 1440 분(24시간) 추가
  // 안전 가드: endsNextDay=false 인데 endMin <= startMin 이면 같은 의미로 처리
  let endMin = eh * 60 + (em || 0);
  if (endsNextDay || endMin <= startMin) {
    endMin += 1440;
  }

  const isEvent = isEventPeriod(date);
  let originalPrice = 0;
  let eventPrice = 0;
  const breakdown: { priceType: PriceType; hours: number; originalPrice: number; eventPrice: number }[] = [];

  let cursor = startMin;
  while (cursor < endMin) {
    const absoluteHour = Math.floor(cursor / 60);
    // 자정 넘김 구간은 hour 가 24~30 이 될 수 있음 → 가격 분류는 (hour % 24) 기준
    const hour = absoluteHour % 24;
    const nextBoundary = (absoluteHour + 1) * 60;
    const segEnd = Math.min(nextBoundary, endMin);
    const segHours = (segEnd - cursor) / 60;
    const priceType = getPriceType(date, hour);
    const orig = PRICES[priceType].original * segHours;
    const evt = PRICES[priceType].event * segHours;

    originalPrice += orig;
    eventPrice += evt;

    const last = breakdown[breakdown.length - 1];
    if (last && last.priceType === priceType) {
      last.hours += segHours;
      last.originalPrice += orig;
      last.eventPrice += evt;
    } else {
      breakdown.push({ priceType, hours: segHours, originalPrice: orig, eventPrice: evt });
    }

    cursor = segEnd;
  }

  return {
    originalPrice,
    eventPrice,
    isEvent,
    duration: (endMin - startMin) / 60,
    breakdown,
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
  return durationMinutes / 60;
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
// 연습실 패키지 가격 계산
// ================================

/**
 * 연습실 패키지 가격 계산
 * - 평일/주말·공휴일 구분만 사용 (피크/비피크 표기 X)
 * - 단, 가격은 시간대 피크/비피크가 반영된 합산가에서 시간당 1,000원 할인
 */
export function calcStudioPackagePoints(
  date: Date,
  packageType: StudioPackage
): {
  originalPrice: number;
  eventPrice: number;
  isEvent: boolean;
  dayType: 'weekday' | 'weekend';
  packageType: StudioPackage;
} {
  const dayType = isWeekendOrHoliday(date) ? 'weekend' : 'weekday';
  const isEvent = isEventPeriod(date);
  const prices = STUDIO_PACKAGE_PRICES[packageType][dayType];

  return {
    originalPrice: prices.original,
    eventPrice: prices.event,
    isEvent,
    dayType,
    packageType,
  };
}

// ================================
// 파티룸 피크/비피크 판별 (신규 정책)
// ================================

/**
 * 파티룸 피크/비피크 판별
 *
 * 데이 패키지: 이용 당일 기준 (평일 → off_peak, 주말·공휴일 → peak)
 * 나잇 패키지: 익일 기준 (평일 → off_peak, 주말·공휴일 → peak)
 * 올데이 패키지: 당일·익일 조합 4단계 (wd_wd / wd_we / we_wd / we_we)
 */
export function getPartyRoomPriceType(
  date: Date,
  packageType: PartyRoomPackage
): PartyRoomPriceType {
  const todayWE = isWeekendOrHoliday(date);

  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayWE = isWeekendOrHoliday(nextDay);

  if (packageType === 'day') {
    return todayWE ? 'peak' : 'off_peak';
  }

  if (packageType === 'night') {
    return nextDayWE ? 'peak' : 'off_peak';
  }

  // allday: 당일+익일 조합
  if (!todayWE && !nextDayWE) return 'wd_wd';
  if (!todayWE && nextDayWE)  return 'wd_we';
  if (todayWE && !nextDayWE)  return 'we_wd';
  return 'we_we';
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

  let prices: { 정가: number; 이벤트: number };
  if (packageType === 'allday') {
    prices = PARTY_ROOM_PRICES.allday[priceType as PartyRoomAlldayPriceType];
  } else {
    prices = PARTY_ROOM_PRICES[packageType][priceType as PartyRoomDayNightPriceType];
  }

  return {
    originalPrice: prices.정가,
    eventPrice: prices.이벤트,
    isEvent,
    priceType,
  };
}
