"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function ChargeSuccessPage() {
  const searchParams = useSearchParams();
  const points = searchParams.get("points") || "0";

  return (
    <div className="min-h-screen bg-[#F7F3EB] flex items-center justify-center py-20 px-4">
      <div className="max-w-md w-full">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#B98768]/15 mb-6">
            <CheckCircle className="w-10 h-10 text-[#B98768]" />
          </div>

          <h1 className="text-3xl font-bold text-[#3B342F] mb-3">
            포인트 충전 완료
          </h1>

          <p className="text-[#6f655d] mb-8">
            포인트 충전이 성공적으로 완료되었습니다
          </p>

          <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 mb-8">
            <p className="text-sm text-[#9b9189] mb-2">충전된 포인트</p>
            <p className="text-5xl font-bold text-[#B98768]">
              {parseInt(points).toLocaleString("ko-KR")}
              <span className="text-2xl ml-1">P</span>
            </p>
          </div>

          <p className="text-sm text-[#9b9189] mb-8">
            마이페이지에서 잔액을 확인하세요
          </p>

          <div className="space-y-3">
            <Link
              href="/booking"
              className="block w-full rounded-full bg-[#B98768] px-6 py-4 text-center text-base font-bold text-[#F7F3EB] transition-all hover:bg-[#a9785c] active:scale-95"
            >
              예약하러 가기
            </Link>

            <Link
              href="/mypage"
              className="block w-full rounded-full border border-[#D8CCBC] px-6 py-4 text-center text-base font-medium text-[#3B342F] transition-all hover:border-[#B98768] hover:text-[#B98768]"
            >
              마이페이지
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
