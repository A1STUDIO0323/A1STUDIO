"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Send, Trash2, Eye, Plus, CheckCircle2, CalendarPlus } from "lucide-react";
import { AdminGate } from "@/components/admin/AdminGate";
import { ADMIN_PASSWORD_SESSION_KEY, useAdmin } from "@/lib/admin-context";
import { cn } from "@/lib/utils";
import { calcHourlyMixed } from "@/lib/pricing";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "임시저장",
  PENDING_PAYMENT: "입금대기",
  SCHEDULED: "예약완료",
  COMPLETED: "이용완료",
  CANCELLED: "취소",
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-zinc-200 text-zinc-700",
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  SCHEDULED: "bg-emerald-100 text-emerald-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-red-100 text-red-700",
};

type ScheduleEntry = {
  day: number;
  scheduledAt: string;
  groupId?: string;
  success: boolean;
  error?: string;
  delivered?: boolean;
  deliveredAt?: string;
  deliveryStatus?: string;
  deliveryFailReason?: string;
};

type Booking = {
  id: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  day_of_week: string | null;
  usage_month: string;
  usage_dates: number[];
  start_hour: number;
  end_hour: number;
  space_type: string;
  hours_per_day: number;
  total_hours: number;
  hourly_rate: number;
  gross_amount: number;
  discount_rate: number;
  discount_amount: number;
  final_amount: number;
  payment_notice_sent_at: string | null;
  payment_confirmed_at: string | null;
  usage_notice_schedule: ScheduleEntry[] | null;
  usage_notice_send_hour: number;
  admin_memo: string | null;
  created_at: string;
};

function adminHeaders(): HeadersInit {
  const pw =
    typeof window !== "undefined"
      ? sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) ?? ""
      : "";
  return {
    "Content-Type": "application/json",
    "x-admin-password": pw,
  };
}

