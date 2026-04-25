'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 프로덕션: 메시지만
    if (process.env.NODE_ENV === 'production') {
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="max-w-md w-full text-center space-y-6 p-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-[var(--color-text)]">
            오류가 발생했습니다
          </h1>
          <p className="text-[var(--color-text-muted)]">
            일시적인 오류입니다. 잠시 후 다시 시도해주세요.
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={reset}
            className="w-full px-6 py-3 bg-[var(--color-accent)] text-white rounded-xl hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            다시 시도
          </button>

          <Link
            href="/"
            className="block text-[var(--color-accent)] hover:underline"
          >
            홈으로 돌아가기
          </Link>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="text-sm text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text)]">
              에러 상세 (개발 모드)
            </summary>
            <pre className="mt-2 p-4 bg-[var(--color-surface)] rounded text-xs overflow-auto max-h-64">
              {error.stack || error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
