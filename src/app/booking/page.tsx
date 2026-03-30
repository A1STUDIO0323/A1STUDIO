"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import {
  ChevronRight,
  Clock,
  User,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Timer,
} from "lucide-react";
import { cn, formatPrice, calcDurationHours } from "@/lib/utils";
import { BOOKING_STEPS, REFUND_POLICY, HOLD_TIMEOUT_MINUTES } from "@/lib/constants";
import { getMemberProfileByEmail, registerMemberProfile, setMemberPhoneByEmail } from "@/lib/member-role";

const AVAILABLE_HOURS = Array.from({ length: 15 }, (_, i) => i + 9);
const TOSS_SDK_URL = "https://js.tosspayments.com/v1/payment";

let tossScriptPromise: Promise<void> | null = null;
function loadTossScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as typeof window & { TossPayments?: unknown }).TossPayments) return Promise.resolve();
  if (tossScriptPromise) return tossScriptPromise;

  tossScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TOSS_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("토스 결제 스크립트를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });

  return tossScriptPromise;
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#F7F3EB]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B98768] border-t-transparent" />
      </div>
    }>
      <BookingContent />
    </Suspense>
  );
}

function BookingContent() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const initDate = searchParams.get("date") ?? "";

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(initDate);
  const [startHour, setStartHour] = useState<number | null>(null);
  const [endHour, setEndHour] = useState<number | null>(null);
  const [holdExpiry, setHoldExpiry] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [form, setForm] = useState({
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    headcount: 1,
    memo: "",
  });

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"TOSS" | "KAKAOPAY">("KAKAOPAY");

  // 로그인 회원은 기존 프로필 정보를 자동 채움
  useEffect(() => {
    const email = session?.user?.email;
    if (!email) return;

    const profile = getMemberProfileByEmail(email);
    setForm((prev) => ({
      ...prev,
      guestName: prev.guestName || session.user?.name || profile?.name || "",
      guestEmail: prev.guestEmail || email,
      guestPhone: prev.guestPhone || profile?.phone || "",
    }));

    registerMemberProfile({
      email,
      name: session.user?.name,
      phone: profile?.phone ?? null,
    });
  }, [session?.user?.email, session?.user?.name]);

  // 카운트다운 타이머
  useEffect(() => {
    if (!holdExpiry) return;
    timerRef.current = setInterval(() => {
      const diff = holdExpiry.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown("만료됨");
        clearInterval(timerRef.current!);
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${m}:${String(s).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [holdExpiry]);

  const totalHours =
    startHour !== null && endHour !== null ? endHour - startHour : 0;
  const pricePerHour = 15000; // 실제로는 pricing_rules에서 계산
  const totalAmount = totalHours * pricePerHour;

  const handleHoldSlot = async () => {
    // 실제 구현: POST /api/reservations/holds
    const expiry = new Date(Date.now() + HOLD_TIMEOUT_MINUTES * 60 * 1000);
    setHoldExpiry(expiry);
    setStep(2);
  };

  const handleSubmitInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (session?.user?.email) {
      registerMemberProfile({
        email: session.user.email,
        name: form.guestName,
        phone: form.guestPhone,
      });
      setMemberPhoneByEmail(session.user.email, form.guestPhone);
    }
    setStep(3);
  };

  const handlePayment = async () => {
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      if (paymentMethod === "KAKAOPAY") {
        const partnerUserId = session?.user?.email ?? form.guestPhone;
        const orderId = `ORD-${Date.now()}`;
        const itemName = `${selectedDate} ${String(startHour).padStart(2, "0")}:00 예약`;

        const res = await fetch("/api/payments/kakao/ready", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            partnerUserId,
            itemName,
            quantity: 1,
            totalAmount,
          }),
        });
        const data = (await res.json()) as { redirectUrl?: string; error?: string };
        if (!res.ok || !data.redirectUrl) {
          throw new Error(data.error ?? "카카오페이 결제 준비에 실패했습니다.");
        }
        window.location.href = data.redirectUrl;
        return;
      }

      const tossClientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!tossClientKey) {
        throw new Error("NEXT_PUBLIC_TOSS_CLIENT_KEY가 설정되지 않았습니다.");
      }

      await loadTossScript();
      const tossFactory = (window as typeof window & {
        TossPayments?: (clientKey: string) => {
          requestPayment: (
            method: string,
            payload: {
              amount: number;
              orderId: string;
              orderName: string;
              customerName: string;
              customerEmail?: string;
              customerMobilePhone?: string;
              successUrl: string;
              failUrl: string;
            }
          ) => Promise<void>;
        };
      }).TossPayments;

      if (!tossFactory) {
        throw new Error("토스 결제 객체를 찾을 수 없습니다.");
      }

      const orderId = `ORD-${Date.now()}`;
      const orderName = `${selectedDate} ${String(startHour).padStart(2, "0")}:00 예약`;
      const toss = tossFactory(tossClientKey);
      await toss.requestPayment("카드", {
        amount: totalAmount,
        orderId,
        orderName,
        customerName: form.guestName,
        customerEmail: form.guestEmail || undefined,
        customerMobilePhone: form.guestPhone || undefined,
        successUrl: `${window.location.origin}/booking/payment/toss/success`,
        failUrl: `${window.location.origin}/booking/payment/toss/fail`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "결제 중 오류가 발생했습니다. 다시 시도해 주세요.";
      setPaymentError(message);
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-[#3B342F]">예약하기</h1>
          <p className="mt-2 text-[#6f655d]">
            비회원도 예약 가능합니다 (이름·연락처 입력)
          </p>
        </div>

        {/* 단계 표시 */}
        <div className="mb-10 flex items-center justify-center gap-0">
          {BOOKING_STEPS.map((s, idx) => (
            <div key={s.step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all",
                    step === s.step
                      ? "bg-[#B98768] text-[#F7F3EB] shadow-lg shadow-[#B98768]/15"
                      : step > s.step
                        ? "bg-emerald-600 text-[#F7F3EB]"
                        : "border border-[#D8CCBC] text-[#9b9189]"
                  )}
                >
                  {step > s.step ? <CheckCircle2 className="h-5 w-5" /> : s.step}
                </div>
                <span
                  className={cn(
                    "mt-1.5 text-xs font-medium",
                    step >= s.step ? "text-[#3B342F]" : "text-[#b0a89e]"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {idx < BOOKING_STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-3 h-px w-12 -translate-y-3 sm:w-20",
                    step > s.step ? "bg-emerald-600" : "bg-[#F7F3EB]/10"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* 홀드 타이머 (2~3단계에서 표시) */}
        {holdExpiry && step > 1 && (
          <div className="mb-6 flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-600">
            <Timer className="h-4 w-4 animate-pulse" />
            <span>
              슬롯 홀드 중 — 결제까지 남은 시간:{" "}
              <span className="font-bold">{countdown}</span>
            </span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* 메인 폼 */}
          <div className="lg:col-span-2">

            {/* STEP 1: 시간 선택 */}
            {step === 1 && (
              <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6">
                <div className="mb-4 flex items-center gap-2 text-[#3B342F]">
                  <Clock className="h-5 w-5 text-[#B98768]" />
                  <h2 className="text-lg font-bold">시간 선택</h2>
                </div>

                <label className="mb-4 block">
                  <span className="mb-1 block text-sm font-medium text-[#3B342F]">
                    날짜
                  </span>
                  <input
                    type="date"
                    value={selectedDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] focus:border-[#B98768] focus:outline-none"
                  />
                </label>

                <div className="mb-4 grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[#3B342F]">
                      시작 시간
                    </span>
                    <select
                      value={startHour ?? ""}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setStartHour(v);
                        if (endHour && endHour <= v) setEndHour(null);
                      }}
                      className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] focus:border-[#B98768] focus:outline-none"
                    >
                      <option value="">선택</option>
                      {AVAILABLE_HOURS.map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[#3B342F]">
                      종료 시간
                    </span>
                    <select
                      value={endHour ?? ""}
                      onChange={(e) => setEndHour(Number(e.target.value))}
                      disabled={!startHour}
                      className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] focus:border-[#B98768] focus:outline-none disabled:opacity-40"
                    >
                      <option value="">선택</option>
                      {AVAILABLE_HOURS.filter((h) => h > (startHour ?? 0)).map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {totalHours > 0 && totalHours < 2 && (
                  <p className="mb-4 flex items-center gap-1.5 text-sm text-amber-500">
                    <AlertCircle className="h-4 w-4" />
                    최소 2시간 이상 예약해야 합니다.
                  </p>
                )}

                <button
                  onClick={handleHoldSlot}
                  disabled={!selectedDate || !startHour || !endHour || totalHours < 2}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#B98768] py-4 text-base font-bold text-[#F7F3EB] shadow-lg shadow-[#B98768]/10 transition-all hover:bg-[#a9785c] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  다음 단계 (정보 입력)
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* STEP 2: 정보 입력 */}
            {step === 2 && (
              <form
                onSubmit={handleSubmitInfo}
                className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6"
              >
                <div className="mb-4 flex items-center gap-2 text-[#3B342F]">
                  <User className="h-5 w-5 text-[#B98768]" />
                  <h2 className="text-lg font-bold">정보 입력</h2>
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[#3B342F]">
                      이름 <span className="text-red-400">*</span>
                    </span>
                    <input
                      type="text"
                      required
                      value={form.guestName}
                      onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                      placeholder="홍길동"
                      className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] placeholder:text-[#b0a89e] focus:border-[#B98768] focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[#3B342F]">
                      휴대폰 <span className="text-red-400">*</span>
                    </span>
                    <input
                      type="tel"
                      required
                      value={form.guestPhone}
                      onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
                      placeholder="01012345678"
                      className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] placeholder:text-[#b0a89e] focus:border-[#B98768] focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[#3B342F]">
                      이메일 (선택)
                    </span>
                    <input
                      type="email"
                      value={form.guestEmail}
                      onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                      placeholder="example@email.com"
                      className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] placeholder:text-[#b0a89e] focus:border-[#B98768] focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[#3B342F]">
                      인원 <span className="text-red-400">*</span>
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      required
                      value={form.headcount}
                      onChange={(e) => setForm({ ...form, headcount: Number(e.target.value) })}
                      className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] focus:border-[#B98768] focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-[#3B342F]">
                      메모 (선택)
                    </span>
                    <textarea
                      rows={3}
                      value={form.memo}
                      onChange={(e) => setForm({ ...form, memo: e.target.value })}
                      placeholder="요청사항을 입력하세요"
                      className="w-full resize-none rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] placeholder:text-[#b0a89e] focus:border-[#B98768] focus:outline-none"
                    />
                  </label>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-xl border border-[#D8CCBC] py-3 text-sm font-medium text-[#6f655d] hover:border-[#D8CCBC] hover:text-[#B98768] transition-all"
                  >
                    이전
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] rounded-xl bg-[#B98768] py-3 text-sm font-bold text-[#F7F3EB] hover:bg-[#a9785c] transition-all active:scale-95"
                  >
                    다음 단계 (결제)
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: 결제 */}
            {step === 3 && (
              <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6">
                <div className="mb-4 flex items-center gap-2 text-[#3B342F]">
                  <CreditCard className="h-5 w-5 text-[#B98768]" />
                  <h2 className="text-lg font-bold">결제</h2>
                </div>

                {/* 예약 요약 */}
                <div className="mb-6 space-y-2 rounded-xl border border-[#D8CCBC] bg-[#F7F3EB]/60 p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6f655d]">날짜</span>
                    <span className="text-[#3B342F]">{selectedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6f655d]">시간</span>
                    <span className="text-[#3B342F]">
                      {String(startHour).padStart(2, "0")}:00 –{" "}
                      {String(endHour).padStart(2, "0")}:00 ({totalHours}시간)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6f655d]">예약자</span>
                    <span className="text-[#3B342F]">
                      {form.guestName} / {form.guestPhone}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#D8CCBC] pt-2">
                    <span className="font-semibold text-[#3B342F]">총 금액</span>
                    <span className="text-lg font-extrabold text-[#B98768]">
                      {formatPrice(totalAmount)}
                    </span>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="mb-2 text-sm font-semibold text-[#3B342F]">결제 수단</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("KAKAOPAY")}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-sm font-semibold transition-all",
                        paymentMethod === "KAKAOPAY"
                          ? "border-[#FEE500] bg-[#FEE500]/30 text-[#3B342F]"
                          : "border-[#D8CCBC] bg-[#F7F3EB] text-[#6f655d]"
                      )}
                    >
                      카카오페이
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("TOSS")}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-sm font-semibold transition-all",
                        paymentMethod === "TOSS"
                          ? "border-[#B98768] bg-[#B98768]/15 text-[#3B342F]"
                          : "border-[#D8CCBC] bg-[#F7F3EB] text-[#6f655d]"
                      )}
                    >
                      토스페이
                    </button>
                  </div>
                </div>

                {paymentError && (
                  <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {paymentError}
                  </div>
                )}

                <button
                  onClick={handlePayment}
                  disabled={paymentLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#B98768] py-4 text-base font-bold text-[#F7F3EB] shadow-lg shadow-[#B98768]/10 transition-all hover:bg-[#a9785c] active:scale-95 disabled:opacity-60"
                >
                  {paymentLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#D8CCBC] border-t-white" />
                      결제 처리 중...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      {paymentMethod === "KAKAOPAY" ? "카카오페이" : "토스페이"}로 {formatPrice(totalAmount)} 결제하기
                    </>
                  )}
                </button>

                <button
                  onClick={() => setStep(2)}
                  className="mt-3 w-full rounded-xl border border-[#D8CCBC] py-3 text-sm text-[#6f655d] hover:border-[#D8CCBC] hover:text-[#B98768] transition-all"
                >
                  이전으로
                </button>
              </div>
            )}
          </div>

          {/* 사이드 패널: 환불규정 */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-5">
              <h3 className="mb-3 text-sm font-bold text-[#3B342F]">환불 규정</h3>
              <div className="space-y-2">
                {REFUND_POLICY.map((p) => (
                  <div
                    key={p.condition}
                    className="flex justify-between text-xs"
                  >
                    <span className="text-[#6f655d]">{p.condition}</span>
                    <span
                      className={cn(
                        "font-semibold",
                        p.refundRate === 100
                          ? "text-emerald-400"
                          : p.refundRate === 0
                            ? "text-red-400"
                            : "text-amber-500"
                      )}
                    >
                      {p.refundRate}% 환불
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-[#b0a89e]">
                천재지변·시설 장애 시 100% 환불
              </p>

              <div className="mt-5 border-t border-[#D8CCBC] pt-4">
                <h3 className="mb-2 text-sm font-bold text-[#3B342F]">유의사항</h3>
                <ul className="space-y-1.5 text-xs text-[#9b9189]">
                  <li>· 결제 후 10분 내 미완료 시 자동 취소</li>
                  <li>· 예약 시간 내 준비·정리 포함</li>
                  <li>· 음식물 반입 금지</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
