import { getAdminClient } from "@/lib/supabase/admin";

/**
 * 공유 공간(연습실 ↔ 파티룸) 교차 예약 충돌 검사 유틸
 *
 * 배경: 같은 물리 공간을 두 테이블로 나눠 판매한다.
 *  - reservations        : 연습실(room_id 'a1-room') + /booking 파티룸(room_id 'party-room')
 *  - party_reservations  : /party-room/booking 파티룸
 * 두 테이블은 서로를 보지 않아 이중 예약이 가능했다. 이 유틸로 양방향 교차검사를 한다.
 *
 * - 카카오페이 심사 영역: SELECT만 수행. 결제/예약 컬럼·스키마 변경 없음.
 * - 자정 넘김(overnight) 인식: end_date가 있으면 사용, 없으면 end<=start일 때 익일로 간주.
 * - 상태값 대소문자 혼용 대응(파티룸 카카오 승인은 소문자 'confirmed'로 저장됨).
 */

export type SpaceInterval = {
  source: "practice" | "party";
  startMin: number; // 절대 분 (dayNumber*1440 + 분)
  endMin: number;
};

// reservations.status 는 Postgres ENUM(ReservationStatus) → 대문자 값만 허용.
// 소문자를 .in() 에 넣으면 "invalid input value for enum" 으로 쿼리 전체가 실패하므로 분리한다.
const RESERVATION_STATUSES = ["PAID", "HOLD", "CONFIRMED"];

// party_reservations.status 는 일반 text 컬럼 → 카카오 승인이 소문자 'confirmed' 로 저장하므로 대소문자 모두 포함.
const PARTY_STATUSES = [
  "PAID",
  "HOLD",
  "CONFIRMED",
  "paid",
  "hold",
  "confirmed",
];

function dayNum(dateStr: string): number {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function toMin(timeStr: string): number {
  const [h, m] = timeStr.slice(0, 5).split(":");
  return Number(h) * 60 + Number(m || 0);
}

function addDaysStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + days * 86_400_000);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** 날짜 + 시작/종료 시각 → 절대 분 구간 (자정 넘김 인식) */
export function toInterval(
  dateStr: string,
  startTime: string,
  endTime: string,
  endDateStr?: string | null
): { startMin: number; endMin: number } {
  const sDay = dayNum(dateStr);
  const startMin = sDay * 1440 + toMin(startTime);
  let endMin: number;
  if (endDateStr) {
    endMin = dayNum(endDateStr) * 1440 + toMin(endTime);
  } else {
    endMin = sDay * 1440 + toMin(endTime);
    if (endMin <= startMin) endMin += 1440; // overnight
  }
  return { startMin, endMin };
}

/** 두 구간이 겹치는지 (경계 접촉은 겹침 아님) */
export function overlaps(
  a: { startMin: number; endMin: number },
  b: { startMin: number; endMin: number }
): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

// 파티룸 패키지 시간 (pricing.PARTY_ROOM_PACKAGES와 일치)
const PARTY_PKG_TIME: Record<
  string,
  { start: string; end: string; overnight: boolean }
> = {
  day: { start: "10:00", end: "17:00", overnight: false },
  night: { start: "19:00", end: "07:00", overnight: true },
  allday: { start: "10:00", end: "07:00", overnight: true },
};

/** 파티룸 패키지 → 절대 분 구간 */
export function partyPackageInterval(
  dateStr: string,
  packageType: string
): { startMin: number; endMin: number } {
  const t = PARTY_PKG_TIME[packageType] ?? PARTY_PKG_TIME.day;
  return toInterval(
    dateStr,
    t.start,
    t.end,
    t.overnight ? addDaysStr(dateStr, 1) : null
  );
}

