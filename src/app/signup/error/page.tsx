'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SignupErrorContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const errorMessages: Record<string, { title: string; description: string }> = {
    phone_duplicate: {
      title: '이미 가입된 전화번호입니다',
      description:
        '이 전화번호는 이미 다른 계정에서 사용 중입니다.\n가입한 계정을 잊으셨다면 아이디 찾기를 이용해주세요.',
    },
    default: {
      title: '회원가입 실패',
      description:
        '회원가입 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.',
    },
  };

  const error = errorMessages[reason || 'default'] || errorMessages.default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="max-w-md w-full bg-[var(--color-surface)] rounded-2xl p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
            {error.title}
          </h1>
          <p className="text-[var(--color-text-muted)] whitespace-pre-line">
            {error.description}
          </p>
        </div>

        <div className="space-y-3">
          {reason === 'phone_duplicate' && (
            <Link
              href="/find-account"
              className="block w-full py-3 px-4 bg-[var(--color-accent)] text-white rounded-xl hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              아이디 찾기
            </Link>
          )}
          <Link
            href="/login"
            className="block w-full py-3 px-4 border border-[var(--color-border)] text-[var(--color-text)] rounded-xl hover:bg-[var(--color-surface)] transition-colors"
          >
            로그인하기
          </Link>
          <Link
            href="/contact"
            className="block w-full py-3 px-4 border border-[var(--color-border)] text-[var(--color-text)] rounded-xl hover:bg-[var(--color-surface)] transition-colors"
          >
            문의하기
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignupErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
          <p className="text-[var(--color-text-muted)]">로딩 중...</p>
        </div>
      }
    >
      <SignupErrorContent />
    </Suspense>
  );
}
