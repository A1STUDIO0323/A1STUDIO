import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";

const PLANS = [
  {
    name: "평일 주간",
    desc: "월~금 09:00–18:00",
    pricePerHour: 15000,
    minHours: 2,
    highlights: ["최소 2시간", "드럼·앰프 포함", "주차 1대 무료"],
    badge: null,
  },
  {
    name: "평일 야간 / 주말",
    desc: "평일 18:00 이후 · 토·일 종일",
    pricePerHour: 20000,
    minHours: 2,
    highlights: ["최소 2시간", "드럼·앰프 포함", "심야(23시 이후) 가능"],
    badge: "인기",
  },
  {
    name: "패키지 10H",
    desc: "기간 내 자유롭게 나눠 사용",
    pricePerHour: 13000,
    minHours: 10,
    highlights: ["10시간 묶음", "3개월 유효", "예약 우선권"],
    badge: "최저가/h",
  },
];

export default function PricingSummary() {
  return (
    <section className="bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
            Pricing
          </p>
          <h2 className="mt-1 text-3xl font-bold text-[#3B342F]">
            합리적인 요금, 숨겨진 비용 없음
          </h2>
          <p className="mt-3 text-[#6f655d]">
            스페이스클라우드·야놀자 수수료 없이 더 저렴하게 이용하세요
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 transition-all ${
                plan.badge === "인기"
                  ? "border-[#B98768]/60 bg-[#B98768]/10 shadow-2xl shadow-violet-900/20"
                  : "border-[#D8CCBC] bg-[#EFE7DA] hover:border-[#D8CCBC]"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-4 rounded-full bg-[#B98768] px-3 py-0.5 text-xs font-bold text-[#F7F3EB]">
                  {plan.badge}
                </span>
              )}
              <p className="text-sm font-medium text-[#6f655d]">{plan.desc}</p>
              <h3 className="mt-1 text-lg font-bold text-[#3B342F]">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#3B342F]">
                  {formatPrice(plan.pricePerHour)}
                </span>
                <span className="text-sm text-[#9b9189]">/시간</span>
              </div>
              <p className="mt-1 text-xs text-[#b0a89e]">
                (최소 {plan.minHours}시간)
              </p>
              <ul className="mt-6 space-y-2.5">
                {plan.highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-[#3B342F]">
                    <Check className="h-4 w-4 shrink-0 text-[#B98768]" />
                    {item}
                  </li>
                ))}
              </ul>
              {/* 예약 메뉴 임시 숨김 (코드 보관)
              <Link
                href="/booking"
                className={`mt-8 flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold transition-all active:scale-95 ${
                  plan.badge === "인기"
                    ? "bg-[#B98768] text-[#F7F3EB] hover:bg-[#a9785c]"
                    : "border border-[#D8CCBC] text-[#3B342F] hover:border-[#D8CCBC] hover:text-[#B98768]"
                }`}
              >
                이 요금으로 예약
              </Link>
              */}
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6f655d] hover:text-[#B98768] transition-colors"
          >
            전체 요금표 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
