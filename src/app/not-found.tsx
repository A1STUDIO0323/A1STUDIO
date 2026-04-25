import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="max-w-md w-full text-center space-y-6 p-8">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-[var(--color-text)]">404</h1>
          <h2 className="text-2xl font-semibold text-[var(--color-text)]">
            페이지를 찾을 수 없습니다
          </h2>
          <p className="text-[var(--color-text-muted)]">
            요청하신 페이지가 존재하지 않거나 이동되었습니다.
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/"
            className="inline-block w-full px-6 py-3 bg-[var(--color-accent)] text-white rounded-xl hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            홈으로 돌아가기
          </Link>

          <div className="flex gap-3 justify-center text-sm">
            <Link
              href="/booking"
              className="text-[var(--color-accent)] hover:underline"
            >
              예약하기
            </Link>
            <span className="text-[var(--color-text-muted)]">·</span>
            <Link
              href="/contact"
              className="text-[var(--color-accent)] hover:underline"
            >
              문의하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
