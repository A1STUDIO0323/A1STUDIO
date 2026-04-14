"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "@/lib/auth-client";
import { CheckCircle, X, Trash2, LogIn, Send, Clock, Calendar, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/lib/admin-context";
import { classRequestStore, type LocalClassRequest } from "@/lib/local-store";
import { useMemberRole } from "@/lib/member-role";

const DAYS_OF_WEEK = ["월", "화", "수", "목", "금", "토", "일"];

const TIME_SLOTS = [
  "09:00~11:00", "10:00~12:00", "11:00~13:00",
  "13:00~15:00", "14:00~16:00", "15:00~17:00",
  "16:00~18:00", "17:00~19:00", "18:00~20:00",
  "19:00~21:00", "20:00~22:00",
];

// ── 성공 모달 ──────────────────────────────────────────────────
function SuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3B342F]/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 text-center shadow-2xl">
        <CheckCircle className="mx-auto h-14 w-14 text-emerald-400" />
        <h2 className="mt-4 text-xl font-bold text-[#3B342F]">요청 완료!</h2>
        <p className="mt-2 text-sm text-[#6f655d]">
          클래스 요청이 접수되었습니다.<br />
          검토 후 개설 일정을 안내드리겠습니다.
        </p>
        <button onClick={onClose}
          className="mt-6 w-full rounded-full bg-emerald-600 py-3 text-sm font-bold text-[#F7F3EB] hover:bg-emerald-500 transition-colors">
          확인
        </button>
      </div>
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────
export default function ClassRequestsPage() {
  const { data: session, status } = useSession();
  const { isAdmin } = useAdmin();
  const { role, isMember } = useMemberRole(session?.user?.email);
  const [requests, setRequests] = useState<LocalClassRequest[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [form, setForm] = useState({
    genre: "",
    preferredTime: [] as string[],
    preferredDays: [] as string[],
    dateFrom: "",
    dateTo: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = () => setRequests(classRequestStore.getAll());

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const toggleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter((d) => d !== day)
        : [...prev.preferredDays, day],
    }));
  };

  const toggleTime = (slot: string) => {
    setForm((prev) => ({
      ...prev,
      preferredTime: prev.preferredTime.includes(slot)
        ? prev.preferredTime.filter((t) => t !== slot)
        : [...prev.preferredTime, slot],
    }));
  };

  const toYYMMDD = (iso: string) => iso.replace(/-/g, "").slice(2);

  const preferredDatesFormatted = () => {
    if (form.dateFrom && form.dateTo) return `${toYYMMDD(form.dateFrom)}~${toYYMMDD(form.dateTo)}`;
    if (form.dateFrom) return toYYMMDD(form.dateFrom);
    return "";
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.genre.trim()) e.genre = "원하는 장르를 입력해주세요.";
    if (form.preferredTime.length === 0) e.preferredTime = "원하는 시간대를 선택해주세요.";
    if (form.preferredDays.length === 0 && !form.dateFrom) {
      e.preferredDays = "원하는 요일 또는 날짜를 입력해주세요.";
    }
    if (form.dateFrom && form.dateTo && form.dateTo < form.dateFrom) {
      e.dateTo = "종료일은 시작일 이후여야 합니다.";
    }
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMember) {
      setErrors({ form: "클래스 요청 등록은 일반회원만 가능합니다." });
      return;
    }
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});

    classRequestStore.create({
      userName: session?.user?.name ?? "알 수 없음",
      userEmail: session?.user?.email ?? "",
      genre: form.genre.trim(),
      preferredTime: form.preferredTime.join(", "),
      preferredDays: form.preferredDays,
      preferredDates: preferredDatesFormatted(),
      message: form.message.trim(),
    });

    setForm({ genre: "", preferredTime: [], preferredDays: [], dateFrom: "", dateTo: "", message: "" });
    setShowSuccess(true);
  };

  // 비로그인 상태
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#F7F3EB] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#B98768] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#F7F3EB] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-10">
            <Music2 className="mx-auto h-12 w-12 text-[#b0a89e] mb-4" />
            <h2 className="text-xl font-bold text-[#3B342F] mb-2">회원 전용</h2>
            <p className="text-sm text-[#6f655d] mb-6 leading-relaxed">
              클래스 요청은 로그인한 회원만 이용할 수 있습니다.
            </p>
            <button
              onClick={() => signIn()}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-[#B98768] py-3 text-sm font-bold text-[#F7F3EB] hover:bg-[#a9785c] transition-colors"
            >
              <LogIn className="h-4 w-4" />
              로그인하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">One-Day Class</p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">클래스 요청</h1>
          <p className="mt-4 text-base text-[#6f655d] max-w-md mx-auto">
            원하는 장르, 시간, 날짜·요일을 선택해 클래스 개설을 요청해보세요.
          </p>
          <p className="mt-3 text-xs text-[#9b9189]">
            현재 회원등급:{" "}
            <span className="font-semibold text-[#3B342F]">
              {role === "CM" ? "CM(클래스마스터)" : "일반회원"}
            </span>
          </p>
        </div>

        {/* 요청 폼 */}
        {!isMember && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            클래스 요청 등록은 일반회원만 가능합니다. CM은 클래스 공고 등록 메뉴를 이용해주세요.
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6 space-y-6">
          {/* 원하는 장르 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#3B342F] mb-2">
              <Music2 className="h-4 w-4 text-emerald-400" />
              원하는 장르 *
            </label>
            <input
              type="text"
              value={form.genre}
              onChange={(e) => { setForm({ ...form, genre: e.target.value }); setErrors({ ...errors, genre: "" }); }}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-emerald-500 focus:outline-none"
              placeholder="예: 보컬, 댄스, 연기, 뮤지컬, K-POP 등"
            />
            {errors.genre && <p className="mt-1 text-xs text-red-400">{errors.genre}</p>}
          </div>

          {/* 원하는 시간 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#3B342F] mb-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              원하는 시간대 <span className="text-[#9b9189] font-normal text-xs ml-1">(복수 선택 가능) *</span>
            </label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => { toggleTime(slot); setErrors({ ...errors, preferredTime: "" }); }}
                  className={cn(
                    "rounded-lg border py-2 text-xs font-medium transition-all",
                    form.preferredTime.includes(slot)
                      ? "border-emerald-500 bg-emerald-600 text-[#F7F3EB]"
                      : "border-[#D8CCBC] bg-[#F7F3EB] text-[#6f655d] hover:border-[#D8CCBC] hover:text-[#B98768]"
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
            {errors.preferredTime && <p className="mt-1 text-xs text-red-400">{errors.preferredTime}</p>}
          </div>

          {/* 원하는 요일 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#3B342F] mb-2">
              <Calendar className="h-4 w-4 text-emerald-400" />
              원하는 요일 <span className="text-[#9b9189] font-normal text-xs ml-1">(복수 선택 가능)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => { toggleDay(day); setErrors({ ...errors, preferredDays: "" }); }}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold transition-all",
                    form.preferredDays.includes(day)
                      ? "border-emerald-500 bg-emerald-600 text-[#F7F3EB]"
                      : "border-[#D8CCBC] bg-[#F7F3EB] text-[#6f655d] hover:border-[#D8CCBC] hover:text-[#B98768]",
                    (day === "토" || day === "일") && !form.preferredDays.includes(day)
                      ? "text-red-400/70"
                      : ""
                  )}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* 특정 날짜 범위 선택 */}
            <div className="mt-3">
              <label className="block text-xs text-[#9b9189] mb-1.5">
                특정 날짜가 있다면 선택해주세요 <span className="text-[#b0a89e]">(선택)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={form.dateFrom}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((prev) => ({ ...prev, dateFrom: v, dateTo: prev.dateTo && prev.dateTo < v ? "" : prev.dateTo }));
                    setErrors((prev) => ({ ...prev, preferredDays: "", dateTo: "" }));
                  }}
                  className="flex-1 rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-sm font-semibold text-[#9b9189] shrink-0">~</span>
                <input
                  type="date"
                  value={form.dateTo}
                  min={form.dateFrom || undefined}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, dateTo: e.target.value }));
                    setErrors((prev) => ({ ...prev, dateTo: "" }));
                  }}
                  className="flex-1 rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] focus:border-emerald-500 focus:outline-none"
                />
              </div>
              {form.dateFrom && (
                <p className="mt-1.5 text-[11px] text-emerald-500 font-mono tracking-wide">
                  {toYYMMDD(form.dateFrom)}{form.dateTo ? `~${toYYMMDD(form.dateTo)}` : ""}
                </p>
              )}
              {errors.dateTo && <p className="mt-1 text-xs text-red-400">{errors.dateTo}</p>}
            </div>
            {errors.preferredDays && <p className="mt-1 text-xs text-red-400">{errors.preferredDays}</p>}
          </div>

          {/* 추가 메모 */}
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">
              추가 요청사항 <span className="text-[#b0a89e]">(선택)</span>
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              maxLength={500}
              rows={3}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-emerald-500 focus:outline-none resize-none"
              placeholder="원하는 수준, 인원, 기타 요청사항 등"
            />
          </div>

          <button
            type="submit"
            disabled={!isMember}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-emerald-600 py-3 text-sm font-bold text-[#F7F3EB] hover:bg-emerald-500 transition-all active:scale-95"
          >
            <Send className="h-4 w-4" />
            클래스 요청 제출
          </button>
          {errors.form && <p className="text-xs text-red-400">{errors.form}</p>}
        </form>

        {/* 관리자: 요청 목록 */}
        {isAdmin && (
          <div className="mt-14">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-[#3B342F]">요청 목록 <span className="text-[#9b9189] font-normal text-base ml-1">({requests.length}건)</span></h2>
              <button onClick={load} className="text-xs text-[#9b9189] hover:text-[#3B342F] transition-colors">새로고침</button>
            </div>
            {requests.length === 0 ? (
              <p className="text-center py-12 text-[#b0a89e]">접수된 클래스 요청이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div key={req.id} className="rounded-xl border border-[#D8CCBC] bg-[#EFE7DA] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                            {req.genre}
                          </span>
                          <span className="text-xs text-[#9b9189]">
                            {new Date(req.createdAt).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[#6f655d] mb-2">
                          <span><span className="text-[#b0a89e]">요청자</span> {req.userName}</span>
                          <span><span className="text-[#b0a89e]">시간</span> {req.preferredTime}</span>
                          {req.preferredDays.length > 0 && (
                            <span><span className="text-[#b0a89e]">요일</span> {req.preferredDays.join(", ")}</span>
                          )}
                          {req.preferredDates && (
                            <span><span className="text-[#b0a89e]">날짜</span> {req.preferredDates}</span>
                          )}
                        </div>
                        {req.message && (
                          <p className="text-xs text-[#9b9189] bg-[#F7F3EB]/50 rounded-lg px-3 py-2 line-clamp-2">{req.message}</p>
                        )}
                      </div>
                      <button
                        onClick={() => { classRequestStore.delete(req.id); load(); }}
                        className="shrink-0 rounded-lg p-1.5 text-[#b0a89e] hover:bg-red-50 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showSuccess && <SuccessModal onClose={() => { setShowSuccess(false); if (isAdmin) load(); }} />}
    </div>
  );
}