const formatKrw = (n: number) => n.toLocaleString("ko-KR") + "원";
const formatKstDateTime = (iso: string) => {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const mm = kst.getUTCMonth() + 1;
  const dd = kst.getUTCDate();
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mi = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${mi}`;
};

type FormState = {
  customerName: string;
  customerPhone: string;
  dayOfWeek: string;
  usageMonth: string;
  usageDatesText: string;
  startHour: string;
  endHour: string;
  spaceType: string;
  hourlyRate: string;
  discountRatePct: string;
  usageNoticeSendHour: string;
  scheduleYear: string;
  adminMemo: string;
  sendPaymentNoticeNow: boolean;
  scheduleUsageNotice: boolean;
};

const USAGE_NOTICE_OFFSET_HOURS = 3; // 이용안내문 발송 시각 = startHour - 3 (기본값)

const initialForm: FormState = {
  customerName: "",
  customerPhone: "",
  dayOfWeek: "",
  usageMonth: "",
  usageDatesText: "",
  startHour: "14",
  endHour: "18",
  spaceType: "연습실",
  hourlyRate: "10000",
  discountRatePct: "10",
  usageNoticeSendHour: String(Math.max(0, 14 - USAGE_NOTICE_OFFSET_HOURS)),
  scheduleYear: "",
  adminMemo: "",
  sendPaymentNoticeNow: true,
  scheduleUsageNotice: true,
};

type PreviewResult = {
  calc: {
    hoursPerDay: number;
    totalDays: number;
    totalHours: number;
    grossAmount: number;
    discountAmount: number;
    finalAmount: number;
  };
  paymentText: string;
  paymentBytes: number;
  usageText: string;
  usageBytes: number;
  scheduleList: Array<{ day: number; scheduledAt: string; isPast: boolean }>;
};

function parseDates(text: string): number[] {
  return text
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => parseInt(s.replace(/[^0-9]/g, ""), 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 31);
}

// 한국어 요일 문자열 → JS getDay() 인덱스 (일=0, 월=1, ..., 토=6)
const DAY_OF_WEEK_MAP: Record<string, number> = {
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
};

function parseDaysOfWeek(text: string): number[] {
  return Array.from(
    new Set(
      text
        .split(/[,\s/·]+/)
        .map((s) => s.replace(/요일/g, "").trim())
        .map((s) => s.charAt(0))
        .filter((s) => s in DAY_OF_WEEK_MAP)
        .map((s) => DAY_OF_WEEK_MAP[s])
    )
  );
}

function parseMonthNumber(text: string): number | null {
  const n = parseInt(text.replace(/[^0-9]/g, ""), 10);
  if (!Number.isFinite(n) || n < 1 || n > 12) return null;
  return n;
}

// 특정 (연, 월)의 매칭 요일에 해당하는 모든 일(day) 추출
function datesOfMonthByWeekdays(year: number, month1to12: number, weekdays: number[]): number[] {
  const set = new Set(weekdays);
  const out: number[] = [];
  const last = new Date(year, month1to12, 0).getDate();
  for (let d = 1; d <= last; d++) {
    if (set.has(new Date(year, month1to12 - 1, d).getDay())) {
      out.push(d);
    }
  }
  return out;
}

// 장기대관 할인율 정책 (총 이용시간 구간별)
function getLongTermDiscountPct(totalHours: number): number {
  if (totalHours >= 70) return 30;
  if (totalHours >= 31) return 20;
  if (totalHours >= 1) return 10;
  return 0;
}

function formToBody(form: FormState) {
  return {
    customerName: form.customerName.trim(),
    customerPhone: form.customerPhone.replace(/[^0-9]/g, ""),
    dayOfWeek: form.dayOfWeek.trim() || null,
    usageMonth: form.usageMonth.trim(),
    usageDates: parseDates(form.usageDatesText),
    startHour: parseInt(form.startHour, 10),
    endHour: parseInt(form.endHour, 10),
    spaceType: form.spaceType.trim() || "연습실",
    hourlyRate: parseInt(form.hourlyRate.replace(/[^0-9]/g, ""), 10) || 0,
    discountRate: (parseFloat(form.discountRatePct) || 0) / 100,
    usageNoticeSendHour: parseInt(form.usageNoticeSendHour, 10) || 10,
    adminMemo: form.adminMemo.trim() || null,
    sendPaymentNoticeNow: form.sendPaymentNoticeNow,
    scheduleUsageNotice: form.scheduleUsageNotice,
    ...(form.scheduleYear ? { scheduleYear: parseInt(form.scheduleYear, 10) } : {}),
  };
}

export default function LongTermBookingsAdminPage() {
  const { isAdmin } = useAdmin();
  const [items, setItems] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [detail, setDetail] = useState<Booking | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/long-term-bookings", {
        cache: "no-store",
        headers: adminHeaders(),
      });
      if (!res.ok) throw new Error(`목록 조회 실패 (${res.status})`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch (err) {
      console.error("[admin:long-term-bookings] load failed", err);
      alert("목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const autoFillDates = () => {
    const monthNum = parseMonthNumber(form.usageMonth);
    if (monthNum === null) {
      alert("이용월을 먼저 입력해주세요. (예: 6월)");
      return;
    }
    // 요일 입력은 dayOfWeek 우선, 비어있으면 usageDatesText에서도 한글 요일 추출 시도
    let weekdays = parseDaysOfWeek(form.dayOfWeek);
    let movedFromDatesField = false;
    if (weekdays.length === 0) {
      weekdays = parseDaysOfWeek(form.usageDatesText);
      if (weekdays.length > 0) movedFromDatesField = true;
    }
    if (weekdays.length === 0) {
      alert("요일을 먼저 입력해주세요. (예: 월, 수, 금)");
      return;
    }
    const now = new Date();
    const fallbackYear = monthNum < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
    const year = form.scheduleYear ? parseInt(form.scheduleYear, 10) : fallbackYear;
    if (!Number.isFinite(year) || year < 2024 || year > 2100) {
      alert("이용 연도가 올바르지 않습니다.");
      return;
    }
    const dates = datesOfMonthByWeekdays(year, monthNum, weekdays);
    if (dates.length === 0) {
      alert(`${year}년 ${monthNum}월에 해당 요일이 없습니다.`);
      return;
    }
    // 이용 날짜란에 숫자가 이미 있으면 덮어쓰기 확인 (요일 한글만 있던 경우는 그냥 덮어씀)
    const existingNumbers = parseDates(form.usageDatesText);
    if (existingNumbers.length > 0 && !movedFromDatesField) {
      const ok = confirm(
        `기존 이용 날짜(${existingNumbers.length}개)를 자동 계산된 결과(${dates.length}개)로 덮어쓸까요?\n` +
          `자동 결과: ${dates.join(", ")}`
      );
      if (!ok) return;
    }
    // 요일 한글이 이용 날짜란에서 왔다면 dayOfWeek 필드로 자동 이동시켜 UX 일관성 확보
    const dayOfWeekLabels = ["일", "월", "화", "수", "목", "금", "토"];
    setForm({
      ...form,
      usageDatesText: dates.join(", "),
      ...(movedFromDatesField && !form.dayOfWeek.trim()
        ? { dayOfWeek: weekdays.sort((a, b) => a - b).map((w) => dayOfWeekLabels[w]).join(", ") }
        : {}),
    });
  };

  const autoCalcPrice = () => {
    const monthNum = parseMonthNumber(form.usageMonth);
    if (monthNum === null) {
      alert("이용월을 먼저 입력해주세요.");
      return;
    }
    const dates = parseDates(form.usageDatesText);
    if (dates.length === 0) {
      alert("이용 날짜를 먼저 입력해주세요. (자동 채우기 활용 가능)");
      return;
    }
    const startH = parseInt(form.startHour, 10);
    const endH = parseInt(form.endHour, 10);
    if (!Number.isFinite(startH) || !Number.isFinite(endH) || endH <= startH) {
      alert("시작/종료 시간이 올바르지 않습니다.");
      return;
    }
    const now = new Date();
    const fallbackYear = monthNum < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
    const year = form.scheduleYear ? parseInt(form.scheduleYear, 10) : fallbackYear;
    if (!Number.isFinite(year) || year < 2024 || year > 2100) {
      alert("이용 연도가 올바르지 않습니다.");
      return;
    }

    const spaceType = (form.spaceType || "연습실").trim();
    if (spaceType !== "연습실") {
      alert("파티룸 자동 계산은 추후 지원 예정입니다. 공간 구분을 '연습실'로 두고 사용해주세요.");
      return;
    }

    const startTime = `${String(startH).padStart(2, "0")}:00`;
    const endTime = `${String(endH).padStart(2, "0")}:00`;

    let totalOriginal = 0;
    let totalEvent = 0;
    let totalHours = 0;
    const breakdownSummary: Record<string, number> = {};

    for (const day of dates) {
      const date = new Date(year, monthNum - 1, day);
      const r = calcHourlyMixed(date, startTime, endTime);
      totalOriginal += r.originalPrice;
      totalEvent += r.eventPrice;
      totalHours += r.duration;
      for (const seg of r.breakdown) {
        breakdownSummary[seg.priceType] = (breakdownSummary[seg.priceType] ?? 0) + seg.hours;
      }
    }

    if (totalHours <= 0) {
      alert("총 이용시간이 0입니다.");
      return;
    }

    // 가중평균 시간당 단가 (이벤트가 기준 — 양식 "오픈 이벤트가" 표기에 맞춤)
    const avgHourlyRate = Math.round(totalEvent / totalHours);
    const discountPct = getLongTermDiscountPct(totalHours);

    const breakdownText = Object.entries(breakdownSummary)
      .map(([k, v]) => `  • ${k}: ${v}시간`)
      .join("\n");
    const ok = confirm(
      `계산 결과를 폼에 반영할까요?\n\n` +
        `▶ 총 이용시간: ${totalHours}시간 (${dates.length}일 × ${endH - startH}시간)\n` +
        `▶ 이벤트가 총액: ${totalEvent.toLocaleString("ko-KR")}원\n` +
        `▶ 정가 총액: ${totalOriginal.toLocaleString("ko-KR")}원\n` +
        `▶ 가중평균 시간당 단가: ${avgHourlyRate.toLocaleString("ko-KR")}원/시\n` +
        `▶ 장기대관 할인: ${discountPct}% (${totalHours}시간 구간)\n\n` +
        `시간대 내역:\n${breakdownText}\n\n` +
        `[확인]을 누르면 시간당 단가/할인율 필드에 반영됩니다.`
    );
    if (!ok) return;

    setForm({
      ...form,
      hourlyRate: String(avgHourlyRate),
      discountRatePct: String(discountPct),
    });
  };

  const requestPreview = async () => {
    const body = formToBody(form);
    if (!body.customerName || !body.customerPhone || !body.usageMonth || body.usageDates.length === 0) {
      alert("고객명/연락처/이용월/이용날짜는 필수입니다.");
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await fetch("/api/admin/long-term-bookings/preview", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "미리보기 실패");
      setPreview(data);
    } catch (err) {
      console.error("[admin:long-term-bookings] preview failed", err);
      alert(err instanceof Error ? err.message : "미리보기 실패");
    } finally {
      setPreviewLoading(false);
    }
  };

  const submit = async () => {
    const body = formToBody(form);
    if (!body.customerName || !body.customerPhone || !body.usageMonth || body.usageDates.length === 0) {
      alert("고객명/연락처/이용월/이용날짜는 필수입니다.");
      return;
    }
    if (!confirm(
      `등록하시겠습니까?\n` +
        `- 요금 안내문 ${body.sendPaymentNoticeNow ? "즉시 발송" : "미발송"}\n` +
        `- 이용안내문 예약 발송 ${body.scheduleUsageNotice ? `(${body.usageDates.length}건)` : "미예약"}`
    )) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/long-term-bookings", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "등록 실패");

      const scheduled = (data.usageSchedule ?? []) as Array<{ success: boolean }>;
      const successCount = scheduled.filter((s) => s.success).length;
      alert(
        `등록 완료\n` +
          `- 요금 안내문: ${data.paymentNotice?.success ? "발송 성공" : data.paymentNotice?.error ?? "미발송"}\n` +
          `- 이용안내문 예약: ${successCount}/${scheduled.length}건 성공`
      );
      setForm(initialForm);
      setPreview(null);
      setShowForm(false);
      await load();
    } catch (err) {
      console.error("[admin:long-term-bookings] submit failed", err);
      alert(err instanceof Error ? err.message : "등록 실패");
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, patch: Record<string, unknown>) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/long-term-bookings/${id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "수정 실패");
      }
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "수정 실패");
    } finally {
      setBusyId(null);
    }
  };

  const addUsageNoticeSchedule = async (id: string) => {
    if (!confirm(
      "이용안내문 예약 발송을 추가하시겠습니까?\n" +
        "- 이미 예약된 일자는 건너뜁니다\n" +
        "- 이미 지난 일자는 자동 skip됩니다\n" +
        "- 미래 미예약 일자에 대해 솔라피 예약 발송을 등록합니다"
    )) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/long-term-bookings/${id}/schedule-usage-notice`, {
        method: "POST",
        headers: adminHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "추가 실패");
      alert(
        `예약 추가 완료\n` +
          `- 신규 예약 성공: ${data.newlyScheduled}건\n` +
          `- 이미 예약됨: ${data.alreadyScheduled}건\n` +
          `- 지난 일자 skip: ${data.skippedPast}건\n` +
          `- 실패: ${data.failed}건`
      );
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "추가 실패");
    } finally {
      setBusyId(null);
    }
  };

  const cancelBooking = async (id: string) => {
    if (!confirm("정말 취소하시겠습니까?\n예약된 이용안내문 발송도 함께 취소 시도합니다.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/long-term-bookings/${id}`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "취소 실패");
      const cancelResults = (data.cancelResults ?? []) as Array<{ success: boolean }>;
      const ok = cancelResults.filter((c) => c.success).length;
      alert(`취소 완료\n솔라피 예약 취소: ${ok}/${cancelResults.length}건`);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "취소 실패");
    } finally {
      setBusyId(null);
    }
  };

  const stats = useMemo(() => {
    const pending = items.filter((i) => i.status === "PENDING_PAYMENT").length;
    const scheduled = items.filter((i) => i.status === "SCHEDULED").length;
    const totalAmount = items
      .filter((i) => i.status !== "CANCELLED")
      .reduce((s, i) => s + i.final_amount, 0);
    return { pending, scheduled, totalAmount };
  }, [items]);

  if (!isAdmin) return <AdminGate />;

  return (
    <>
      <div className="min-h-screen bg-[#F7F3EB] text-[#3B342F]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* 헤더 */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 rounded-lg border border-[#D8CCBC] bg-white px-3 py-2 text-sm hover:bg-[#EFE7DA]"
              >
                <ArrowLeft size={16} /> 관리자 홈
              </Link>
              <h1 className="text-xl font-bold sm:text-2xl">장기대관 고객 관리</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={load}
                className="inline-flex items-center gap-1 rounded-lg border border-[#D8CCBC] bg-white px-3 py-2 text-sm hover:bg-[#EFE7DA]"
              >
                <RefreshCw size={16} /> 새로고침
              </button>
              <button
                onClick={() => {
                  setShowForm((v) => !v);
                  setPreview(null);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-[#B98768] px-4 py-2 text-sm font-bold text-white hover:bg-[#a9785c]"
              >
                <Plus size={16} /> {showForm ? "폼 닫기" : "신규 등록"}
              </button>
            </div>
          </div>

          {/* 통계 */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#D8CCBC] bg-white p-4">
              <div className="text-xs text-[#6f655d]">입금 대기</div>
              <div className="mt-1 text-2xl font-bold">{stats.pending}건</div>
            </div>
            <div className="rounded-xl border border-[#D8CCBC] bg-white p-4">
              <div className="text-xs text-[#6f655d]">예약 발송 등록</div>
              <div className="mt-1 text-2xl font-bold">{stats.scheduled}건</div>
            </div>
            <div className="rounded-xl border border-[#D8CCBC] bg-white p-4">
              <div className="text-xs text-[#6f655d]">총 금액(취소 제외)</div>
              <div className="mt-1 text-2xl font-bold">{formatKrw(stats.totalAmount)}</div>
            </div>
          </div>

          {/* 폼 */}
          {showForm && (
            <div className="mb-6 rounded-2xl border border-[#D8CCBC] bg-white p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-bold">신규 장기대관 등록</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="고객명 *">
                  <input
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    className="input"
                    placeholder="홍길동"
                  />
                </Field>
                <Field label="연락처 *">
                  <input
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                    className="input"
                    placeholder="01012345678"
                  />
                </Field>
                <Field label="요일 (표시용 + 자동 채우기 기준)">
                  <input
                    value={form.dayOfWeek}
                    onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}
                    className="input"
                    placeholder="월, 수, 금 (또는 화/목)"
                  />
                </Field>
                <Field label="이용월 *">
                  <input
                    value={form.usageMonth}
                    onChange={(e) => setForm({ ...form, usageMonth: e.target.value })}
                    className="input"
                    placeholder="5월"
                  />
                </Field>
                <Field label="이용 날짜 * (쉼표/공백 구분 — 자동 채우기 후 수정 가능)">
                  <div className="flex gap-2">
                    <input
                      value={form.usageDatesText}
                      onChange={(e) => setForm({ ...form, usageDatesText: e.target.value })}
                      className="input flex-1"
                      placeholder="11, 13, 15, 18"
                    />
                    <button
                      type="button"
                      onClick={autoFillDates}
                      className="whitespace-nowrap rounded-lg border border-[#B98768] bg-[#B98768] px-3 py-2 text-xs font-bold text-white hover:bg-[#a9785c]"
                      title="이용월 + 요일 입력값을 기반으로 해당 월의 매칭 날짜를 자동 채움"
                    >
                      📅 자동 채우기
                    </button>
                  </div>
                </Field>
                <Field label="이용 연도 (생략 시 자동)">
                  <input
                    value={form.scheduleYear}
                    onChange={(e) => setForm({ ...form, scheduleYear: e.target.value })}
                    className="input"
                    placeholder="2026"
                  />
                </Field>
                <Field label={`시작 시 * (이용안내문 발송시각 자동 = 시작-${USAGE_NOTICE_OFFSET_HOURS})`}>
                  <input
                    type="number"
                    value={form.startHour}
                    onChange={(e) => {
                      const v = e.target.value;
                      const sh = parseInt(v, 10);
                      setForm({
                        ...form,
                        startHour: v,
                        ...(Number.isFinite(sh)
                          ? { usageNoticeSendHour: String(Math.max(0, sh - USAGE_NOTICE_OFFSET_HOURS)) }
                          : {}),
                      });
                    }}
                    className="input"
                  />
                </Field>
                <Field label="종료 시 *">
                  <input
                    type="number"
                    value={form.endHour}
                    onChange={(e) => setForm({ ...form, endHour: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="공간 구분">
                  <select
                    value={form.spaceType}
                    onChange={(e) => setForm({ ...form, spaceType: e.target.value })}
                    className="input"
                  >
                    <option value="연습실">연습실</option>
                    <option value="파티룸" disabled>파티룸 (추후 지원 예정)</option>
                  </select>
                </Field>
                <Field label="시간당 단가(원) *">
                  <input
                    value={form.hourlyRate}
                    onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="장기대관 할인(%)">
                  <input
                    value={form.discountRatePct}
                    onChange={(e) => setForm({ ...form, discountRatePct: e.target.value })}
                    className="input"
                  />
                </Field>
                <Field label="이용안내문 발송 시각(시) — 수동 수정 가능">
                  <input
                    type="number"
                    value={form.usageNoticeSendHour}
                    onChange={(e) => setForm({ ...form, usageNoticeSendHour: e.target.value })}
                    className="input"
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="관리자 메모">
                    <textarea
                      value={form.adminMemo}
                      onChange={(e) => setForm({ ...form, adminMemo: e.target.value })}
                      className="input min-h-[80px]"
                    />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.sendPaymentNoticeNow}
                    onChange={(e) => setForm({ ...form, sendPaymentNoticeNow: e.target.checked })}
                  />
                  요금 안내문 즉시 발송
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.scheduleUsageNotice}
                    onChange={(e) => setForm({ ...form, scheduleUsageNotice: e.target.checked })}
                  />
                  이용안내문 예약 발송 등록
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={autoCalcPrice}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#B98768] bg-white px-4 py-2 text-sm font-bold text-[#B98768] hover:bg-[#FDF7EF]"
                  title="이용 날짜/시간 기준 정책에 따라 시간당 단가와 할인율을 자동 계산"
                >
                  💰 가격 자동 계산
                </button>
                <button
                  type="button"
                  onClick={requestPreview}
                  disabled={previewLoading}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#D8CCBC] bg-white px-4 py-2 text-sm hover:bg-[#EFE7DA] disabled:opacity-50"
                >
                  <Eye size={16} /> {previewLoading ? "미리보기 생성 중..." : "미리보기"}
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#B98768] px-4 py-2 text-sm font-bold text-white hover:bg-[#a9785c] disabled:opacity-50"
                >
                  <Send size={16} /> {submitting ? "등록 중..." : "등록 + 발송"}
                </button>
              </div>

              {preview && (
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-bold">요금 안내문 미리보기</div>
                      <div className="text-xs text-[#6f655d]">{preview.paymentBytes} bytes (LMS)</div>
                    </div>
                    <pre className="max-h-[400px] overflow-y-auto whitespace-pre-wrap break-words text-xs leading-5">
                      {preview.paymentText}
                    </pre>
                    <div className="mt-3 rounded-lg bg-white p-3 text-sm">
                      <div>총 {preview.calc.totalDays}일 · {preview.calc.totalHours}시간</div>
                      <div>할인전: {formatKrw(preview.calc.grossAmount)}</div>
                      <div>할인: -{formatKrw(preview.calc.discountAmount)}</div>
                      <div className="font-bold">최종: {formatKrw(preview.calc.finalAmount)}</div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-sm font-bold">이용안내문 미리보기</div>
                      <div className="text-xs text-[#6f655d]">{preview.usageBytes} bytes (LMS)</div>
                    </div>
                    <pre className="max-h-[400px] overflow-y-auto whitespace-pre-wrap break-words text-xs leading-5">
                      {preview.usageText}
                    </pre>
                    <div className="mt-3 rounded-lg bg-white p-3 text-xs">
                      <div className="mb-1 font-bold">예약 발송 일정 ({preview.scheduleList.length}건)</div>
                      <ul className="space-y-0.5">
                        {preview.scheduleList.map((s) => (
                          <li key={s.day} className={cn(s.isPast && "text-red-600 line-through")}>
                            {s.day}일 → {formatKstDateTime(s.scheduledAt)}
                            {s.isPast && " (지난 시각, 발송 안 됨)"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 목록 */}
          <div className="rounded-2xl border border-[#D8CCBC] bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">장기대관 고객 목록</h2>
              <div className="text-sm text-[#6f655d]">{items.length}건</div>
            </div>
            {loading ? (
              <div className="py-12 text-center text-[#6f655d]">불러오는 중...</div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-[#6f655d]">등록된 장기대관이 없습니다.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#F7F3EB] text-left text-xs text-[#6f655d]">
                    <tr>
                      <th className="px-3 py-2">상태</th>
                      <th className="px-3 py-2">고객</th>
                      <th className="px-3 py-2">일정</th>
                      <th className="px-3 py-2">금액</th>
                      <th className="px-3 py-2">발송 현황</th>
                      <th className="px-3 py-2">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => {
                      const schedule = it.usage_notice_schedule ?? [];
                      const scheduledCount = schedule.filter((s) => s.success).length;
                      const deliveredCount = schedule.filter((s) => s.delivered === true).length;
                      const failedCount = schedule.filter((s) => s.delivered === false && s.deliveryFailReason).length;
                      const pendingCount = scheduledCount - deliveredCount - failedCount;
                      return (
                        <tr key={it.id} className="border-t border-[#EFE7DA] align-top">
                          <td className="px-3 py-3">
                            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-bold", STATUS_COLOR[it.status])}>
                              {STATUS_LABEL[it.status] ?? it.status}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-bold">{it.customer_name}</div>
                            <div className="text-xs text-[#6f655d]">{it.customer_phone}</div>
                          </td>
                          <td className="px-3 py-3 text-xs">
                            <div>
                              {it.usage_month} ({it.usage_dates.slice().sort((a, b) => a - b).join(", ")}) · {it.usage_dates.length}일
                            </div>
                            <div className="text-[#6f655d]">
                              {it.start_hour}시~{it.end_hour}시 · {it.space_type}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs">
                            <div className="font-bold">{formatKrw(it.final_amount)}</div>
                            <div className="text-[#6f655d]">
                              할인 {Math.round(it.discount_rate * 100)}% (-{formatKrw(it.discount_amount)})
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs">
                            <div>
                              요금: {it.payment_notice_sent_at ? "발송 ✓" : "미발송"}
                              {it.payment_confirmed_at && <span className="ml-1 text-emerald-600">입금확인 ✓</span>}
                            </div>
                            <div>
                              이용안내: <span className="font-bold">{pendingCount}</span>/{scheduledCount}건 대기
                              {deliveredCount > 0 && (
                                <span className="ml-1 text-emerald-600">· {deliveredCount}건 발송</span>
                              )}
                              {failedCount > 0 && (
                                <span className="ml-1 text-red-600">· {failedCount}건 실패</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              <button
                                onClick={() => setDetail(it)}
                                className="rounded border border-[#D8CCBC] px-2 py-1 text-xs hover:bg-[#EFE7DA]"
                              >
                                상세
                              </button>
                              {!it.payment_confirmed_at && it.status !== "CANCELLED" && (
                                <button
                                  onClick={() => updateStatus(it.id, { paymentConfirmed: true })}
                                  disabled={busyId === it.id}
                                  className="rounded border border-emerald-400 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                                >
                                  <CheckCircle2 size={12} className="inline" /> 입금확인
                                </button>
                              )}
                              {it.status !== "CANCELLED" && scheduledCount < it.usage_dates.length && (
                                <button
                                  onClick={() => addUsageNoticeSchedule(it.id)}
                                  disabled={busyId === it.id}
                                  className="rounded border border-blue-400 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                                  title="미예약/실패한 이용일에 대해 이용안내문 예약 발송 추가"
                                >
                                  <CalendarPlus size={12} className="inline" /> 이용안내 추가
                                </button>
                              )}
                              {it.status !== "CANCELLED" && (
                                <button
                                  onClick={() => cancelBooking(it.id)}
                                  disabled={busyId === it.id}
                                  className="rounded border border-red-400 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 size={12} className="inline" /> 취소
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* 상세 모달 */}
        {detail && (
          <div
            onClick={() => setDetail(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">{detail.customer_name} · {detail.customer_phone}</h3>
                <button onClick={() => setDetail(null)} className="text-xl">×</button>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <Info k="상태" v={STATUS_LABEL[detail.status] ?? detail.status} />
                <Info k="공간" v={detail.space_type} />
                <Info k="이용월" v={detail.usage_month} />
                <Info k="요일" v={detail.day_of_week ?? "-"} />
                <Info k="이용일" v={detail.usage_dates.slice().sort((a, b) => a - b).join(", ")} />
                <Info k="시간" v={`${detail.start_hour}시~${detail.end_hour}시 (하루 ${detail.hours_per_day}시간)`} />
                <Info k="총 시간" v={`${detail.total_hours}시간`} />
                <Info k="단가" v={formatKrw(detail.hourly_rate)} />
                <Info k="할인전" v={formatKrw(detail.gross_amount)} />
                <Info k="할인" v={`${Math.round(detail.discount_rate * 100)}% (-${formatKrw(detail.discount_amount)})`} />
                <Info k="최종 금액" v={formatKrw(detail.final_amount)} />
                <Info
                  k="요금 안내문"
                  v={detail.payment_notice_sent_at ? `발송: ${formatKstDateTime(detail.payment_notice_sent_at)}` : "미발송"}
                />
                <Info
                  k="입금 확인"
                  v={detail.payment_confirmed_at ? formatKstDateTime(detail.payment_confirmed_at) : "-"}
                />
              </dl>

              <div className="mt-4">
                <div className="mb-2 text-sm font-bold">이용안내문 예약 발송</div>
                <ul className="space-y-1 text-xs">
                  {(detail.usage_notice_schedule ?? []).map((s) => {
                    let statusBadge = "";
                    let statusClass = "";
                    if (!s.success) {
                      statusBadge = `예약 실패: ${s.error ?? "-"}`;
                      statusClass = "text-red-600";
                    } else if (s.delivered === true) {
                      statusBadge = `✅ 발송 완료${s.deliveredAt ? ` (${formatKstDateTime(s.deliveredAt)})` : ""}`;
                      statusClass = "text-emerald-700";
                    } else if (s.delivered === false && s.deliveryFailReason) {
                      statusBadge = `❌ 발송 실패: ${s.deliveryFailReason}`;
                      statusClass = "text-red-600";
                    } else {
                      statusBadge = `⏰ 예약됨 (${s.groupId})`;
                      statusClass = "text-[#6f655d]";
                    }
                    return (
                      <li key={s.day} className={statusClass}>
                        {s.day}일 → {formatKstDateTime(s.scheduledAt)} · {statusBadge}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {detail.admin_memo && (
                <div className="mt-4 rounded-lg bg-[#F7F3EB] p-3 text-sm">
                  <div className="mb-1 text-xs font-bold text-[#6f655d]">메모</div>
                  {detail.admin_memo}
                </div>
              )}
            </div>
          </div>
        )}

        <style jsx>{`
          .input {
            width: 100%;
            border-radius: 0.5rem;
            border: 1px solid #d8ccbc;
            background-color: white;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
          }
          .input:focus {
            outline: none;
            border-color: #b98768;
          }
        `}</style>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-[#6f655d]">{label}</span>
      {children}
    </label>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-xs text-[#6f655d]">{k}</dt>
      <dd className="text-sm">{v}</dd>
    </>
  );
}
