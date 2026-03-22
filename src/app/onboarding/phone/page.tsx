"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { STUDIO_NAME } from "@/lib/constants";

function toE164KRPhone(input: string) {
  const digits = input.replace(/\D/g, "");

  // 01054010732 -> +821054010732
  if (digits.startsWith("0")) {
    return `+82${digits.slice(1)}`;
  }

  // 821054010732 -> +821054010732
  if (digits.startsWith("82")) {
    return `+${digits}`;
  }

  // +8210... 입력도 허용
  if (input.startsWith("+")) {
    return input.replace(/[^+\d]/g, "");
  }

  return input.trim();
}

export default function PhoneOnboardingPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const normalizedPhone = useMemo(() => toE164KRPhone(phone), [phone]);

  const canSendOtp = useMemo(() => {
    return !!phone && !sending && !isPhoneVerified;
  }, [phone, sending, isPhoneVerified]);

  const canVerifyOtp = useMemo(() => {
    return !!phone && !!otp && !verifying && !isPhoneVerified;
  }, [phone, otp, verifying, isPhoneVerified]);

  const canGoNext = isPhoneVerified;

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace(
          `/login?callbackUrl=${encodeURIComponent(`/onboarding/phone?next=${next}`)}`
        );
        return;
      }

      if (user.phone) {
        setPhone(user.phone);
      }
      if (user.phone_confirmed_at) {
        setIsOtpSent(true);
        setIsPhoneVerified(true);
      }
    })();
  }, [next, router, supabase]);

  async function handleSendOtp() {
    setErrorMessage("");
    setSuccessMessage("");
    setSending(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace(
          `/login?callbackUrl=${encodeURIComponent(`/onboarding/phone?next=${next}`)}`
        );
        return;
      }

      const { error } = await supabase.auth.updateUser({ phone: normalizedPhone });
      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setIsOtpSent(true);
      setSuccessMessage(`인증번호를 발송했습니다. (${normalizedPhone})`);
    } finally {
      setSending(false);
    }
  }

  async function handleResendOtp() {
    setErrorMessage("");
    setSuccessMessage("");
    setResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "phone_change",
        phone: normalizedPhone,
      });
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setSuccessMessage("인증번호를 재전송했습니다.");
    } finally {
      setResending(false);
    }
  }

  async function handleVerifyOtp() {
    setErrorMessage("");
    setSuccessMessage("");
    setVerifying(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: normalizedPhone,
        token: otp,
        type: "phone_change",
      });

      if (error) {
        setIsPhoneVerified(false);
        setErrorMessage("인증번호가 올바르지 않습니다.");
        return;
      }

      setIsPhoneVerified(true);
      setSuccessMessage("휴대폰 인증이 완료되었습니다.");
    } finally {
      setVerifying(false);
    }
  }

  function handleNext() {
    if (!isPhoneVerified) {
      setErrorMessage("휴대폰 인증 완료 후 다음 단계로 이동할 수 있습니다.");
      return;
    }
    router.push(`/onboarding/profile?next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F3EB] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#B98768]">
            {STUDIO_NAME}
          </p>
          <h1 className="text-2xl font-extrabold text-[#3B342F]">휴대폰 인증</h1>
          <p className="mt-2 text-sm text-[#6f655d]">
            인증번호 확인이 완료되어야 다음 단계로 이동할 수 있습니다.
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setIsPhoneVerified(false);
            }}
            placeholder="01012345678"
            disabled={isPhoneVerified}
            className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none disabled:bg-[#F7F3EB]/60"
          />
          {!!phone && (
            <p className="text-xs text-[#6f655d]">
              전송 형식: <span className="font-semibold">{normalizedPhone}</span>
            </p>
          )}

          <button
            type="button"
            onClick={handleSendOtp}
            disabled={!canSendOtp}
            className="w-full rounded-xl bg-[#B98768] py-3 text-sm font-bold text-[#F7F3EB] transition-all hover:bg-[#a9785c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "발송 중..." : "인증번호 받기"}
          </button>

          {isOtpSent && !isPhoneVerified && (
            <>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6자리 인증번호"
                className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none"
              />

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={!canVerifyOtp}
                className="w-full rounded-xl bg-[#5B8DEF] py-3 text-sm font-bold text-white transition-all hover:bg-[#4f7cda] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verifying ? "확인 중..." : "인증 확인"}
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={!phone || resending || isPhoneVerified}
                className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] py-3 text-sm font-semibold text-[#3B342F] transition-all hover:bg-[#efe7da] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending ? "재전송 중..." : "인증번호 재전송"}
              </button>
            </>
          )}

          {errorMessage && <p className="text-xs text-red-500">{errorMessage}</p>}
          {successMessage && <p className="text-xs text-green-600">{successMessage}</p>}

          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext}
            className="mt-3 w-full rounded-xl bg-[#2E7D32] py-3 text-sm font-bold text-white transition-all hover:bg-[#276a2b] disabled:cursor-not-allowed disabled:opacity-60"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
