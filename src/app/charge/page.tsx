"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ChargePackage {
  id: string;
  name: string;
  amount: number;
  bonus_rate: number;
  bonus_points: number;
  total_points: number;
  is_popular: boolean;
  sort_order: number;
}

export default function ChargePage() {
  const router = useRouter();
  const [packages, setPackages] = useState<ChargePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();

    // 로그인 확인
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login?redirect=/charge");
      } else {
        setUser(user);
      }
    });

    // 충전 패키지 조회
    supabase
      .from("charge_packages")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("패키지 조회 오류:", error);
        } else {
          setPackages(data || []);
        }
        setLoading(false);
      });
  }, [router]);

  const handleCharge = async (packageId: string) => {
    if (!user) {
      router.push("/login?redirect=/charge");
      return;
    }

    setProcessingId(packageId);

    try {
      const response = await fetch("/api/charge/ready", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ package_id: packageId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "결제 준비에 실패했습니다");
      }

      // 카카오페이 결제 페이지로 이동
      window.location.href = data.redirect_url;
    } catch (error) {
      console.error("결제 준비 오류:", error);
      alert(error instanceof Error ? error.message : "결제 준비에 실패했습니다");
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F3EB] py-20 flex items-center justify-center">
        <p className="text-[#6f655d]">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
            Point Charge
          </p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">
            포인트 충전
          </h1>
          <p className="mt-3 text-[#6f655d]">
            원하는 패키지를 선택하고 포인트를 충전하세요
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative rounded-2xl border p-6 transition-all ${
                pkg.is_popular
                  ? "border-[#B98768]/60 bg-[#B98768]/10 shadow-2xl shadow-violet-900/20"
                  : "border-[#D8CCBC] bg-[#EFE7DA] hover:border-[#B98768]/40"
              }`}
            >
              {pkg.is_popular && (
                <span className="absolute -top-3 left-4 rounded-full bg-[#B98768] px-3 py-0.5 text-xs font-bold text-[#F7F3EB]">
                  인기
                </span>
              )}

              <h3 className="text-lg font-bold text-[#3B342F]">{pkg.name}</h3>

              {pkg.bonus_rate > 0 && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#B98768]/20 px-2 py-0.5">
                  <Sparkles className="w-3 h-3 text-[#B98768]" />
                  <span className="text-xs font-semibold text-[#B98768]">
                    +{pkg.bonus_rate}% 보너스
                  </span>
                </div>
              )}

              <div className="mt-4 space-y-2">
                <div>
                  <p className="text-xs text-[#9b9189]">결제 금액</p>
                  <p className="text-2xl font-bold text-[#3B342F]">
                    {pkg.amount.toLocaleString("ko-KR")}원
                  </p>
                </div>

                {pkg.bonus_points > 0 && (
                  <div>
                    <p className="text-xs text-[#9b9189]">보너스 포인트</p>
                    <p className="text-lg font-semibold text-[#B98768]">
                      +{pkg.bonus_points.toLocaleString("ko-KR")}P
                    </p>
                  </div>
                )}

                <div className="pt-2 border-t border-[#D8CCBC]">
                  <p className="text-xs text-[#9b9189]">총 지급 포인트</p>
                  <p className="text-3xl font-extrabold text-[#B98768]">
                    {pkg.total_points.toLocaleString("ko-KR")}
                    <span className="text-lg ml-1">P</span>
                  </p>
                </div>
              </div>

              <ul className="mt-6 space-y-2">
                <li className="flex items-center gap-2 text-sm text-[#3B342F]">
                  <Check className="h-4 w-4 shrink-0 text-[#B98768]" />
                  즉시 사용 가능
                </li>
                <li className="flex items-center gap-2 text-sm text-[#3B342F]">
                  <Check className="h-4 w-4 shrink-0 text-[#B98768]" />
                  유효기간 무제한
                </li>
              </ul>

              <button
                onClick={() => handleCharge(pkg.id)}
                disabled={processingId === pkg.id}
                className={`mt-6 w-full rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 ${
                  pkg.is_popular
                    ? "bg-[#B98768] text-[#F7F3EB] hover:bg-[#a9785c]"
                    : "border border-[#D8CCBC] text-[#3B342F] hover:border-[#B98768] hover:text-[#B98768]"
                } ${processingId === pkg.id ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {processingId === pkg.id ? "처리 중..." : "충전하기"}
              </button>
            </div>
          ))}
        </div>

        {/* 환불 불가 안내 */}
        <div className="mt-12 max-w-2xl mx-auto">
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-900 mb-2">
                  ⚠️ 포인트 충전 전 꼭 확인하세요
                </h3>
                <ul className="space-y-2 text-sm text-amber-800">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span><strong className="font-bold">충전된 포인트는 환불이 불가능합니다.</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>회원 탈퇴 시 남은 포인트는 모두 소멸됩니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>포인트 유효기간은 무제한이지만, 법적 요구 시 조정될 수 있습니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>결제는 카카오페이로 안전하게 처리됩니다.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-[#9b9189]">
            충전 버튼을 클릭하면 위 사항에 동의한 것으로 간주됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
