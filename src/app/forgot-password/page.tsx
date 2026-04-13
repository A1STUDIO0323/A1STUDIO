"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { STUDIO_NAME } from "@/lib/constants";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [debugUrl, setDebugUrl] = useState("");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setMessage("");
    setDebugUrl("");

    try {
      setLoading(true);
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        debugResetUrl?: string;
      };

      if (!res.ok || !data.success) {
        setError(data.error ?? "요청 처리에 실패했습니다.");
        return;
      }
      setMessage("입력한 이메일로 재설정 안내를 보냈습니다. 메일함을 확인해주세요.");
      if (data.debugResetUrl) {
        setDebugUrl(data.debugResetUrl);
      }
    } catch {
      setError("요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F3EB] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 shadow-2xl">
        <div className="mb-7 text-center">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#B98768]">{STUDIO_NAME}</p>
          <h1 className="text-2xl font-extrabold text-[#3B342F]">비밀번호 찾기</h1>
          <p className="mt-2 text-sm text-[#6f655d]">가입한 이메일로 재설정 링크를 보내드립니다.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-[#6f655d]">
              가입한 이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
              className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          {message && <p className="text-xs text-emerald-700">{message}</p>}
          {debugUrl && (
            <p className="rounded-lg bg-[#F7F3EB]/80 px-2 py-1.5 text-xs text-[#6f655d] break-all">
              개발용 재설정 링크: <a className="text-[#B98768] underline" href={debugUrl}>{debugUrl}</a>
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#B98768] py-3 text-sm font-bold text-[#F7F3EB] transition-all hover:bg-[#a9785c] disabled:opacity-60"
          >
            {loading ? "전송 중..." : "재설정 링크 보내기"}
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
