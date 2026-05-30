"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarCheck, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// 예약현황 (읽기 전용)
// - 연/월/일 캘린더 → 일자 선택 시 00~23시(24시간) 시간 블록 표시
// - 데이터: 연습실(reservations) / 파티룸(party_reservations) / 장기대관(long_term_bookings)
// - 카카오페이 심사 중: SELECT만 수행, 결제/예약 컬럼·라우트 변경 없음

const DAYS_KR = ["일", "월", "화", "수", "목", "금", "토"] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 00 ~ 23 시작 슬롯 (24시간 전체 표시)

type Block = {
  source: "practice" | "party" | "longTerm";
  date: string;
  startTime: string;
  endTime: string;
  roomName?: string | null;
  spaceType?: string;
  status: string;
};

type ApiResponse = {
  ok: boolean;
  month: string;
  practice: Block[];
  party: Block[];
  longTerm: Block[];
  error?: string;
};

const SOURCE_META: Record<Block["source"], { label: string; bg: string; text: string; dot: string }> = {
  practice: { label: "연습실", bg: "bg-[#B98768]/15", text: "text-[#8a5d3f]", dot: "bg-[#B98768]" },
  party: { label: "파티룸", bg: "bg-purple-200/40", text: "text-purple-800", dot: "bg-purple-500" },
  longTerm: { label: "장기대관", bg: "bg-emerald-200/40", text: "text-emerald-800", dot: "bg-emerald-500" },
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function monthKey(year: number, monthIdx0: number) {
  return `${year}-${pad(monthIdx0 + 1)}`;
}

function dateKey(year: number, monthIdx0: number, day: number) {
  return `${year}-${pad(monthIdx0 + 1)}-${pad(day)}`;
}

function parseHour(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) + (m ?? 0) / 60;
}

function blockCoversHour(b: Block, hourSlot: number): boolean {
  const s = parseHour(b.startTime);
  const e = parseHour(b.endTime);
  // 슬롯 [hourSlot, hourSlot+1) 와 [s, e) 가 겹치는지
  return s < hourSlot + 1 && e > hourSlot;
}

