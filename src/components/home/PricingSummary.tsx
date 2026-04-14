import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

const PLANS = [
  {
    name: "평일 비피크",
    desc: "월~금 00:00~18:00",
    priceOriginal1h: 9000,
    priceEvent1h: 7000,
    priceOriginal2h: 14000,
    priceEvent2h: 13000,
    highlights: ["조용한 오전·오후 시간대", "최소 1시간부터 예약 가능"],
    badge: null,
  },
  {
    name: "평일 피크타임",
    desc: "월~금 18:00~00:00",
    priceOriginal1h: 11000,
    priceEvent1h: 9000,
    priceOriginal2h: 18000,
    priceEvent2h: 17000,
    highlights: ["퇴근 후 저녁 타임", "심야(23시 이후) 이용 가능"],
    badge: null,
  },
  {
    name: "주말/공휴일 비피크",
    desc: "토·일·공휴일 00:00~13:00",
    priceOriginal1h: 10000,
    priceEvent1h: 8000,
    priceOriginal2h: 16000,
    priceEvent2h: 15000,
    highlights: ["여유로운 오전 타임"],
    badge: "인기",
  },
  {
    name: "주말/공휴일 피크타임",
    desc: "토·일·공휴일 13:00~00:00",
    priceOriginal1h: 12000,
    priceEvent1h: 10000,
    priceOriginal2h: 20000,
    priceEvent2h: 19000,
    highlights: ["주말 오후·저녁 집중 타임"],
    badge: null,
  },
];

export default function PricingSummary() {
  const today = new Date();
  const eventStart = new Date("2026-04-08");
  // 이벤트 종료일 하드코딩 제거 - 항상 이벤트 배너 표시
  const isEventActive = today >= eventStart;

  return (
    <section className="bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 오픈 이벤트 배너 */}
        {isEventActive && (
          <div className="mb-8 rounded-xl border border-[#B98768]/40 bg-[#f5ede6] py-3 px-4 text-center">
            <p className="font-semibold text-[#B98768]">
              🎉 오픈이벤트 진행 중! 특별 할인가 적용
            </p>
          </div>
        )}

        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
            Pricing
          </p>
          <h2 className="mt-1 text-3xl font-bold text-[#3B342F]">
            합리적인 요금, 숨겨진 비용 없음
          </h2>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
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
              <h3 className="text-lg font-bold text-[#3B342F]">{plan.name}</h3>
              <p className="mt-1 text-sm font-medium text-[#6f655d]">{plan.desc}</p>
              
              {/* 1시간 가격 */}
              <div className="mt-4 space-y-1">
                <p className="text-xs text-[#9b9189]">1시간</p>
                <div className="flex items-baseline gap-2">
                  <span className="line-through text-[#9b9189] text-sm">
                    {plan.priceOriginal1h.toLocaleString("ko-KR")}원
                  </span>
                  <span className="text-[#B98768] font-bold text-2xl">
                    {plan.priceEvent1h.toLocaleString("ko-KR")}원
                  </span>
                  <span className="text-[#6f655d] text-sm">/시간</span>
                </div>
              </div>

              {/* 2시간 패키지 가격 */}
              <div className="mt-3 space-y-1">
                <p className="text-xs text-[#9b9189]">2시간 패키지</p>
                <div className="flex items-baseline gap-2">
                  <span className="line-through text-[#9b9189] text-sm">
                    {plan.priceOriginal2h.toLocaleString("ko-KR")}원
                  </span>
                  <span className="text-[#B98768] font-bold text-xl">
                    {plan.priceEvent2h.toLocaleString("ko-KR")}원
                  </span>
                </div>
              </div>

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

        {/* 안내 문구 */}
        <p className="text-center text-sm text-[#9b9189] mt-6">
          * 이용 시간에는 준비 및 정리 시간이 포함됩니다.
        </p>

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
