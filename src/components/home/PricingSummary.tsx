import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const STUDIO_HOURLY = [
  { name: "평일 비피크",        desc: "월~금 00:00~18:00",       original: 9000,  event: 7000  },
  { name: "평일 피크",          desc: "월~금 18:00~24:00",       original: 11000, event: 9000  },
  { name: "주말·공휴일 비피크", desc: "토·일·공휴일 00:00~13:00", original: 10000, event: 8000  },
  { name: "주말·공휴일 피크",   desc: "토·일·공휴일 13:00~24:00", original: 12000, event: 10000 },
];

const STUDIO_PACKAGES = [
  { name: "데이 패키지",   time: "10:00 ~ 17:00 / 7시간",  weekday: 42000, weekend: 57000 },
  { name: "나잇 패키지",   time: "00:00 ~ 07:00 / 7시간",  weekday: 42000, weekend: 49000 },
  { name: "올데이 패키지", time: "10:00 ~ 22:00 / 12시간", weekday: 80000, weekend: 102000 },
];

const PARTY_DAY_NIGHT = [
  {
    name: "데이 패키지",
    time: "10:00 ~ 17:00",
    hours: 7,
    off_peak: { regular: 100000, event: 70000  },
    peak:     { regular: 130000, event: 90000  },
  },
  {
    name: "나잇 패키지",
    time: "19:00 ~ 익일 07:00",
    hours: 12,
    off_peak: { regular: 140000, event: 100000 },
    peak:     { regular: 160000, event: 120000 },
  },
];

// 올데이 = (데이 + 나잇 합산) × 0.9 (10% 할인) — 4단계 조합형 범위
const PARTY_ALLDAY_RANGE = {
  name: "올데이 패키지",
  time: "10:00 ~ 익일 07:00",
  hours: 21,
  min: { regular: 216000, event: 153000 },
  max: { regular: 261000, event: 189000 },
};

