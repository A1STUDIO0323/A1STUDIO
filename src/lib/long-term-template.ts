/**
 * 장기대관 안내문 템플릿 빌더
 * - buildPaymentNoticeText: 요금 안내문 (등록 직후 즉시 발송)
 * - buildUsageNoticeText: 이용안내문 (이용일 당일 아침 10시 예약 발송)
 * - computeLongTermBreakdown: 연습실 시간대(피크/비피크) 혼합 시 정확한 합산
 *
 * 메시지는 LMS(장문) 전제. 줄바꿈/이모지 보존.
 */

import { calcHourlyMixed, getPriceTypeName, type PriceType } from "@/lib/pricing";

export type LongTermBookingForTemplate = {
  customerName: string;
  customerPhone: string;
  dayOfWeek?: string | null;
  usageMonth: string;
  usageDates: number[];
  startHour: number;
  endHour: number;
  spaceType: string;
  hoursPerDay: number;
  totalHours: number;
  hourlyRate: number;
  grossAmount: number;
  discountRate: number;
  discountAmount: number;
  finalAmount: number;
  /**
   * 시간대별 분해 (피크/비피크 혼합 시 양식 한 줄 확장용)
   * - 단일 시간대: 1개 항목 또는 미설정 → 기존 단일 단가 양식
   * - 혼합: 여러 항목 → 다중 라인 양식
   */
  priceBreakdown?: PriceBreakdownItem[];
};

export type PriceBreakdownItem = {
  priceType: PriceType;
  label: string; // "평일 비피크" 등
  hours: number;
  ratePerHour: number;
  subtotal: number;
  /**
   * 이 priceType에 기여한 이용일(일자) 목록 — 정렬됨.
   * 요금 안내문에서 주말/공휴일 라인이 어느 날짜 때문인지 보여주는 용도.
   */
  dates?: number[];
};

/**
 * 연도/월/일자/시작/종료 시간 → 시간대(피크/비피크)별 합산
 * 양식의 "이용 가격" 한 줄 확장에 사용
 */
export function computeLongTermBreakdown(
  year: number,
  month1to12: number,
  usageDates: number[],
  startHour: number,
  endHour: number
): {
  totalOriginal: number;
  totalEvent: number;
  totalHours: number;
  breakdown: PriceBreakdownItem[];
} {
  const startTime = `${String(startHour).padStart(2, "0")}:00`;
  const endTime = `${String(endHour).padStart(2, "0")}:00`;

  const agg: Map<PriceType, { hours: number; original: number; event: number; days: Set<number> }> = new Map();
  let totalHours = 0;

  for (const day of usageDates) {
    const date = new Date(year, month1to12 - 1, day);
    const r = calcHourlyMixed(date, startTime, endTime);
    totalHours += r.duration;
    for (const seg of r.breakdown) {
      const prev = agg.get(seg.priceType) ?? { hours: 0, original: 0, event: 0, days: new Set<number>() };
      prev.hours += seg.hours;
      prev.original += seg.originalPrice;
      prev.event += seg.eventPrice;
      prev.days.add(day);
      agg.set(seg.priceType, prev);
    }
  }

  // PriceType 정렬: 시작 시간 빠른 순 (offpeak가 먼저)
  const order: PriceType[] = ["weekday_offpeak", "weekday_peak", "weekend_offpeak", "weekend_peak"];
  const breakdown: PriceBreakdownItem[] = [];
  let totalOriginal = 0;
  let totalEvent = 0;
  for (const pt of order) {
    const v = agg.get(pt);
    if (!v || v.hours === 0) continue;
    breakdown.push({
      priceType: pt,
      label: getPriceTypeName(pt),
      hours: v.hours,
      ratePerHour: Math.round(v.event / v.hours), // 단일 priceType 내에선 일정한 단가
      subtotal: v.event,
      dates: [...v.days].sort((a, b) => a - b),
    });
    totalOriginal += v.original;
    totalEvent += v.event;
  }

  return { totalOriginal, totalEvent, totalHours, breakdown };
}

