"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type ConfirmResult = {
  success: boolean;
  paymentKey: string;
  orderId: string;
  amount: number;
  approvedAt: string;
};

export default function TossPaymentSuccessPage() {
  const searchParams = useSearchParams();
  const paymentKey = searchParams.get("paymentKey");
  const orderId = searchParams.get("orderId");
  const amount = Number(searchParams.get("amount") ?? "0");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ConfirmResult | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!paymentKey || !orderId || !Number.isFinite(amount) || amount <= 0) {
        setError("필수 파라미터가 누락되었습니다.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/payments/toss/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });
        const data = (await res.json()) as ConfirmResult & { error?: string };
        if (!res.ok) {
          setError(data.error ?? "결제 승인 처리에 실패했습니다.");
          return;
        }
        setResult(data);
      } catch {
        setError("결제 승인 처리 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [paymentKey, orderId, amount]);

  return (
    <div className="min-h-screen bg-[#F7F3EB] px-4 py-16">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 text-center">
        {loading ? (
          <div>
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#B98768] border-t-transparent" />
            <p className="mt-4 text-sm text-[#6f655d]">결제 승인 처리 중입니다...</p>
          </div>
        ) : error ? (
          <div>
            <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
            <h1 className="mt-3 text-xl font-bold text-[#3B342F]">결제 승인 실패</h1>
            <p className="mt-2 text-sm text-red-400">{error}</p>
            <Link
              href="/booking"
              className="mt-6 inline-flex rounded-full border border-[#D8CCBC] px-5 py-2.5 text-sm font-semibold text-[#6f655d] hover:text-[#B98768]"
            >
              예약 페이지로 돌아가기
            </Link>
          </div>
        ) : (
          <div>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h1 className="mt-3 text-xl font-bold text-[#3B342F]">토스 결제 완료</h1>
            <div className="mt-4 rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] p-4 text-left text-sm">
              <p className="text-[#6f655d]">주문번호: <span className="text-[#3B342F]">{result?.orderId}</span></p>
              <p className="mt-1 text-[#6f655d]">결제금액: <span className="font-semibold text-[#3B342F]">{formatPrice(result?.amount ?? 0)}</span></p>
              <p className="mt-1 text-[#6f655d]">승인시각: <span className="text-[#3B342F]">{result?.approvedAt}</span></p>
            </div>
            <Link
              href="/mypage"
              className="mt-6 inline-flex rounded-full bg-[#B98768] px-6 py-2.5 text-sm font-bold text-[#F7F3EB] hover:bg-[#a9785c]"
            >
              마이페이지로 이동
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