export default function PricingSummary() {
  const today = new Date();
  const eventStart = new Date("2026-04-08");
  const isEventActive = today >= eventStart;

  return (
    <section className="bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 오픈 이벤트 배너 */}
        {isEventActive && (
          <div className="mb-8 rounded-xl border border-[#B98768]/40 bg-[#f5ede6] py-3 px-4 text-center">
            <p className="font-semibold text-[#B98768]">
              🎉 오픈이벤트 진행 중! 정상가 → 오픈 이벤트가 적용
            </p>
          </div>
        )}

        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
            Pricing
          </p>
          <h2 className="mt-1 text-3xl font-bold text-[#3B342F]">
            합리적인 요금, 행복한 시간들!
          </h2>
        </div>

        {/* ===== 연습실 시간당 ===== */}
        <div className="mt-12 text-center mb-6">
          <h3 className="text-2xl font-bold text-[#3B342F]">연습실 · 시간당</h3>
          <p className="text-sm text-[#6f655d] mt-2">
            기본 포함 인원 8인 · 9인부터 1인당 10,000원
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STUDIO_HOURLY.map((plan) => (
            <div
              key={plan.name}
              className="relative rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6"
            >
              <h3 className="text-lg font-bold text-[#3B342F]">{plan.name}</h3>
              <p className="mt-1 text-sm font-medium text-[#6f655d]">{plan.desc}</p>

              <div className="mt-4">
                <p className="text-xs text-[#9b9189] mb-1">시간당</p>
                <div className="flex items-baseline gap-2">
                  <span className="line-through text-[#9b9189] text-sm">
                    {plan.original.toLocaleString("ko-KR")}원
                  </span>
                  <span className="text-[#B98768] font-bold text-2xl">
                    {plan.event.toLocaleString("ko-KR")}원
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ===== 연습실 패키지 ===== */}
        <div className="mt-16 text-center mb-6">
          <h3 className="text-2xl font-bold text-[#3B342F]">연습실 · 패키지</h3>
          <p className="text-sm text-[#6f655d] mt-2">
            시간제보다 시간당 1,000원 할인
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STUDIO_PACKAGES.map((pkg) => (
            <div key={pkg.name} className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6">
              <h3 className="text-lg font-bold text-[#3B342F]">{pkg.name}</h3>
              <p className="text-sm text-[#6f655d] mt-1 mb-4">{pkg.time}</p>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-[#F7F3EB] p-3">
                  <p className="text-xs text-[#9b9189] mb-1">평일</p>
                  <p className="text-lg font-bold text-[#B98768]">
                    {pkg.weekday.toLocaleString("ko-KR")}원
                  </p>
                </div>
                <div className="rounded-lg bg-[#F7F3EB] p-3">
                  <p className="text-xs text-[#9b9189] mb-1">주말·공휴일</p>
                  <p className="text-lg font-bold text-[#B98768]">
                    {pkg.weekend.toLocaleString("ko-KR")}원
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ===== 파티룸 ===== */}
        <div className="mt-20">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-[#3B342F]">파티룸 요금</h2>
              <span className="rounded-full bg-[#B98768] px-3 py-1 text-xs font-bold text-white">
                성인 전용
              </span>
            </div>
            <p className="text-sm text-[#6f655d]">
              패키지 단위로 예약 · 기본 포함 인원 10인
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#B98768]/20 px-4 py-2 text-sm font-semibold text-[#B98768]">
              <Sparkles className="w-4 h-4" />
              오픈 이벤트 진행 중
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PARTY_DAY_NIGHT.map((pkg) => (
              <div
                key={pkg.name}
                className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6"
              >
                <h3 className="text-xl font-bold text-[#3B342F]">{pkg.name}</h3>
                <p className="text-sm text-[#6f655d] mt-1">{pkg.time}</p>
                <p className="text-xs text-[#9b9189] mb-4">({pkg.hours}시간)</p>

                <div className="space-y-4">
                  <div className="rounded-lg bg-[#F7F3EB] p-3">
                    <p className="text-xs text-[#9b9189] mb-1">비피크</p>
                    <span className="line-through text-[#9b9189] text-sm">
                      {pkg.off_peak.regular.toLocaleString("ko-KR")}원
                    </span>
                    <div className="text-2xl font-bold text-[#B98768]">
                      {pkg.off_peak.event.toLocaleString("ko-KR")}원
                    </div>
                  </div>

                  <div className="rounded-lg bg-[#F7F3EB] p-3">
                    <p className="text-xs text-[#9b9189] mb-1">피크</p>
                    <span className="line-through text-[#9b9189] text-sm">
                      {pkg.peak.regular.toLocaleString("ko-KR")}원
                    </span>
                    <div className="text-2xl font-bold text-[#B98768]">
                      {pkg.peak.event.toLocaleString("ko-KR")}원
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* 올데이 (4단계 조합형) */}
            <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6">
              <h3 className="text-xl font-bold text-[#3B342F]">{PARTY_ALLDAY_RANGE.name}</h3>
              <p className="text-sm text-[#6f655d] mt-1">{PARTY_ALLDAY_RANGE.time}</p>
              <p className="text-xs text-[#9b9189] mb-4">({PARTY_ALLDAY_RANGE.hours}시간 · 데이 + 나잇 조합)</p>

              <div className="rounded-lg bg-[#F7F3EB] p-3">
                <p className="text-xs text-[#9b9189] mb-1">당일·익일 조합 4단계</p>
                <span className="line-through text-[#9b9189] text-sm">
                  {PARTY_ALLDAY_RANGE.min.regular.toLocaleString("ko-KR")} ~ {PARTY_ALLDAY_RANGE.max.regular.toLocaleString("ko-KR")}원
                </span>
                <div className="text-2xl font-bold text-[#B98768]">
                  {PARTY_ALLDAY_RANGE.min.event.toLocaleString("ko-KR")} ~ {PARTY_ALLDAY_RANGE.max.event.toLocaleString("ko-KR")}원
                </div>
              </div>
              <p className="text-xs text-[#9b9189] mt-3">
                각 패키지 별도 예약 대비 약 10~15% 저렴
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-[#9b9189] mt-8">
          * 기준 인원을 초과하는 경우 사전 문의 후 이용 가능합니다.
        </p>

        <div className="mt-6 text-center">
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
