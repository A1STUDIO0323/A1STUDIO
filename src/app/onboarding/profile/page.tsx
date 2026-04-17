"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [birthYearError, setBirthYearError] = useState<string | null>(null);

  // 로그인 여부 확인
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/signup");
      }
    };
    checkSession();
  }, []);

  const validateName = (value: string) => {
    if (value.length < 2) return "이름은 2자 이상이어야 합니다.";
    if (value.length > 20) return "이름은 20자 이하이어야 합니다.";
    return null;
  };

  const validateBirthYear = (value: string) => {
    if (!/^\d{4}$/.test(value)) return "출생연도는 4자리 숫자로 입력해주세요.";
    const year = parseInt(value, 10);
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear) return `1900 ~ ${currentYear} 사이의 연도를 입력해주세요.`;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nErr = validateName(name);
    const bErr = validateBirthYear(birthYear);
    setNameError(nErr);
    setBirthYearError(bErr);
    if (nErr || bErr) return;

    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("인증 정보를 확인할 수 없습니다.");

      const response = await fetch("/api/members/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          birthYear: parseInt(birthYear, 10),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "프로필 저장 실패");

      router.push("/onboarding/phone");
    } catch (e: any) {
      setError(e.message ?? "오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();

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
        <StepIndicator current={1} total={2} />
      </div>

      <div className="w-full max-w-md rounded-2xl border px-8 py-10 shadow-sm"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>

        {/* 타이틀 */}
        <div className="mb-8">
          <p className="text-xs tracking-widest uppercase mb-2"
            style={{ color: "var(--color-accent)" }}>
            Step 1 of 2
          </p>
          <h1 className="text-2xl font-semibold mb-2"
            style={{ color: "var(--color-text)" }}>
            추가 정보 입력
          </h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            서비스 이용을 위해 기본 정보를 입력해주세요.
          </p>
        </div>

        {/* 에러 */}
        {error && (
          <div role="alert" className="mb-4 text-sm px-3 py-2 rounded-lg"
            style={{ background: "#FEE2E2", color: "#B91C1C" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {/* 이름 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium"
              style={{ color: "var(--color-text)" }}>
              이름{" "}
              <span aria-hidden="true" style={{ color: "var(--color-accent)" }}>*</span>
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
              }}
              onBlur={() => setNameError(validateName(name))}
              placeholder="홍길동"
              maxLength={20}
              aria-describedby={nameError ? "name-error" : "name-hint"}
              aria-invalid={!!nameError}
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition"
              style={{
                borderColor: nameError ? "#EF4444" : "var(--color-border)",
                background: "var(--color-bg)",
                color: "var(--color-text)",
              }}
            />
            {nameError ? (
              <p id="name-error" role="alert" className="text-xs"
                style={{ color: "#EF4444" }}>
                {nameError}
              </p>
            ) : (
              <p id="name-hint" className="text-xs"
                style={{ color: "var(--color-text-subtle)" }}>
                2~20자 이내로 입력해주세요.
              </p>
            )}
          </div>

          {/* 출생연도 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="birthYear" className="text-sm font-medium"
              style={{ color: "var(--color-text)" }}>
              출생연도{" "}
              <span aria-hidden="true" style={{ color: "var(--color-accent)" }}>*</span>
            </label>
            <input
              id="birthYear"
              type="text"
              inputMode="numeric"
              pattern="\d{4}"
              required
              value={birthYear}
              onChange={(e) => {
                // 숫자만 허용, 최대 4자리
                const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                setBirthYear(val);
                setBirthYearError(null);
              }}
              onBlur={() => setBirthYearError(validateBirthYear(birthYear))}
              placeholder={`예: ${currentYear - 25}`}
              maxLength={4}
              aria-describedby={birthYearError ? "birthyear-error" : "birthyear-hint"}
              aria-invalid={!!birthYearError}
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition"
              style={{
                borderColor: birthYearError ? "#EF4444" : "var(--color-border)",
                background: "var(--color-bg)",
                color: "var(--color-text)",
              }}
            />
            {birthYearError ? (
              <p id="birthyear-error" role="alert" className="text-xs"
                style={{ color: "#EF4444" }}>
                {birthYearError}
              </p>
            ) : (
              <p id="birthyear-hint" className="text-xs"
                style={{ color: "var(--color-text-subtle)" }}>
                4자리 숫자로 입력해주세요. (예: 1995)
              </p>
            )}
          </div>

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 mt-2"
            style={{ background: "var(--color-accent)", color: "#fff" }}>
            {loading ? "저장 중..." : "다음 단계 — 전화번호 인증"}
          </button>
        </form>

        {/* 안내 */}
        <p className="mt-4 text-xs text-center"
          style={{ color: "var(--color-text-subtle)" }}>
          입력하신 정보는 예약 서비스 이용 목적으로만 활용됩니다.
        </p>
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
            background: i < current
              ? "var(--color-accent)"
              : "var(--color-border)",
          }}
        />
      ))}
    </div>
  );
}
