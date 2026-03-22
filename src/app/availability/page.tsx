"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 9); // 09 ~ 23

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// 더미 예약 데이터 (실제로는 API에서 가져옴)
const DUMMY_RESERVED: Record<string, number[]> = {
  "2026-03-05": [10, 11, 12, 13],
  "2026-03-08": [14, 15, 16, 17, 18],
  "2026-03-12": [9, 10, 11],
  "2026-03-15": [13, 14, 15, 16, 17, 18, 19, 20],
  "2026-03-20": [10, 11, 12, 13, 14, 15],
};

export default function AvailabilityPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const formatKey = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const reservedHours = selectedDate ? (DUMMY_RESERVED[selectedDate] ?? []) : [];

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
            Availability
          </p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">예약현황</h1>
          <p className="mt-3 text-[#6f655d]">날짜를 선택하면 시간대별 예약 현황을 볼 수 있어요</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* 캘린더 */}
          <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6">
            {/* 월 네비게이션 */}
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={prevMonth}
                className="rounded-lg p-2 text-[#6f655d] hover:bg-[#3B342F]/5 hover:text-[#B98768] transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-bold text-[#3B342F]">
                {year}년 {month + 1}월
              </h2>
              <button
                onClick={nextMonth}
                className="rounded-lg p-2 text-[#6f655d] hover:bg-[#3B342F]/5 hover:text-[#B98768] transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* 요일 헤더 */}
            <div className="mb-2 grid grid-cols-7 text-center text-xs font-semibold text-[#9b9189]">
              {DAYS.map((d) => (
                <div key={d} className={d === "일" ? "text-red-500" : d === "토" ? "text-blue-400" : ""}>
                  {d}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const key = formatKey(day);
                const reserved = DUMMY_RESERVED[key];
                const isToday =
                  day === today.getDate() &&
                  month === today.getMonth() &&
                  year === today.getFullYear();
                const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const isSelected = selectedDate === key;
                const isFull = reserved && reserved.length >= 15;

                return (
                  <button
                    key={day}
                    disabled={isPast}
                    onClick={() => setSelectedDate(key)}
                    className={cn(
                      "relative flex h-10 w-full items-center justify-center rounded-lg text-sm transition-all",
                      isPast && "cursor-not-allowed opacity-30",
                      !isPast && !isSelected && "hover:bg-[#3B342F]/5",
                      isSelected && "bg-[#B98768] text-[#F7F3EB] font-bold",
                      isToday && !isSelected && "ring-1 ring-[#B98768]",
                      isFull && !isSelected && "text-red-400",
                      !isFull && !isPast && !isSelected && "text-[#3B342F]"
                    )}
                  >
                    {day}
                    {reserved && !isFull && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-yellow-400" />
                    )}
                    {isFull && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-red-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* 범례 */}
            <div className="mt-4 flex items-center justify-end gap-4 text-xs text-[#9b9189]">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-yellow-400" />
                일부 예약
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                마감
              </div>
            </div>
          </div>

          {/* 시간 슬롯 */}
          <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6">
            {selectedDate ? (
              <>
                <h3 className="mb-4 font-bold text-[#3B342F]">
                  {selectedDate.replace(/-/g, ".")} 예약현황
                </h3>
                <div className="space-y-2">
                  {HOURS.map((h) => {
                    const isBooked = reservedHours.includes(h);
                    return (
                      <div
                        key={h}
                        className={cn(
                          "flex items-center justify-between rounded-lg px-4 py-2.5 text-sm",
                          isBooked
                            ? "bg-red-50 text-red-400"
                            : "bg-[#F7F3EB]/60 text-[#3B342F]"
                        )}
                      >
                        <span>
                          {String(h).padStart(2, "0")}:00 –{" "}
                          {String(h + 1).padStart(2, "0")}:00
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            isBooked
                              ? "bg-red-900/50 text-red-500"
                              : "bg-emerald-50 text-emerald-700"
                          )}
                        >
                          {isBooked ? "예약됨" : "가능"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <Link
                  href={`/booking?date=${selectedDate}`}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#B98768] py-3 text-sm font-bold text-[#F7F3EB] transition-all hover:bg-[#a9785c] active:scale-95"
                >
                  <CalendarCheck className="h-4 w-4" />
                  이 날 예약하기
                </Link>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-20 text-center">
                <CalendarCheck className="h-12 w-12 text-[#D8CCBC]" />
                <p className="text-[#9b9189]">
                  왼쪽 캘린더에서 날짜를 선택하면
                  <br />
                  시간대별 예약현황을 볼 수 있어요
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
