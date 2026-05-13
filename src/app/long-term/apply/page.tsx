"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// 장기대관 신청 (고객용)
// - 어드민 페이지(/admin/long-term-bookings)의 입력 구조를 참고한 공개 신청 폼
// - 신청 시 status='REQUESTED'로 저장되며, 관리자에게 SMS+이메일로 알림
// - 결제/요금 산정은 관리자가 검토 후 별도 안내 (카카오페이 심사 중)

type FormState = {
  customerName: string;
  customerPhone: string;
  spaceType: "연습실" | "파티룸";
  usageMonth: string;
  dayOfWeek: string;
  usageDatesText: string;
  startHour: string;
  endHour: string;
  customerMemo: string;
};

const initialForm: FormState = {
  customerName: "",
  customerPhone: "",
  spaceType: "연습실",
  usageMonth: "",
  dayOfWeek: "",
  usageDatesText: "",
  startHour: "14",
  endHour: "18",
  customerMemo: "",
};

function parseDates(text: string): number[] {
  return Array.from(
    new Set(
      text
        .split(/[,\s/]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => parseInt(s.replace(/[^0-9]/g, ""), 10))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 31)
    )
  ).sort((a, b) => a - b);
}

function normalizePhone(text: string): string {
  return text.replace(/[^0-9]/g, "");
}

