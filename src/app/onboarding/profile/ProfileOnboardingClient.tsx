"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { STUDIO_NAME } from "@/lib/constants";

const PHONE_OTP_ENABLED = process.env.NEXT_PUBLIC_PHONE_OTP_ENABLED === "true";

type ProfileResponse = {
  success?: boolean;
  profile?: {
    email: string;
    birthDate: string | null;
    phone: string | null;
    isComplete: boolean;
  };
  error?: string;
};

export default function ProfileOnboardingClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = useMemo(() => searchParams.get("next") ?? "/", [searchParams]);
  const onboardingEntryPath = PHONE_OTP_ENABLED ? "/onboarding/phone" : "/onboarding/profile";

  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.email) {
      router.replace(
        `/login?callbackUrl=${encodeURIComponent(`${onboardingEntryPath}?next=${nextUrl}`)}`
      );
      return;
    }

    setEmail(session.user.email);
    if (session.user.phone) {
      setPhone(session.user.phone);
    }

    void (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/members/profile", {
          cache: "no-store",
        });
        const data = (await res.json()) as ProfileResponse;
        if (res.ok && data.success && data.profile) {
          setBirthDate(data.profile.birthDate ?? "");
          setPhone(data.profile.phone ?? session.user.phone ?? "");
        }
      } catch {
        // ignore and show form
      } finally {
        setLoading(false);
      }
    })();
  }, [nextUrl, onboardingEntryPath, router, session?.user?.email, session?.user?.phone, status]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError("");

    try {
      setSubmitting(true);
      const res = await fetch("/api/members/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate, phone }),
      });
      const data = (await res.json()) as ProfileResponse;
      if (!res.ok || !data.success) {
        setError(data.error ?? "정보 저장에 실패했습니다.");
        return;
      }
      if (data.profile) {
        setBirthDate(data.profile.birthDate ?? "");
      }
      router.replace(nextUrl);
    } catch {
      setError("정보 저장 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F3EB] text-[#6f655d]">
        정보를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F3EB] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#B98768]">
            {STUDIO_NAME}
          </p>
          <h1 className="text-2xl font-extrabold text-[#3B342F]">추가 정보 입력</h1>
          <p className="mt-2 text-sm text-[#6f655d]">
            이용을 위해 필수 정보를 입력해주세요.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            disabled
            className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB]/70 px-3 py-2.5 text-sm text-[#6f655d]"
          />
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
            className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] focus:border-[#B98768] focus:outline-none"
          />
          <input
            type="tel"
            value={phone}
            readOnly
            className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB]/70 px-3 py-2.5 text-sm text-[#6f655d]"
          />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#B98768] py-3 text-sm font-bold text-[#F7F3EB] transition-all hover:bg-[#a9785c] disabled:opacity-60"
          >
            {submitting ? "저장 중..." : "저장하고 계속하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
