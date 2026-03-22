"use client";

import { signIn } from "@/lib/auth-client";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { STUDIO_NAME } from "@/lib/constants";
import { AlertCircle } from "lucide-react";

const GOOGLE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_GOOGLE_CONFIGURED === "true"
);
const KAKAO_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_KAKAO_CONFIGURED === "true"
);
const ANY_OAUTH = GOOGLE_CONFIGURED || KAKAO_CONFIGURED;

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const error = searchParams.get("error");
  const onboardingCallbackUrl = `/onboarding/phone?next=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F7F3EB] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 shadow-2xl">
        {/* 로고 */}
        <div className="mb-8 text-center">
          <p className="text-xs font-bold tracking-widest text-[#B98768] uppercase mb-1">
            {STUDIO_NAME}
          </p>
          <h1 className="text-2xl font-extrabold text-[#3B342F]">로그인</h1>
          <p className="mt-2 text-sm text-[#6f655d]">
            예약 확인 및 원데이클래스 신청을 위해 로그인하세요.
          </p>
        </div>

        {/* OAuth 오류 메시지 */}
        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            로그인 중 오류가 발생했습니다. 다시 시도해주세요.
          </div>
        )}

        {/* OAuth 키가 하나도 없을 때 */}
        {!ANY_OAUTH && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-500">
            <p className="font-semibold mb-1">소셜 로그인 준비 중</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Google / 카카오 로그인 키가 아직 설정되지 않았습니다.
              <br />
              <code className="text-amber-600">.env</code> 파일에 키를 입력하면 활성화됩니다.
            </p>
          </div>
        )}

        <div className="mb-5 rounded-xl border border-[#D8CCBC]/80 bg-[#F7F3EB]/60 px-4 py-3 text-xs text-[#6f655d]">
          이메일 회원가입/로그인은 종료되었습니다.
          <br />
          Google 또는 카카오로 로그인해주세요.
        </div>

        <div className="space-y-3">
          {/* 구글 로그인 */}
          {GOOGLE_CONFIGURED ? (
            <button
              onClick={() => signIn("google", { callbackUrl: onboardingCallbackUrl })}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-sm font-semibold text-[#3B342F] transition-all hover:bg-[#EFE7DA] active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google로 계속하기
            </button>
          ) : (
            <div className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#D8CCBC] bg-[#F7F3EB]/50 px-4 py-3 text-sm text-[#b0a89e] cursor-not-allowed select-none">
              <svg viewBox="0 0 24 24" className="h-5 w-5 opacity-30" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google 로그인 (준비 중)
            </div>
          )}

          {/* 카카오 로그인 */}
          {KAKAO_CONFIGURED ? (
            <button
              onClick={() => signIn("kakao", { callbackUrl: onboardingCallbackUrl })}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#FEE500] px-4 py-3 text-sm font-semibold text-[#3B342F] transition-all hover:bg-[#F5DC00] active:scale-95"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
                <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.72 1.56 5.12 3.96 6.6L5 21l4.2-2.28c.9.24 1.84.36 2.8.36 5.52 0 10-3.48 10-7.8C22 6.48 17.52 3 12 3z" />
              </svg>
              카카오로 계속하기
            </button>
          ) : (
            <div className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#FEE500]/20 px-4 py-3 text-sm text-[#b0a89e] cursor-not-allowed select-none">
              <svg viewBox="0 0 24 24" className="h-5 w-5 opacity-30" aria-hidden="true" fill="currentColor">
                <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.72 1.56 5.12 3.96 6.6L5 21l4.2-2.28c.9.24 1.84.36 2.8.36 5.52 0 10-3.48 10-7.8C22 6.48 17.52 3 12 3z" />
              </svg>
              카카오 로그인 (준비 중)
            </div>
          )}
        </div>

        {/* 건너뛰기 */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push(callbackUrl)}
            className="text-sm text-[#9b9189] underline-offset-2 hover:text-[#3B342F] hover:underline transition-colors"
          >
            로그인 없이 계속하기
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-[#b0a89e]">
          소셜 로그인 후 생년월일·이메일·연락처를 확인/입력합니다.
        </p>

        {/* Google/Kakao 설정 안내 (개발용) */}
        {!ANY_OAUTH && (
          <div className="mt-6 border-t border-[#D8CCBC]/50 pt-5">
            <p className="text-xs text-[#b0a89e] text-center mb-2">소셜 로그인 활성화 방법</p>
            <div className="rounded-lg bg-[#F7F3EB]/60 px-3 py-2.5 text-xs text-[#9b9189] space-y-1">
              <p>1. <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-[#B98768] hover:underline">Google Cloud Console</a>에서 OAuth 키 발급</p>
              <p>2. <a href="https://developers.kakao.com" target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:underline">Kakao Developers</a>에서 앱 키 발급</p>
              <p>3. <code className="text-[#6f655d]">.env</code> 파일에 입력 후 서버 재시작</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
