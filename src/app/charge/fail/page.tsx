"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function ChargeFailPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "알 수 없는 오류가 발생했습니다";

  return (
    <div className="min-h-screen bg-[#F7F3EB] flex items-center justify-center py-20 px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>

        <h1 className="text-3xl font-bold text-[#3B342F] mb-3">
          결제에 실패했습니다
        </h1>

        <p className="text-[#6f655d] mb-2">
          결제 중 문제가 발생했습니다
        </p>

        <p className="text-sm text-[#9b9189] mb-8">
          {decodeURIComponent(error)}
        </p>

        <div className="space-y-3">
          <Link
            href="/charge"
            className="block w-full rounded-full bg-[#B98768] px-6 py-4 text-center text-base font-bold text-[#F7F3EB] transition-all hover:bg-[#a9785c] active:scale-95"
          >
            다시 시도하기
          </Link>

          <Link
            href="/contact"
            className="block w-full rounded-full border border-[#D8CCBC] px-6 py-4 text-center text-base font-medium text-[#3B342F] transition-all hover:border-[#B98768] hover:text-[#B98768]"
          >
            문의하기
          </Link>
        </div>
      </div>
    </div>
  );
}
