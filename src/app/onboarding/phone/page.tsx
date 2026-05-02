"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type PhoneStep = "input" | "verify";

export default function OnboardingPhonePage() {
  const router = useRouter();
  const supabase = createClient();

  const [phoneStep, setPhoneStep] = useState<PhoneStep>("input");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPhoneDuplicate, setIsPhoneDuplicate] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 온보딩 완료 전 모든 이동 차단
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, "", window.location.pathname);
      alert("전화번호 인증을 완료해주세요.");
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");

      if (link && !link.getAttribute("href")?.startsWith("#")) {
        e.preventDefault();
        e.stopPropagation();
        alert("전화번호 인증을 완료해주세요.");
        return false;
      }
    };

    window.history.pushState(null, "", window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.replace("/signup");
    };
    checkSession();
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const validatePhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!/^01[0-9]{8,9}$/.test(digits)) return "올바른 휴대폰 번호를 입력해주세요. (예: 010-1234-5678)";
    return null;
  };

  const startCountdown = (seconds = 180) => {
    setCountdown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatCountdown = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const handleSendCode = async () => {
    const pErr = validatePhone(phone);
    setPhoneError(pErr);
    if (pErr) return;

    setLoading(true);
    setError(null);
    try {
      const digits = phone.replace(/\D/g, "");
      const response = await fetch("/api/auth/sms/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "인증번호 발송 실패");

      setPhoneStep("verify");
      startCountdown(180);
    } catch (e: any) {
      setError(e.message ?? "인증번호 발송 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    setCode("");
    setCodeError(null);
    setLoading(true);
    setError(null);
    try {
      const digits = phone.replace(/\D/g, "");
      const response = await fetch("/api/auth/sms/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "재발송 실패");
      startCountdown(180);
    } catch (e: any) {
      setError(e.message ?? "재발송 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setCodeError("인증번호 6자리를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    setCodeError(null);
    try {
      const digits = phone.replace(/\D/g, "");
      const response = await fetch("/api/auth/sms/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits, code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "인증 실패");

      const normalizedPhone = digits;

      // 프로필 업데이트 (전화번호 저장)
      const profileRes = await fetch("/api/members/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizedPhone,
          phoneVerified: true,
        }),
      });

      const profileData = await profileRes.json();

      if (!profileRes.ok) {
        if (profileData.errorCode === "PHONE_ALREADY_EXISTS") {
          setError("이 전화번호는 이미 다른 계정에서 사용 중입니다.");
          setIsPhoneDuplicate(true);
        } else {
          setError(profileData.error || "프로필 업데이트에 실패했습니다.");
          setIsPhoneDuplicate(false);
        }
        setLoading(false);
        return;
      }

      // 성공 시 홈으로 이동
      if (timerRef.current) clearInterval(timerRef.current);
      router.push("/");
    } catch (e: any) {
      setCodeError(e.message ?? "인증번호가 올바르지 않습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--color-bg)" }}>

      {/* 로고 */}
      <Link href="/" className="mb-8 flex flex-col items-center gap-1">
        <span className="font-serif text-2xl tracking-[0.18em] uppercase"
          style={{ color: "var(--color-text)", fontFamily: "'Cormorant Garamond', serif" }}>
          A1 STUDIO
        </span>
      </Link>

      {/* 진행 상태 */}
      <div className="w-full max-w-md mb-4">
        <StepIndicator current={2} total={2} />
      </div>

      <div className="w-full max-w-md rounded-2xl border px-8 py-10 shadow-sm"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>

        {/* 온보딩 폼 */}
        <div className="mb-8">
          <p className="text-xs tracking-widest uppercase mb-2"
            style={{ color: "var(--color-accent)" }}>
            Step 2 of 2
          </p>
          <h1 className="text-2xl font-semibold mb-2"
            style={{ color: "var(--color-text)" }}>
            전화번호 인증
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {phoneStep === "input"
              ? "예약 확인 및 알림 수신에 사용됩니다."
              : `${phone}으로 발송된 인증번호를 입력해주세요.`}
          </p>
        </div>

        {error && (
          <div role="alert" className="mb-4 text-sm px-3 py-2 rounded-lg"
            style={{ background: "#FEE2E2", color: "#B91C1C" }}>
            <p>{error}</p>
            {isPhoneDuplicate && (
              <p className="mt-1">
                <Link href="/find-account" className="underline font-semibold">여기</Link>
                를 눌러 계정을 찾으세요.
              </p>
            )}
          </div>
        )}

        {/* 전화번호 입력 */}
        {phoneStep === "input" && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-sm font-medium"
                style={{ color: "var(--color-text)" }}>
                전화번호{" "}
                <span aria-hidden="true" style={{ color: "var(--color-accent)" }}>*</span>
              </label>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(formatPhone(e.target.value));
                  setPhoneError(null);
                }}
                onBlur={() => setPhoneError(validatePhone(phone))}
                placeholder="010-1234-5678"
                aria-describedby={phoneError ? "phone-error" : "phone-hint"}
                aria-invalid={!!phoneError}
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition"
                style={{
                  borderColor: phoneError ? "#EF4444" : "var(--color-border)",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                }}
              />
              {phoneError ? (
                <p id="phone-error" role="alert" className="text-xs"
                  style={{ color: "#EF4444" }}>
                  {phoneError}
                </p>
              ) : (
                <p id="phone-hint" className="text-xs"
                  style={{ color: "var(--color-text-subtle)" }}>
                  국내 휴대폰 번호만 지원합니다.
                </p>
              )}
            </div>

            <button
              onClick={handleSendCode}
              disabled={loading}
              className="w-full py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
              style={{ background: "var(--color-accent)", color: "#fff" }}>
              {loading ? "발송 중..." : "인증번호 받기"}
            </button>
          </div>
        )}

        {/* 인증번호 확인 */}
        {phoneStep === "verify" && (
          <div className="flex flex-col gap-5">
            {/* 전화번호 변경 */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl"
              style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}>
              <span className="text-sm" style={{ color: "var(--color-text)" }}>{phone}</span>
              <button
                onClick={() => {
                  setPhoneStep("input");
                  setCode("");
                  setError(null);
                  setCodeError(null);
                  if (timerRef.current) clearInterval(timerRef.current);
                }}
                className="text-xs underline"
                style={{ color: "var(--color-accent)" }}>
                변경
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="code" className="text-sm font-medium"
                  style={{ color: "var(--color-text)" }}>
                  인증번호{" "}
                  <span aria-hidden="true" style={{ color: "var(--color-accent)" }}>*</span>
                </label>
                {countdown > 0 && (
                  <span className="text-xs font-mono"
                    style={{ color: countdown < 30 ? "#EF4444" : "var(--color-text-muted)" }}>
                    {formatCountdown(countdown)}
                  </span>
                )}
              </div>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setCodeError(null);
                }}
                placeholder="6자리 입력"
                aria-describedby={codeError ? "code-error" : undefined}
                aria-invalid={!!codeError}
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition tracking-[0.3em] text-center font-mono"
                style={{
                  borderColor: codeError ? "#EF4444" : "var(--color-border)",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                }}
              />
              {codeError && (
                <p id="code-error" role="alert" className="text-xs"
                  style={{ color: "#EF4444" }}>
                  {codeError}
                </p>
              )}
            </div>

            <button
              onClick={handleVerifyCode}
              disabled={loading || code.length !== 6}
              className="w-full py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
              style={{ background: "var(--color-accent)", color: "#fff" }}>
              {loading ? "확인 중..." : "인증 확인"}
            </button>

            {/* 재발송 */}
            <div className="text-center">
              <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                인증번호를 받지 못하셨나요?{" "}
              </span>
              <button
                onClick={handleResendCode}
                disabled={countdown > 0 || loading}
                className="text-xs underline disabled:opacity-40"
                style={{ color: "var(--color-accent)" }}>
                {countdown > 0 ? `${formatCountdown(countdown)} 후 재발송` : "재발송"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ── 스텝 인디케이터 ─────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`${total}단계 중 ${current}단계`}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 h-1.5 rounded-full transition-all"
          style={{
            background: i < current ? "var(--color-accent)" : "var(--color-border)",
          }}
        />
      ))}
    </div>
  );
}
