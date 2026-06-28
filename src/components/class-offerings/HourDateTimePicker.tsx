"use client";

import { useEffect, useState } from "react";

// 정시(시간) 단위 전용 일시 선택기
// - native datetime-local 의 분(M) 휠을 크롬 달력 팝업이 막지 못하는 문제를 근본 해결
// - 날짜(input[type=date]) + 시각(select, 정시만) 으로 분리 → 분은 항상 :00, UI에 노출조차 안 됨
// - value/onChange 는 기존 datetime-local 과 동일한 "YYYY-MM-DDTHH:MM" 문자열 계약을 유지
// - 부분 입력 보존: 한쪽(날짜 또는 시간)만 선택해도 그 값이 화면에 유지됨 →
//   둘 다 채워졌을 때만 부모에게 ISO 문자열 emit, 한쪽만 채워졌으면 부모는 "" 로 두고
//   내부 state 에서 부분 입력을 보존한다.

type Props = {
  value: string; // "YYYY-MM-DDTHH:MM" 또는 ""
  onChange: (next: string) => void;
  className?: string; // 날짜 input 에 적용
  hourClassName?: string; // 시각 select 에 적용 (생략 시 className 재사용)
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const period = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { value: String(h).padStart(2, "0"), label: `${period} ${h12}시` };
});

function deriveFromValue(value: string): { date: string; hour: string } {
  return {
    date: value.slice(0, 10),
    hour: value.length >= 13 ? value.slice(11, 13) : "",
  };
}

export default function HourDateTimePicker({
  value,
  onChange,
  className,
  hourClassName,
}: Props) {
  // 부모 value 가 완전체("...THH:MM") 가 아닐 때도 부분 입력을 보존하기 위해 내부 state 사용
  const initial = deriveFromValue(value);
  const [date, setDate] = useState<string>(initial.date);
  const [hour, setHour] = useState<string>(initial.hour);

  // 외부에서 value 가 의미있게(완전체로) 바뀌면 내부 동기화 (폼 리셋 등)
  useEffect(() => {
    if (!value) {
      // 외부에서 빈 값으로 리셋된 경우만 내부도 리셋 — 단순 부분 입력 emit "" 와 구분
      // 단순 emit "" 인 경우 내부 state 가 부분 입력으로 살아있어야 하므로,
      // 사용자가 한 번이라도 선택을 시작했으면(date 또는 hour 비어있지 않으면) 리셋하지 않음.
      return;
    }
    const next = deriveFromValue(value);
    if (next.date !== date) setDate(next.date);
    if (next.hour !== hour) setHour(next.hour);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = (nextDate: string, nextHour: string) => {
    if (nextDate && nextHour) onChange(`${nextDate}T${nextHour}:00`);
    else onChange(""); // 부모는 미지정으로 인식 — 내부 state 는 부분 입력 보존
  };

  const handleDateChange = (next: string) => {
    setDate(next);
    emit(next, hour);
  };

  const handleHourChange = (next: string) => {
    setHour(next);
    emit(date, next);
  };

  return (
    <div className="flex gap-2">
      <input
        type="date"
        value={date}
        onChange={(e) => handleDateChange(e.target.value)}
        className={className}
        aria-label="날짜"
      />
      <select
        value={hour}
        onChange={(e) => handleHourChange(e.target.value)}
        className={hourClassName ?? className}
        aria-label="시각 (정시)"
      >
        <option value="">시간</option>
        {HOUR_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