const formatNumber = (n: number) => n.toLocaleString("ko-KR");
const formatDateList = (dates: number[]) =>
  dates.slice().sort((a, b) => a - b).join(", ");

/**
 * 요금 안내문 — 등록 직후 즉시 발송
 */
export function buildPaymentNoticeText(b: LongTermBookingForTemplate): string {
  const dayLabel = b.dayOfWeek ? b.dayOfWeek : "-";
  const totalDays = b.usageDates.length;
  const discountPct = Math.round(b.discountRate * 100);

  return [
    "안녕하세요! A1STUDIO 입니다!",
    "장기대관 이용 관련 안내 드립니다.!",
    "",
    `1.성함: ${b.customerName} 님`,
    "",
    `2.연락처: ${b.customerPhone}`,
    "",
    "3.이용 요일/시간/날짜:",
    `${dayLabel}/${b.startHour}시~${b.endHour}시/${b.usageMonth} (${formatDateList(b.usageDates)}) 총 ${totalDays}일`,
    "",
    "4.이용 가격:",
    `총 ${totalDays}일, 하루 ${b.hoursPerDay}시간 (${totalDays}*${b.hoursPerDay})= ${b.totalHours}시간.`,
    ...(b.priceBreakdown && b.priceBreakdown.length >= 2
      ? [
          // 시간대 혼합: 한 줄 확장
          // 주말/공휴일 라인은 어느 날짜 때문인지 함께 표시 (민감 항목)
          ...b.priceBreakdown.flatMap((seg) => {
            const base = `(${b.spaceType} ${seg.label}) ${seg.hours}시간 × ${formatNumber(seg.ratePerHour)}원 = ${formatNumber(seg.subtotal)}원`;
            const isWeekendLine = seg.priceType === "weekend_offpeak" || seg.priceType === "weekend_peak";
            if (isWeekendLine && seg.dates && seg.dates.length > 0) {
              const dateList = seg.dates.map((d) => `${d}일`).join(", ");
              return [base, `  └ ${dateList} (${seg.dates.length}일)`];
            }
            return [base];
          }),
          `합계 = ${formatNumber(b.grossAmount)}원.`,
        ]
      : [
          // 단일 시간대(또는 breakdown 정보 없음): 기존 양식
          `(${b.spaceType}) ${b.totalHours}시간, 오픈 이벤트가 ${formatNumber(b.hourlyRate)}원 (${b.totalHours}*${formatNumber(b.hourlyRate)})= ${formatNumber(b.grossAmount)}원.`,
        ]),
    `${formatNumber(b.grossAmount)}원 - 장기대관 할인 ${discountPct}% (${formatNumber(b.discountAmount)}원 할인) = ${formatNumber(b.finalAmount)}원`,
    "",
    `5.총합: ${formatNumber(b.finalAmount)}원.`,
    "",
    "6.입금 계좌 정보",
    "기업은행",
    "986-042788-04-019",
    "신지섭 (에이원스튜디오)",
    "",
    "해당 금액 입금 확인 후 해당 시간 블록 처리 진행 예정입니다. :)",
    "",
    "입금 후 입금완료 메시지 부탁드리겠습니다.!",
    "",
    "언제나 행복하고 건강한 하루 되세요.!",
    "감사합니다.!",
    "",
    "A1STUDIO",
  ].join("\n");
}

/**
 * 이용안내문 — 이용일 당일 오전 10시 예약 발송용
 * (안내문에는 매 이용일 발송이지만 전체 이용일을 함께 표기)
 */
