"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STUDIO_NAME } from "@/lib/constants";

function ResetPasswordContent() {
  const router = useRouter();
  const recovery = useMemo(() => {
    if (typeof window === "undefined") {
      return { accessToken: "", refreshToken: "" };
    }
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = hash.get("access_token") ?? "";
    const refreshToken = hash.get("refresh_token") ?? "";
    return { accessToken, refreshToken };
  }, []);

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccess("");

    if (!recovery.accessToken || !recovery.refreshToken) {
      setError("유효하지 않은 재설정 링크입니다.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: recovery.accessToken,
          refreshToken: recovery.refreshToken,
          password,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error ?? "비밀번호 재설정에 실패했습니다.");
        return;
      }
      setSuccess("비밀번호가 변경되었습니다. 로그인 페이지로 이동합니다.");
      setTimeout(() => router.push("/login"), 1200);
    } catch {
      setError("요청 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F3EB] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 shadow-2xl">
        <div className="mb-7 text-center">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#B98768]">{STUDIO_NAME}</p>
          <h1 className="text-2xl font-extrabold text-[#3B342F]">비밀번호 재설정</h1>
          <p className="mt-2 text-sm text-[#6f655d]">새 비밀번호를 입력해주세요.</p>
        </div>

        {(!recovery.accessToken || !recovery.refreshToken) && (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            이메일의 최신 재설정 링크를 다시 열어주세요.
          </p>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-[#6f655d]">
              새 비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8자 이상 입력"
              required
              minLength={8}
              className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="passwordConfirm" className="mb-1.5 block text-xs font-semibold text-[#6f655d]">
              새 비밀번호 확인
            </label>
            <input
              id="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호 재입력"
              required
              minLength={8}
              className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          {success && <p className="text-xs text-emerald-700">{success}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#B98768] py-3 text-sm font-bold text-[#F7F3EB] transition-all hover:bg-[#a9785c] disabled:opacity-60"
          >
            {loading ? "처리 중..." : "비밀번호 변경"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-[#9b9189]">
          <Link href="/login" className="font-semibold text-[#B98768] hover:underline">
            로그인 화면으로
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
