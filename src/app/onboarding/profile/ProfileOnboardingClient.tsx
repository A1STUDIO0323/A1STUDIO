"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { STUDIO_NAME } from "@/lib/constants";
import { sanitizePostAuthRedirect } from "@/lib/safe-redirect";

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
  const nextUrl = useMemo(
    () => sanitizePostAuthRedirect(searchParams.get("next")),
    [searchParams]
  );
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
        `/login?callbackUrl=${encodeURIComponent(`${onboardingEntryPath}?next=${encodeURIComponent(nextUrl)}`)}`
      );
      return;
    }

    setEmail(session.user.email);
    if (session.user.phone) {
      let phone = session.user.phone;
      // 82로 시작하면 → 0으로 교체
      // 예: "821029940323" → "01029940323"
      if (phone.startsWith("82")) {
        phone = "0" + phone.slice(2);
      }
      setPhone(phone);
    }

    void (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/members/profile", {
          cache: "no-store",
        });
        const data = (await res.json()) as ProfileResponse;
        if (res.ok && data.success && data.profile) {
          if (data.profile.isComplete) {
            router.replace(nextUrl);
            return;
          }
          setBirthDate(data.profile.birthDate ?? "");
          let phone = data.profile.phone ?? session.user.phone ?? "";
          // 82로 시작하면 → 0으로 교체
          // 예: "821029940323" → "01029940323"
          if (phone.startsWith("82")) {
            phone = "0" + phone.slice(2);
          }
          setPhone(phone);
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
        body: JSON.stringify({ 
          // birthDate는 소셜 로그인에서 가져온 경우만 전송 (사용자 입력 불가)
          birthDate: birthDate || null,
          phone 
        }),
      });
      const data = (await res.json()) as ProfileResponse;
      if (!res.ok || !data.success) {
        setError(data.error ?? "정보 저장에 실패했습니다.");
        return;
      }
      
      // 생년월일이 없으면 마이페이지 계정정보로 이동
      if (!birthDate) {
        router.replace("/mypage?tab=account");
      } else {
        router.replace(nextUrl);
      }
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

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-[#6f655d]">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              disabled
              className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB]/70 px-3 py-2.5 text-sm text-[#6f655d]"
            />
          </div>

          {/* 생년월일 - 소셜 로그인에서 제공된 경우만 표시 */}
          {birthDate && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#6f655d]">
                생년월일
              </label>
              <div className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB]/70 px-3 py-2.5 text-sm text-[#6f655d]">
                {new Date(birthDate).toLocaleDateString('ko-KR')}
              </div>
              <p className="mt-1 text-xs text-[#9b9189]">
                소셜 로그인에서 가져온 인증된 정보입니다
              </p>
            </div>
          )}

          {/* 생년월일이 없는 경우 안내 */}
          {!birthDate && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-amber-900">
                  <p className="font-semibold mb-1">생년월일 정보 없음</p>
                  <p className="text-amber-800 leading-relaxed">
                    소셜 로그인 시 생년월일 정보를 제공하지 않으셨습니다.<br/>
                    <strong className="font-semibold">파티룸은 성인(만 19세 이상)만 이용 가능</strong>하므로,
                    생년월일 정보가 없으면 파티룸 예약이 제한됩니다.<br/>
                    <span className="text-[#B98768] font-semibold">저장 후 마이페이지에서 생년월일을 입력해주세요.</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="phone" className="mb-1.5 block text-xs font-semibold text-[#6f655d]">
              전화번호
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              readOnly
              className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB]/70 px-3 py-2.5 text-sm text-[#6f655d]"
            />
          </div>

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