export function buildUsageNoticeText(b: LongTermBookingForTemplate): string {
  return [
    `${b.customerName} 님! 안녕하세요, A1 STUDIO입니다! ◡̎`,
    "연습실 이용 안내문 입니다.!",
    "좋은 시간 보내고 오세요💗",
    "",
    "[ 📌예약 정보 ]",
    `예약자명: ${b.customerName} 님`,
    "",
    `연락처: ${b.customerPhone}`,
    "",
    "이용 날짜:",
    `- ${b.usageMonth}`,
    `- ${formatDateList(b.usageDates)}일`,
    `- ${b.startHour}시~${b.endHour}시`,
    "",
    "[ 📌입실 안내 ]",
    "연습실 비밀번호: 0323",
    "(문 두 개 동일)",
    "연습실 위치: 우체국 오른쪽 건물 입구 B1이에요!",
    "",
    "화장실 비밀번호: 9780",
    "화장실 위치: 우체국 왼쪽 주차장 입구로 들어오신 뒤, 우회전하시면 우체국 뒷문 옆에 있어요.",
    "",
    "[ 📌시설 이용 안내 ]",
    "1.전자피아노 옆 QR코드로 Wi-Fi 연결해 주세요!",
    "(지하라 인터넷이 잘 안 터져요! 📶)",
    "2.블루투스 스피커는 냉난방기 옆에 있어요. 🔊",
    "나무계단을 밟으신 뒤 → 전원ON → 블루투스 버튼 → 핸드폰 연결 (JBL Party Box 320)",
    "3.조명 리모컨은 출입구 오른편 스위치 아래에 있어요.💡",
    "(줄조명 및 전구 색상 변경 가능)",
    "특수조명 리모컨은 전자피아노 옆 충전기 정리함에 있어요. ✨",
    "",
    "[ 📌이용 안내 및 주의사항 ]",
    "1.A1 STUDIO는 24시간 무인으로 운영돼요.",
    "2.예약하신 시간에 맞춰 입실해 주세요. ⏰",
    "3.이용 시간에는 준비 및 정리 시간이 포함되어 있어요.",
    "4.다음 분을 위해 종료 시간 전에 정리 후 퇴실 부탁드려요 🙏",
    "5.사용하신 조명, 음향, 집기는 원래 자리에 놓아주세요.",
    "6.쓰레기는 분리 정리 부탁드리고, 처음 오셨을 때처럼 깔끔하게 정돈해 주시면 감사해요 🧹",
    "7.실내는 금연이에요 🚭",
    "8.건물 밖이나 출입구 주변에서의 큰 소음, 고성방가, 장시간 체류는 주변에 민원이 생길 수 있으니 주의 부탁드려요 🔇",
    "9.CCTV가 설치되어 있는 공간으로, 안전 및 시설 관리를 위해 촬영이 이루어지고 있습니다.",
    "10.이용 수칙 위반, 무단 연장, 과도한 소음 및 민원 유발, 실내 흡연, 시설 운영에 지장을 주는 행위가 발생하면 환불 없이 즉시 퇴실 조치될 수 있는 점 양해 부탁드려요.",
    "11.시설물, 비품, 장비가 훼손되거나 분실된 경우 원상복구 및 손해배상 비용이 청구될 수 있어요.",
    "12.시설물이나 장비에 이상이 생기면 바로 연락 주세요! 📞",
    "",
    "이용 시 문의사항은 언제든 연락주세요☺️",
    "",
    "즐겁고 쾌적한 시간 되시길 바랍니다 😊",
    "감사합니다!",
    "A1 STUDIO",
  ].join("\n");
}

/**
 * KST 기준 발송 시각 Date 생성
 * 이용일 = (year, monthIndex, day) 의 KST 09:00 (UTC 기준 00:00) 등 시각
 *
 * 솔라피는 ISO8601(UTC)을 받으므로 KST 시각을 정확히 UTC로 변환해서 넘긴다.
 * KST = UTC+9 → KST 10:00 = UTC 01:00
 */
export function buildKstScheduleDate(
  year: number,
  month1to12: number,
  day: number,
  kstHour: number,
  kstMinute = 0
): Date {
  // Date.UTC는 UTC 기준이므로 (kstHour - 9)시로 지정하면 해당 KST 시각이 됨
  return new Date(Date.UTC(year, month1to12 - 1, day, kstHour - 9, kstMinute, 0));
}

/**
 * 이용월 문자열("5월") 파싱
 */
export function parseUsageMonth(usageMonth: string): number {
  const m = usageMonth.replace(/[^0-9]/g, "");
  const n = parseInt(m, 10);
  if (!Number.isFinite(n) || n < 1 || n > 12) {
    throw new Error(`잘못된 이용월: ${usageMonth}`);
  }
  return n;
}