/** reservations(연습실 + /booking 파티룸) 점유 구간 — 범위 양끝 ±1일 패딩 */
export async function fetchPracticeIntervals(
  fromDate: string,
  toDate: string
): Promise<SpaceInterval[]> {
  const supabase = getAdminClient();
  const lo = addDaysStr(fromDate, -1);
  const hi = addDaysStr(toDate, 1);
  // end_date 도 함께 조회 — 자정 넘김 예약 정확 계산
  const { data, error } = await supabase
    .from("reservations")
    .select("date, start_time, end_time, end_date, status")
    .gte("date", lo)
    .lte("date", hi)
    .in("status", RESERVATION_STATUSES);
  if (error) throw new Error(`연습실 예약 조회 실패: ${error.message}`);

  const out: SpaceInterval[] = [];
  for (const r of data ?? []) {
    if (!r.date || !r.start_time || !r.end_time) continue;
    const iv = toInterval(
      String(r.date),
      String(r.start_time),
      String(r.end_time),
      r.end_date ? String(r.end_date) : null
    );
    out.push({ source: "practice", ...iv });
  }
  return out;
}

/** party_reservations 점유 구간 — 범위 양끝 ±1일 패딩 */
export async function fetchPartyIntervals(
  fromDate: string,
  toDate: string
): Promise<SpaceInterval[]> {
  const supabase = getAdminClient();
  const lo = addDaysStr(fromDate, -1);
  const hi = addDaysStr(toDate, 1);
  const { data, error } = await supabase
    .from("party_reservations")
    .select("date, start_time, end_time, end_date, status")
    .gte("date", lo)
    .lte("date", hi)
    .in("status", PARTY_STATUSES);
  if (error) throw new Error(`파티룸 예약 조회 실패: ${error.message}`);

  const out: SpaceInterval[] = [];
  for (const r of data ?? []) {
    if (!r.date || !r.start_time || !r.end_time) continue;
    const iv = toInterval(
      String(r.date),
      String(r.start_time),
      String(r.end_time),
      r.end_date ? String(r.end_date) : null
    );
    out.push({ source: "party", ...iv });
  }
  return out;
}

/**
 * 후보 예약이 reservations 테이블(연습실+booking 파티룸)과 겹치는지.
 * 파티룸 예약 라우트에서 호출 → 연습실 측 점유와의 교차검사.
 */
export async function hasPracticeConflict(
  candidate: {
    date: string;
    startTime: string;
    endTime: string;
    endDate?: string | null;
  }
): Promise<boolean> {
  const candIv = toInterval(
    candidate.date,
    candidate.startTime,
    candidate.endTime,
    candidate.endDate ?? null
  );
  const intervals = await fetchPracticeIntervals(
    candidate.date,
    candidate.endDate ?? candidate.date
  );
  return intervals.some((iv) => overlaps(iv, candIv));
}

/**
 * 후보 예약이 party_reservations 테이블과 겹치는지.
 * 연습실 예약 라우트에서 호출 → 파티룸 측 점유와의 교차검사.
 */
export async function hasPartyConflict(
  candidate: {
    date: string;
    startTime: string;
    endTime: string;
    endDate?: string | null;
  }
): Promise<boolean> {
  const candIv = toInterval(
    candidate.date,
    candidate.startTime,
    candidate.endTime,
    candidate.endDate ?? null
  );
  const intervals = await fetchPartyIntervals(
    candidate.date,
    candidate.endDate ?? candidate.date
  );
  return intervals.some((iv) => overlaps(iv, candIv));
}

/**
 * 후보 예약이 두 테이블(reservations + party_reservations) 어느 쪽과도 겹치지 않는지.
 * 결제 확정(approve) 직전 등 INSERT 직전 최종 가드용 — 같은 상품끼리 + 교차 충돌을 한 번에 검사.
 */
export async function hasAnySpaceConflict(
  candidate: {
    date: string;
    startTime: string;
    endTime: string;
    endDate?: string | null;
  }
): Promise<boolean> {
  const candIv = toInterval(
    candidate.date,
    candidate.startTime,
    candidate.endTime,
    candidate.endDate ?? null
  );
  const from = candidate.date;
  const to = candidate.endDate ?? candidate.date;
  const [practice, party] = await Promise.all([
    fetchPracticeIntervals(from, to),
    fetchPartyIntervals(from, to),
  ]);
  return [...practice, ...party].some((iv) => overlaps(iv, candIv));
}
