"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/lib/auth-client";

const SIGNUP_CONSENT_COOKIE = "a1_signup_consent";

/**
 * OAuth 직전에 약관 동의 내용을 쿠키에 담는다.
 * 콜백(`/auth/callback`)에서 이 쿠키를 읽어 DB에 영구 저장한다.
 * SameSite=Lax 이므로 OAuth 제공자에서 우리 도메인으로 복귀하는 top-level GET 에서도 전송된다.
 */
function setConsentCookie(marketing: boolean) {
  const payload = encodeURIComponent(
    JSON.stringify({ privacy: true, terms: true, marketing })
  );
  document.cookie = `${SIGNUP_CONSENT_COOKIE}=${payload}; path=/; max-age=600; samesite=lax`;
}

function SignupContent() {
  const router = useRouter();
  const supabase = createClient();
  const { data: session, status } = useSession();

  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedMarketing, setAgreedMarketing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"google" | "kakao" | "submit" | null>(null);

  // 로그인 상태인데 약관 미동의(=로그인 버튼으로 우회 가입)인지 판별
  // null=확인 중, true=약관 동의 게이트 표시, false=일반 회원가입(OAuth 버튼)
  const [needConsent, setNeedConsent] = useState<boolean | null>(null);

  const isAuthed = status === "authenticated" && !!session?.user;
  const allRequiredAgreed = agreedPrivacy && agreedTerms;

  // 인증 상태에 따라 약관 동의 게이트 필요 여부 결정
  useEffect(() => {
    if (status === "loading") return;

    if (!isAuthed) {
      setNeedConsent(false); // 비로그인 → 일반 회원가입 화면(OAuth 버튼)
      return;
    }

    let cancelled = false;
    // 로그인 상태: 이미 필수약관에 동의한 회원인지 확인
    void fetch("/api/members/profile", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { profile?: { termsAgreed?: boolean } | null }) => {
        if (cancelled) return;
        if (data.profile?.termsAgreed) {
          // 이미 동의 완료된 회원 → 회원가입 불필요, 홈으로
          console.log("[signup] 이미 약관 동의 완료 → 홈으로 이동");
          router.replace("/");
        } else {
          console.log("[signup] 약관 미동의 로그인 사용자 → 약관 동의 게이트 표시");
          setNeedConsent(true);
        }
      })
      .catch((e) => {
        console.error("[signup] 약관 동의 상태 확인 실패", e);
        if (!cancelled) setNeedConsent(true);
      });

    return () => {
      cancelled = true;
    };
  }, [status, isAuthed, router]);

  const handleGoogleSignup = async () => {
    if (!allRequiredAgreed) {
      setError("필수 약관에 동의해주세요.");
      return;
    }
    setLoading("google");
    setError(null);
    try {
      setConsentCookie(agreedMarketing);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/onboarding/profile`,
        },
      });
      if (error) throw error;
    } catch (e: any) {
      console.error("[signup] Google 회원가입 오류", e);
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
      setConsentCookie(agreedMarketing);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/onboarding/profile`,
          scopes: "profile_nickname account_email name birthyear phone_number",
        },
      });
      if (error) throw error;
    } catch (e: any) {
      console.error("[signup] 카카오 회원가입 오류", e);
      setError(e.message ?? "카카오 회원가입 중 오류가 발생했습니다.");
      setLoading(null);
    }
  };

  // 로그인 우회 가입자: 약관 동의만 받아 가입 완료
  const handleAgreeAndContinue = async () => {
    if (!allRequiredAgreed) {
      setError("필수 약관에 동의해주세요.");
      return;
    }
    setLoading("submit");
    setError(null);
    try {
      console.log("[signup] 약관 동의 저장 요청");
      const res = await fetch("/api/members/agree-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketing: agreedMarketing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "약관 동의 저장에 실패했습니다.");
      console.log("[signup] 약관 동의 저장 완료 → 온보딩으로 이동");
      router.replace("/onboarding/profile");
    } catch (e: any) {
      console.error("[signup] 약관 동의 저장 오류", e);
      setError(e.message ?? "약관 동의 저장 중 오류가 발생했습니다.");
      setLoading(null);
    }
  };

  // 약관 동의 게이트(로그인 우회 가입자)인지 여부
  const consentGateMode = isAuthed && needConsent === true;
  // 인증 확인 중(깜빡임 방지)
  const checking = status === "loading" || (isAuthed && needConsent === null);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--color-bg)" }}
    >
      {/* 헤더 로고 */}
      <Link href="/" className="mb-8 flex flex-col items-center gap-1 group">
        <span
          className="font-serif text-2xl tracking-[0.18em] uppercase"
          style={{ color: "var(--color-text)", fontFamily: "'Cormorant Garamond', serif" }}
        >
          A1 STUDIO
        </span>
        <span
          className="text-xs tracking-widest uppercase"
          style={{ color: "var(--color-text-muted)" }}
        >
          보컬 · 댄스 · 연기 · 뮤지컬
        </span>
      </Link>

      <div
        className="w-full max-w-md rounded-2xl border px-8 py-10 shadow-sm"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {/* 타이틀 */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: "var(--color-text)" }}>
            회원가입
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {consentGateMode
              ? "거의 다 됐어요! 약관에 동의하면 가입이 완료됩니다."
              : "서비스 이용을 위해 회원가입을 진행해주세요."}
          </p>
        </div>

        {checking ? (
          <p className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            확인 중...
          </p>
        ) : (
          <>
            {/* 약관 동의 */}
            <fieldset className="mb-6 rounded-xl border p-4" style={{ borderColor: "var(--color-border)" }}>
              <legend className="px-1 text-xs font-medium mb-2" style={{ color: "var(--color-text-muted)" }}>
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
                <span className="text-sm flex gap-1 items-center" style={{ color: "var(--color-text)" }}>
                  <span
                    className="text-xs px-1 py-0.5 rounded"
                    style={{ background: "var(--color-accent)", color: "#fff" }}
                  >
                    필수
                  </span>
                  개인정보 수집 및 이용 동의
                </span>
                <Link
                  href="/privacy"
                  target="_blank"
                  className="ml-auto text-xs underline"
                  style={{ color: "var(--color-text-subtle)" }}
                >
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
                <span className="text-sm flex gap-1 items-center" style={{ color: "var(--color-text)" }}>
                  <span
                    className="text-xs px-1 py-0.5 rounded"
                    style={{ background: "var(--color-accent)", color: "#fff" }}
                  >
                    필수
                  </span>
                  서비스 이용약관 동의
                </span>
                <Link
                  href="/terms"
                  target="_blank"
                  className="ml-auto text-xs underline"
                  style={{ color: "var(--color-text-subtle)" }}
                >
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
                <span className="text-sm flex gap-1 items-center" style={{ color: "var(--color-text-muted)" }}>
                  <span
                    className="text-xs px-1 py-0.5 rounded border"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
                  >
                    선택
                  </span>
                  마케팅 수신 동의 (이벤트·할인 안내)
                </span>
              </label>
            </fieldset>

            {/* 에러 메시지 */}
            {error && (
              <div
                role="alert"
                className="mb-4 text-sm px-3 py-2 rounded-lg"
                style={{ background: "#FEE2E2", color: "#B91C1C" }}
              >
                {error}
              </div>
            )}

            {consentGateMode ? (
              /* 로그인 우회 가입자: 약관 동의만 받아 완료 */
              <button
                onClick={handleAgreeAndContinue}
                disabled={loading !== null}
                className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
                style={{ background: "var(--color-accent)", color: "#fff" }}
              >
                {loading === "submit" ? "처리 중..." : "동의하고 시작하기"}
              </button>
            ) : (
              /* 신규 가입: 소셜 회원가입 버튼 */
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
                  }}
                >
                  <GoogleIcon />
                  {loading === "google" ? "연결 중..." : "구글로 회원가입"}
                </button>

                {/* 카카오 */}
                <button
                  onClick={handleKakaoSignup}
                  disabled={loading !== null}
                  aria-label="카카오로 회원가입"
                  className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
                  style={{ background: "#FEE500", color: "#191919" }}
                >
                  <KakaoIcon />
                  {loading === "kakao" ? "연결 중..." : "카카오로 회원가입"}
                </button>
              </div>
            )}

            {/* 안내 문구 */}
            <p className="mt-6 text-center text-xs leading-relaxed" style={{ color: "var(--color-text-subtle)" }}>
              가입 후 이름, 출생연도, 전화번호 입력이 필요합니다.
            </p>

            {/* 로그인 링크 (비로그인 상태에서만) */}
            {!consentGateMode && (
              <p className="mt-3 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                이미 계정이 있으신가요?{" "}
                <Link href="/login" className="font-medium underline" style={{ color: "var(--color-accent)" }}>
                  로그인
                </Link>
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  );
}

// ── 인라인 아이콘 ──────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 1C4.582 1 1 3.91 1 7.5c0 2.29 1.518 4.296 3.812 5.476l-.97 3.556a.3.3 0 0 0 .455.327L8.56 14.39A10.62 10.62 0 0 0 9 14.4c4.418 0 8-2.91 8-6.5S13.418 1 9 1Z"
        fill="#191919"
      />
    </svg>
  );
}