export default function LongTermApplyPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedDates = useMemo(() => parseDates(form.usageDatesText), [form.usageDatesText]);
  const startH = parseInt(form.startHour, 10);
  const endH = parseInt(form.endHour, 10);
  const hoursPerDay = Number.isFinite(startH) && Number.isFinite(endH) ? endH - startH : 0;
  const totalHours = hoursPerDay > 0 ? hoursPerDay * parsedDates.length : 0;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canSubmit =
    form.customerName.trim().length > 0 &&
    normalizePhone(form.customerPhone).length >= 9 &&
    form.usageMonth.trim().length > 0 &&
    parsedDates.length > 0 &&
    hoursPerDay > 0 &&
    !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/long-term/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          customerPhone: normalizePhone(form.customerPhone),
          spaceType: form.spaceType,
          usageMonth: form.usageMonth.trim(),
          dayOfWeek: form.dayOfWeek.trim() || null,
          usageDates: parsedDates,
          startHour: startH,
          endHour: endH,
          customerMemo: form.customerMemo.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "신청 처리 중 오류가 발생했습니다.");
        return;
      }
      setDone({ id: json.id });
    } catch (err) {
      console.error("[long-term/apply] submit failed", err);
      setError("네트워크 오류로 신청에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#F7F3EB] py-16">
        <div className="mx-auto max-w-xl px-4 sm:px-6">
          <div className="rounded-2xl border border-[#D8CCBC] bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
            <h1 className="mt-4 text-2xl font-extrabold text-[#3B342F]">신청이 접수되었습니다</h1>
            <p className="mt-3 text-sm text-[#6f655d]">
              담당자 확인 후 안내드리겠습니다. 빠른 답변을 위해 연락처를 잠시 확인해주세요.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <Link
                href="/"
                className="rounded-xl border border-[#D8CCBC] bg-white px-4 py-3 text-sm font-semibold text-[#3B342F] hover:border-[#B98768] hover:text-[#B98768]"
              >
                홈으로
              </Link>
              <Link
                href="/reservations/status"
                className="rounded-xl bg-[#B98768] px-4 py-3 text-sm font-semibold text-white hover:bg-[#a9785c]"
              >
                예약현황 보기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-12 sm:py-16">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/pricing#long-term"
          className="mb-4 inline-flex items-center gap-1 text-sm text-[#6f655d] hover:text-[#B98768]"
        >
          <ArrowLeft className="h-4 w-4" />
          요금 안내
        </Link>

        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">Long-term Booking</p>
          <h1 className="mt-1 text-3xl font-extrabold text-[#3B342F] sm:text-4xl">장기대관 신청</h1>
          <p className="mt-3 text-sm text-[#6f655d]">
            이용 희망 정보를 알려주시면 담당자가 검토 후 요금 및 일정 안내를 보내드립니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-[#D8CCBC] bg-white p-6 shadow-sm">
          {/* 이름 / 연락처 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="이름" required>
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => set("customerName", e.target.value)}
                placeholder="홍길동"
                className="form-input"
                maxLength={50}
                required
              />
            </Field>
            <Field label="연락처" required hint="숫자만 입력해도 됩니다">
              <input
                type="tel"
                value={form.customerPhone}
                onChange={(e) => set("customerPhone", e.target.value)}
                placeholder="01012345678"
                className="form-input"
                maxLength={20}
                required
              />
            </Field>
          </div>

          {/* 공간 유형 */}
          <Field label="공간 유형" required>
            <div className="flex gap-2">
              {(["연습실", "파티룸"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => set("spaceType", opt)}
                  className={cn(
                    "flex-1 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors",
                    form.spaceType === opt
                      ? "border-[#B98768] bg-[#B98768]/15 text-[#B98768]"
                      : "border-[#D8CCBC] bg-white text-[#6f655d] hover:border-[#B98768]/60"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </Field>

          {/* 이용월 / 요일 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="이용월" required hint="예: 6월">
              <input
                type="text"
                value={form.usageMonth}
                onChange={(e) => set("usageMonth", e.target.value)}
                placeholder="6월"
                className="form-input"
                maxLength={10}
                required
              />
            </Field>
            <Field label="요일 (선택)" hint="예: 월, 수, 금">
              <input
                type="text"
                value={form.dayOfWeek}
                onChange={(e) => set("dayOfWeek", e.target.value)}
                placeholder="월, 수, 금"
                className="form-input"
                maxLength={30}
              />
            </Field>
          </div>

          {/* 이용 날짜 */}
          <Field
            label="이용 희망 날짜"
            required
            hint="해당 월의 일(day)을 콤마로 구분해 입력 (예: 3, 10, 17, 24)"
          >
            <input
              type="text"
              value={form.usageDatesText}
              onChange={(e) => set("usageDatesText", e.target.value)}
              placeholder="3, 10, 17, 24"
              className="form-input"
              required
            />
            {parsedDates.length > 0 && (
              <p className="mt-1.5 text-xs text-[#6f655d]">
                인식된 날짜: <span className="font-semibold text-[#3B342F]">{parsedDates.join(", ")}</span> ({parsedDates.length}일)
              </p>
            )}
          </Field>

          {/* 시간 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="시작 시간" required hint="0~24 시 단위">
              <input
                type="number"
                min={0}
                max={24}
                value={form.startHour}
                onChange={(e) => set("startHour", e.target.value)}
                className="form-input"
                required
              />
            </Field>
            <Field label="종료 시간" required hint="시작보다 큰 값">
              <input
                type="number"
                min={0}
                max={24}
                value={form.endHour}
                onChange={(e) => set("endHour", e.target.value)}
                className="form-input"
                required
              />
            </Field>
          </div>

          {hoursPerDay > 0 && parsedDates.length > 0 && (
            <div className="rounded-xl border border-[#EFE7DA] bg-[#F7F3EB]/60 px-4 py-3 text-xs text-[#6f655d]">
              일일 이용시간 <span className="font-bold text-[#3B342F]">{hoursPerDay}시간</span> ·{" "}
              총 이용일수 <span className="font-bold text-[#3B342F]">{parsedDates.length}일</span> ·{" "}
              총 시간 <span className="font-bold text-[#3B342F]">{totalHours}시간</span>
            </div>
          )}

          {/* 메모 */}
          <Field label="요청사항 (선택)" hint="이용 목적, 인원, 특이사항 등">
            <textarea
              value={form.customerMemo}
              onChange={(e) => set("customerMemo", e.target.value)}
              placeholder="예: 보컬 그룹 정기 연습, 5명, 마이크 추가 필요"
              className="form-input min-h-[100px] resize-y"
              maxLength={2000}
            />
          </Field>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition-colors",
              canSubmit
                ? "bg-[#B98768] text-white hover:bg-[#a9785c]"
                : "cursor-not-allowed bg-[#D8CCBC] text-[#9b9189]"
            )}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "신청 중..." : "신청하기"}
          </button>

          <p className="text-center text-[11px] text-[#9b9189]">
            ※ 신청 후 담당자가 검토하여 요금·일정을 별도로 안내드립니다. 결제는 별도 안내 시 진행됩니다.
          </p>
        </form>
      </div>

      <style jsx>{`
        :global(.form-input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #d8ccbc;
          background: #ffffff;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: #3b342f;
          outline: none;
          transition: border-color 0.15s;
        }
        :global(.form-input:focus) {
          border-color: #b98768;
          box-shadow: 0 0 0 3px rgba(185, 135, 104, 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#3B342F]">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
        {hint && <span className="ml-2 font-normal text-[#9b9189]">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
