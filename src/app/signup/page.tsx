"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState<"google" | "kakao" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedMarketing, setAgreedMarketing] = useState(false);
  const [step, setStep] = useState<"social" | "email">("social");
  const [error, setError] = useState<string | null>(null);

  const allRequiredAgreed = agreedPrivacy && agreedTerms;

  const handleGoogleSignup = async () => {
    if (!allRequiredAgreed) {
      setError("필수 약관에 동의해주세요.");
      return;
    }
    setLoading("google");
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/onboarding/profile`,
        },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e.message ?? "Google 회원가입 중 오류가 발생했습니다.");
      setLoading(null);
    }
  };

  const handleKakaoSignup = async () => {
    if (!allRequiredAgreed) {
      setError("필수 약관에 동의해주세요.");
      return;
    }
    setLoading("kakao");
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/onboarding/profile`,
        },
      });
      if (error) throw error;
    } catch (e: any) {
      setError(e.message ?? "카카오 회원가입 중 오류가 발생했습니다.");
      setLoading(null);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRequiredAgreed) {
      setError("필수 약관에 동의해주세요.");
      return;
    }
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    setLoading("email");
    setError(null);
    try {
      const response = await fetch("/api/auth/email-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "회원가입 실패");
      router.push("/onboarding/profile");
    } catch (e: any) {
      setError(e.message ?? "이메일 회원가입 중 오류가 발생했습니다.");
      setLoading(null);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--color-bg)" }}>

      {/* 헤더 로고 */}
      <Link href="/" className="mb-8 flex flex-col items-center gap-1 group">
        <span className="font-serif text-2xl tracking-[0.18em] uppercase"
          style={{ color: "var(--color-text)", fontFamily: "'Cormorant Garamond', serif" }}>
          A1 STUDIO
        </span>
        <span className="text-xs tracking-widest uppercase"
          style={{ color: "var(--color-text-muted)" }}>
          보컬 · 댄스 · 연기 · 뮤지컬
        </span>
      </Link>

      <div className="w-full max-w-md rounded-2xl border px-8 py-10 shadow-sm"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>

        {/* 타이틀 */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold mb-2"
            style={{ color: "var(--color-text)" }}>
            회원가입
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            서비스 이용을 위해 회원가입을 진행해주세요.
          </p>
        </div>

        {/* 약관 동의 */}
        <fieldset className="mb-6 rounded-xl border p-4"
          style={{ borderColor: "var(--color-border)" }}>
          <legend className="px-1 text-xs font-medium mb-2"
            style={{ color: "var(--color-text-muted)" }}>
            약관 동의
          </legend>

          {/* 전체 동의 */}
          <label className="flex items-center gap-3 mb-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreedPrivacy && agreedTerms && agreedMarketing}
              onChange={(e) => {
                setAgreedPrivacy(e.target.checked);
                setAgreedTerms(e.target.checked);
                setAgreedMarketing(e.target.checked);
              }}
              className="w-4 h-4 rounded accent-[var(--color-accent)]"
              aria-label="전체 동의"
            />
            <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
              전체 동의
            </span>
          </label>

          <div className="border-t mb-3" style={{ borderColor: "var(--color-border)" }} />

          {/* 개인정보 동의 */}
          <label className="flex items-center gap-3 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedPrivacy}
              onChange={(e) => setAgreedPrivacy(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--color-accent)]"
              aria-required="true"
              id="agree-privacy"
            />
            <span className="text-sm flex gap-1 items-center"
              style={{ color: "var(--color-text)" }}>
              <span className="text-xs px-1 py-0.5 rounded"
                style={{ background: "var(--color-accent)", color: "#fff" }}>필수</span>
              개인정보 수집 및 이용 동의
            </span>
            <Link href="/privacy" target="_blank"
              className="ml-auto text-xs underline"
              style={{ color: "var(--color-text-subtle)" }}>
              보기
            </Link>
          </label>

          {/* 이용약관 동의 */}
          <label className="flex items-center gap-3 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--color-accent)]"
              aria-required="true"
              id="agree-terms"
            />
            <span className="text-sm flex gap-1 items-center"
              style={{ color: "var(--color-text)" }}>
              <span className="text-xs px-1 py-0.5 rounded"
                style={{ background: "var(--color-accent)", color: "#fff" }}>필수</span>
              서비스 이용약관 동의
            </span>
            <Link href="/terms" target="_blank"
              className="ml-auto text-xs underline"
              style={{ color: "var(--color-text-subtle)" }}>
              보기
            </Link>
          </label>

          {/* 마케팅 동의 */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedMarketing}
              onChange={(e) => setAgreedMarketing(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--color-accent)]"
              id="agree-marketing"
            />
            <span className="text-sm flex gap-1 items-center"
              style={{ color: "var(--color-text-muted)" }}>
              <span className="text-xs px-1 py-0.5 rounded border"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
                선택
              </span>
              마케팅 수신 동의 (이벤트·할인 안내)
            </span>
          </label>
        </fieldset>

        {/* 에러 메시지 */}
        {error && (
          <div role="alert" className="mb-4 text-sm px-3 py-2 rounded-lg"
            style={{ background: "#FEE2E2", color: "#B91C1C" }}>
            {error}
          </div>
        )}

        {/* step: 소셜 가입 */}
        {step === "social" && (
          <div className="flex flex-col gap-3">
            {/* 구글 */}
            <button
              onClick={handleGoogleSignup}
              disabled={loading !== null}
              aria-label="구글로 회원가입"
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl border font-medium text-sm transition-all disabled:opacity-50"
              style={{
                borderColor: "var(--color-border)",
                background: "#fff",
                color: "var(--color-text)",
              }}>
              <GoogleIcon />
              {loading === "google" ? "연결 중..." : "구글로 회원가입"}
            </button>

            {/* 카카오 */}
            <button
              onClick={handleKakaoSignup}
              disabled={loading !== null}
              aria-label="카카오로 회원가입"
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
              style={{ background: "#FEE500", color: "#191919" }}>
              <KakaoIcon />
              {loading === "kakao" ? "연결 중..." : "카카오로 회원가입"}
            </button>

            {/* 구분선 */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 border-t" style={{ borderColor: "var(--color-border)" }} />
              <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>또는</span>
              <div className="flex-1 border-t" style={{ borderColor: "var(--color-border)" }} />
            </div>

            {/* 이메일 */}
            <button
              onClick={() => setStep("email")}
              disabled={loading !== null}
              aria-label="이메일로 회원가입"
              className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl border font-medium text-sm transition-all disabled:opacity-50"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-bg)",
                color: "var(--color-text)",
              }}>
              <EmailIcon />
              이메일로 회원가입
            </button>
          </div>
        )}

        {/* step: 이메일 가입 폼 */}
        {step === "email" && (
          <form onSubmit={handleEmailSignup} noValidate className="flex flex-col gap-4">
            <button type="button" onClick={() => setStep("social")}
              className="flex items-center gap-1 text-xs mb-1"
              style={{ color: "var(--color-text-muted)" }}>
              ← 뒤로
            </button>

            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm font-medium"
                style={{ color: "var(--color-text)" }}>
                이메일 <span aria-hidden="true" style={{ color: "var(--color-accent)" }}>*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 transition"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                }}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-medium"
                style={{ color: "var(--color-text)" }}>
                비밀번호 <span aria-hidden="true" style={{ color: "var(--color-accent)" }}>*</span>
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8자 이상"
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 transition"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                }}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="confirmPassword" className="text-sm font-medium"
                style={{ color: "var(--color-text)" }}>
                비밀번호 확인 <span aria-hidden="true" style={{ color: "var(--color-accent)" }}>*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호를 한 번 더 입력하세요"
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 transition"
                style={{
                  borderColor: "var(--color-border)",
                  background: "var(--color-bg)",
                  color: "var(--color-text)",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading !== null || !allRequiredAgreed}
              className="w-full py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 mt-2"
              style={{ background: "var(--color-accent)", color: "#fff" }}>
              {loading === "email" ? "처리 중..." : "가입하기"}
            </button>
          </form>
        )}

        {/* 안내 문구 */}
        <p className="mt-6 text-center text-xs leading-relaxed"
          style={{ color: "var(--color-text-subtle)" }}>
          가입 후 이름, 출생연도, 전화번호 입력이 필요합니다.
        </p>

        {/* 로그인 링크 */}
        <p className="mt-3 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium underline"
            style={{ color: "var(--color-accent)" }}>
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}

// ── 인라인 아이콘 ──────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd"
        d="M9 1C4.582 1 1 3.91 1 7.5c0 2.29 1.518 4.296 3.812 5.476l-.97 3.556a.3.3 0 0 0 .455.327L8.56 14.39A10.62 10.62 0 0 0 9 14.4c4.418 0 8-2.91 8-6.5S13.418 1 9 1Z"
        fill="#191919"/>
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}
