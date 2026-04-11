"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";

export default function ChargeCancelPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB] flex items-center justify-center py-20 px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#9b9189]/15 mb-6">
          <XCircle className="w-10 h-10 text-[#9b9189]" />
        </div>

        <h1 className="text-3xl font-bold text-[#3B342F] mb-3">
          결제가 취소되었습니다
        </h1>

        <p className="text-[#6f655d] mb-8">
          결제를 취소하셨습니다
        </p>

        <div className="space-y-3">
          <Link
            href="/charge"
            className="block w-full rounded-full bg-[#B98768] px-6 py-4 text-center text-base font-bold text-[#F7F3EB] transition-all hover:bg-[#a9785c] active:scale-95"
          >
            다시 충전하기
          </Link>

          <Link
            href="/"
            className="block w-full rounded-full border border-[#D8CCBC] px-6 py-4 text-center text-base font-medium text-[#3B342F] transition-all hover:border-[#B98768] hover:text-[#B98768]"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
