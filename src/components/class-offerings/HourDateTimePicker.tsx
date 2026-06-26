"use client";

// 정시(시간) 단위 전용 일시 선택기
// - native datetime-local 의 분(M) 휠을 크롬 달력 팝업이 막지 못하는 문제를 근본 해결
// - 날짜(input[type=date]) + 시각(select, 정시만) 으로 분리 → 분은 항상 :00, UI에 노출조차 안 됨
// - value/onChange 는 기존 datetime-local 과 동일한 "YYYY-MM-DDTHH:MM" 문자열 계약을 유지

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

export default function HourDateTimePicker({
  value,
  onChange,
  className,
  hourClassName,
}: Props) {
  const date = value.slice(0, 10); // YYYY-MM-DD
  const hour = value.length >= 13 ? value.slice(11, 13) : ""; // HH

  // 날짜·시각 둘 다 있을 때만 정시 문자열 방출, 하나라도 비면 "" (= 미지정)
  const emit = (nextDate: string, nextHour: string) => {
    if (nextDate && nextHour) onChange(`${nextDate}T${nextHour}:00`);
    else onChange("");
  };

  return (
    <div className="flex gap-2">
      <input
        type="date"
        value={date}
        onChange={(e) => emit(e.target.value, hour)}
        className={className}
        aria-label="날짜"
      />
      <select
        value={hour}
        onChange={(e) => emit(date, e.target.value)}
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
