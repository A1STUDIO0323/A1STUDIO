"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function TossPaymentFailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#F7F3EB]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B98768] border-t-transparent" /></div>}>
      <TossPaymentFailContent />
    </Suspense>
  );
}

function TossPaymentFailContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const message = searchParams.get("message");

  return (
    <div className="min-h-screen bg-[#F7F3EB] px-4 py-16">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 text-center">
        <h1 className="text-xl font-bold text-[#3B342F]">토스 결제에 실패했습니다</h1>
        <p className="mt-2 text-sm text-[#6f655d]">잠시 후 다시 시도해주세요.</p>
        {(code || message) && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-xs text-red-500">
            {code && <p>코드: {code}</p>}
            {message && <p className="mt-1">메시지: {message}</p>}
          </div>
        )}
        <Link
          href="/booking"
          className="mt-6 inline-flex rounded-full bg-[#B98768] px-6 py-2.5 text-sm font-bold text-[#F7F3EB] hover:bg-[#a9785c]"
        >
          예약 페이지로 돌아가기
        </Link>
      </div>
    </div>
  );
}