export default function ReservationStatusPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(dateKey(today.getFullYear(), today.getMonth(), today.getDate()));
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = monthKey(year, month);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/reservations/status?month=${currentMonth}`)
      .then(async (res) => {
        const json = (await res.json()) as ApiResponse;
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setError(json.error || "예약현황을 불러오지 못했습니다.");
          setData(null);
        } else {
          setData(json);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[ReservationStatus] fetch failed", err);
        setError("네트워크 오류로 예약현황을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentMonth]);

  const allBlocks: Block[] = useMemo(() => {
    if (!data) return [];
    return [...data.practice, ...data.party, ...data.longTerm];
  }, [data]);

  // 날짜별 블록 그룹화
  const byDate = useMemo(() => {
    const map = new Map<string, Block[]>();
    for (const b of allBlocks) {
      const arr = map.get(b.date) ?? [];
      arr.push(b);
      map.set(b.date, arr);
    }
    return map;
  }, [allBlocks]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  };

  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const selectedBlocks = (byDate.get(selectedDate) ?? []).slice().sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">Reservation Status</p>
          <h1 className="mt-1 text-3xl font-extrabold text-[#3B342F] sm:text-4xl">예약현황</h1>
          <p className="mt-3 text-sm text-[#6f655d] sm:text-base">
            연습실 · 파티룸 · 장기대관 예약 시간을 한눈에 확인할 수 있어요
          </p>
        </div>

        {/* 범례 */}
        <div className="mb-4 flex flex-wrap items-center justify-center gap-3 text-xs text-[#6f655d]">
          {(Object.keys(SOURCE_META) as Block["source"][]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={cn("inline-block h-2.5 w-2.5 rounded-full", SOURCE_META[k].dot)} />
              {SOURCE_META[k].label}
            </span>
          ))}
        </div>

        {/* 캘린더 헤더 */}
        <div className="mb-3 flex items-center justify-between rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] px-4 py-3 shadow-sm">
          <button
            onClick={prevMonth}
            className="rounded-lg p-2 text-[#3B342F] transition-colors hover:bg-[#D8CCBC]/60"
            aria-label="이전 달"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-[#3B342F] sm:text-xl">
              {year}년 {month + 1}월
            </h2>
            {loading && <RefreshCw className="h-4 w-4 animate-spin text-[#B98768]" />}
          </div>
          <button
            onClick={nextMonth}
            className="rounded-lg p-2 text-[#3B342F] transition-colors hover:bg-[#D8CCBC]/60"
            aria-label="다음 달"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* 캘린더 본체 */}
        <div className="overflow-hidden rounded-2xl border border-[#D8CCBC] bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b border-[#D8CCBC] bg-[#EFE7DA] text-center text-xs font-semibold text-[#6f655d]">
            {DAYS_KR.map((d, i) => (
              <div
                key={d}
                className={cn(
                  "py-2",
                  i === 0 && "text-red-500",
                  i === 6 && "text-blue-500"
                )}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div key={`pad-${i}`} className="h-20 border-b border-r border-[#EFE7DA] sm:h-24" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const key = dateKey(year, month, day);
              const blocks = byDate.get(key) ?? [];
              const sources = new Set(blocks.map((b) => b.source));
              const isSelected = selectedDate === key;
              const isToday = key === todayKey;
              const dow = new Date(year, month, day).getDay();
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  className={cn(
                    "relative flex h-20 flex-col items-start gap-1 border-b border-r border-[#EFE7DA] p-1.5 text-left transition-colors sm:h-24 sm:p-2",
                    isSelected ? "bg-[#B98768]/15 ring-2 ring-inset ring-[#B98768]" : "hover:bg-[#F7F3EB]"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-semibold sm:text-sm",
                      dow === 0 && "text-red-500",
                      dow === 6 && "text-blue-500",
                      isToday && "rounded-full bg-[#3B342F] px-1.5 py-0.5 text-white"
                    )}
                  >
                    {day}
                  </span>
                  {blocks.length > 0 && (
                    <div className="mt-auto flex w-full flex-wrap items-center gap-0.5">
                      {(["practice", "party", "longTerm"] as const)
                        .filter((s) => sources.has(s))
                        .map((s) => (
                          <span
                            key={s}
                            className={cn("inline-block h-1.5 w-1.5 rounded-full", SOURCE_META[s].dot)}
                          />
                        ))}
                      <span className="ml-0.5 text-[10px] font-medium text-[#6f655d]">
                        {blocks.length}건
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 선택 일자 시간 블록 */}
        <div className="mt-6 rounded-2xl border border-[#D8CCBC] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-[#B98768]" />
              <h3 className="text-base font-bold text-[#3B342F] sm:text-lg">
                {selectedDate} 예약 현황
              </h3>
            </div>
            <span className="text-xs text-[#6f655d]">총 {selectedBlocks.length}건</span>
          </div>

          {/* 시간 그리드 00:00 ~ 23:00 (24시간) */}
          <div className="space-y-1">
            {HOURS.map((h) => {
              const slotBlocks = selectedBlocks.filter((b) => blockCoversHour(b, h));
              return (
                <div key={h} className="flex items-stretch gap-2">
                  <div className="w-12 shrink-0 pt-1.5 text-right text-xs font-medium text-[#9b9189]">
                    {pad(h)}:00
                  </div>
                  <div className="flex min-h-[2.25rem] flex-1 flex-wrap items-center gap-1 rounded-lg border border-[#EFE7DA] bg-[#F7F3EB]/60 p-1">
                    {slotBlocks.length === 0 ? (
                      <span className="px-2 text-xs text-[#c4b9ad]">예약 없음</span>
                    ) : (
                      slotBlocks.map((b, idx) => {
                        const meta = SOURCE_META[b.source];
                        const label =
                          b.source === "practice"
                            ? `${meta.label}${b.roomName ? ` · ${b.roomName}` : ""}`
                            : b.source === "longTerm"
                            ? `${meta.label}${b.spaceType ? ` · ${b.spaceType}` : ""}`
                            : meta.label;
                        return (
                          <span
                            key={`${b.source}-${b.startTime}-${idx}`}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium",
                              meta.bg,
                              meta.text
                            )}
                            title={`${b.startTime} ~ ${b.endTime}`}
                          >
                            <span className={cn("inline-block h-1.5 w-1.5 rounded-full", meta.dot)} />
                            {label} · {b.startTime}~{b.endTime}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 안내 + 빠른 이동 */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Link
            href="/booking"
            className="rounded-xl border border-[#D8CCBC] bg-white px-4 py-3 text-center text-sm font-semibold text-[#3B342F] transition-colors hover:border-[#B98768] hover:text-[#B98768]"
          >
            연습실 예약하기 →
          </Link>
          <Link
            href="/party-room"
            className="rounded-xl border border-[#D8CCBC] bg-white px-4 py-3 text-center text-sm font-semibold text-[#3B342F] transition-colors hover:border-[#B98768] hover:text-[#B98768]"
          >
            파티룸 예약하기 →
          </Link>
          <Link
            href="/long-term/apply"
            className="rounded-xl border border-[#D8CCBC] bg-white px-4 py-3 text-center text-sm font-semibold text-[#3B342F] transition-colors hover:border-[#B98768] hover:text-[#B98768]"
          >
            장기대관 신청 →
          </Link>
        </div>

        <p className="mt-4 text-center text-[11px] text-[#9b9189]">
          ※ 표시되는 시간은 결제 완료/확정/임시점유(HOLD) 상태를 포함합니다. 실시간 예약 가능 여부는 각 예약 페이지에서 확인하세요.
        </p>
      </div>
    </div>
  );
}
