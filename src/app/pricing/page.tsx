import { Metadata } from "next";
import Link from "next/link";
import { Info, Sparkles } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "요금안내" };

// ===== 연습실 시간당 요금 =====
const STUDIO_HOURLY = [
  { category: "평일 비피크",        time: "00:00 ~ 18:00", original: 9000,  event: 7000  },
  { category: "평일 피크",          time: "18:00 ~ 24:00", original: 11000, event: 9000  },
  { category: "주말·공휴일 비피크", time: "00:00 ~ 13:00", original: 10000, event: 8000  },
  { category: "주말·공휴일 피크",   time: "13:00 ~ 24:00", original: 12000, event: 10000 },
];

// ===== 연습실 패키지 (평일 / 주말·공휴일) =====
const STUDIO_PACKAGES = [
  {
    name: "데이 패키지",
    time: "10:00 ~ 17:00",
    hours: 7,
    weekday: { original: 56000,  event: 42000  },
    weekend: { original: 71000,  event: 57000  },
  },
  {
    name: "나잇 패키지",
    time: "00:00 ~ 07:00",
    hours: 7,
    weekday: { original: 56000,  event: 42000  },
    weekend: { original: 63000,  event: 49000  },
  },
  {
    name: "올데이 패키지",
    time: "10:00 ~ 22:00",
    hours: 12,
    weekday: { original: 104000, event: 80000  },
    weekend: { original: 126000, event: 102000 },
  },
];

// ===== 파티룸 데이/나잇 (비피크 / 피크) =====
const PARTY_DAY_NIGHT = [
  {
    name: "데이 패키지",
    time: "10:00 ~ 17:00",
    hours: 7,
    off_peak: { original: 100000, event: 70000  },
    peak:     { original: 130000, event: 90000  },
  },
  {
    name: "나잇 패키지",
    time: "19:00 ~ 익일 07:00",
    hours: 12,
    off_peak: { original: 140000, event: 100000 },
    peak:     { original: 160000, event: 120000 },
  },
];

// ===== 파티룸 올데이 (4단계 조합형) =====
// regSum = 데이정상 + 나잇정상 / evtSum = 데이특가 + 나잇특가
// 최종가 = sum × 0.9 (10% 할인)
const PARTY_ALLDAY_TIERS = [
  { today: "평일",         next: "평일",         label: "비피크 + 비피크", regSum: 240000, regFinal: 216000, evtSum: 170000, evtFinal: 153000 },
  { today: "평일",         next: "주말·공휴일", label: "비피크 + 피크",   regSum: 260000, regFinal: 234000, evtSum: 190000, evtFinal: 171000 },
  { today: "주말·공휴일", next: "평일",         label: "피크 + 비피크",   regSum: 270000, regFinal: 243000, evtSum: 190000, evtFinal: 171000 },
  { today: "주말·공휴일", next: "주말·공휴일", label: "피크 + 피크",     regSum: 290000, regFinal: 261000, evtSum: 210000, evtFinal: 189000 },
];

// ===== 파티룸 피크/비피크 기준 =====
const PARTY_DAY_NIGHT_RULES = [
  { today: "평일",         next: "평일",         day: "비피크", night: "비피크" },
  { today: "평일",         next: "주말·공휴일", day: "비피크", night: "피크" },
  { today: "주말·공휴일", next: "평일",         day: "피크",   night: "비피크" },
  { today: "주말·공휴일", next: "주말·공휴일", day: "피크",   night: "피크" },
];

// ===== 장기대관 할인 =====
const LONG_TERM_DISCOUNTS = [
  { range: "월 1~30시간",   discount: "10% 할인" },
  { range: "월 31~69시간",  discount: "20% 할인" },
  { range: "월 70시간 이상", discount: "최대 30% 할인" },
];

// ===== 할인 적용 안내 =====
const DISCOUNT_TABLE = [
  { item: "연습실 패키지",                      basis: "시간제 요금 대비 시간당 1,000원 할인" },
  { item: "장기대관",                           basis: "시간제 요금 합산금액 기준 비율 할인" },
  { item: "오픈 이벤트 기간 장기대관",          basis: "오픈 이벤트 시간제 요금 기준 적용" },
  { item: "패키지 할인 + 장기대관 할인",        basis: "중복 적용 불가" },
  { item: "파티룸 장기대관",                    basis: "별도 문의" },
];

// ===== 연습실 / 파티룸 비교 =====
const COMPARE_TABLE = [
  { label: "이용 목적",       studio: "연습·촬영·안무·보컬·연기", party: "생일파티·모임·뒤풀이" },
  { label: "음식 반입",       studio: "불가",                       party: "가능" },
  { label: "주류 반입",       studio: "불가",                       party: "가능" },
  { label: "기본 포함 인원",  studio: "8인",                        party: "10인" },
  { label: "추가 인원 요금",  studio: "9인부터 1인당 10,000원",     party: "11인부터 1인당 10,000원" },
  { label: "상품 구성",       studio: "시간제 / 데이 / 나잇 / 올데이", party: "데이 / 나잇 / 올데이" },
];

function PriceCell({ original, event }: { original: number; event: number }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="line-through text-[#9b9189] text-xs">
        {formatPrice(original)}
      </span>
      <span className="font-bold text-[#B98768]">
        {formatPrice(event)}
      </span>
    </div>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">Pricing</p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">요금 안내</h1>
        </div>

        {/* 1. 상단 공통 안내 */}
        <div className="mb-12 rounded-2xl border border-[#B98768]/40 bg-[#f5ede6] p-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#B98768]/20 px-4 py-2 text-sm font-semibold text-[#B98768] mb-3">
            <Sparkles className="w-4 h-4" />
            현재 오픈 이벤트 할인 적용 중
          </div>
          <p className="text-sm text-[#3B342F]">
            모든 요금은 <span className="line-through text-[#9b9189]">정상가</span>
            <span className="mx-1">→</span>
            <span className="font-bold text-[#B98768]">오픈 이벤트가</span> 기준으로 안내됩니다.
          </p>
        </div>

        {/* 2. 연습실 요금 */}
        <section className="mb-16">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#3B342F]">연습실 요금</h2>
            <p className="mt-2 text-sm text-[#6f655d]">
              보컬·댄스·연기·뮤지컬 연습, 안무 연습, 촬영을 위한 공간입니다.
              음식 및 주류 반입은 불가합니다.
            </p>
          </div>

          {/* 시간당 요금 */}
          <h3 className="text-lg font-semibold text-[#3B342F] mb-3">시간당 요금</h3>
          <div className="overflow-hidden rounded-2xl border border-[#D8CCBC] mb-8">
            <table className="w-full text-sm">
              <thead className="border-b border-[#D8CCBC] bg-[#EFE7DA]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">구분</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">시간대</th>
                  <th className="px-4 py-3 text-right font-semibold text-[#3B342F]">시간당</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8CCBC]/40 bg-[#F7F3EB]">
                {STUDIO_HOURLY.map((row) => (
                  <tr key={row.category}>
                    <td className="px-4 py-3 font-medium text-[#3B342F]">{row.category}</td>
                    <td className="px-4 py-3 text-[#6f655d]">{row.time}</td>
                    <td className="px-4 py-3 text-right">
                      <PriceCell original={row.original} event={row.event} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 패키지 */}
          <h3 className="text-lg font-semibold text-[#3B342F] mb-1">연습실 패키지</h3>
          <p className="text-xs text-[#9b9189] mb-3">
            시간제보다 시간당 1,000원 할인되는 장시간 이용 상품입니다.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {STUDIO_PACKAGES.map((pkg) => (
              <div key={pkg.name} className="rounded-2xl border border-[#D8CCBC] bg-white p-5">
                <h4 className="text-lg font-bold text-[#3B342F]">{pkg.name}</h4>
                <p className="text-sm text-[#6f655d] mt-1">{pkg.time}</p>
                <p className="text-xs text-[#9b9189] mb-4">{pkg.hours}시간</p>

                <div className="space-y-3">
                  <div className="rounded-lg bg-[#F7F3EB] p-3">
                    <p className="text-xs text-[#9b9189] mb-1">평일</p>
                    <p className="text-sm text-[#9b9189] line-through">
                      {formatPrice(pkg.weekday.original)}
                    </p>
                    <p className="text-xl font-bold text-[#B98768]">
                      {formatPrice(pkg.weekday.event)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#F7F3EB] p-3">
                    <p className="text-xs text-[#9b9189] mb-1">주말·공휴일</p>
                    <p className="text-sm text-[#9b9189] line-through">
                      {formatPrice(pkg.weekend.original)}
                    </p>
                    <p className="text-xl font-bold text-[#B98768]">
                      {formatPrice(pkg.weekend.event)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-[#EFE7DA] p-5 text-sm text-[#6f655d] space-y-1.5">
            <p>• 연습실은 연습·촬영 목적 전용 상품입니다.</p>
            <p>• 음식 및 주류 반입은 불가합니다.</p>
            <p>• 음식·주류 반입을 원하시는 경우 파티룸 패키지로 예약해 주세요.</p>
          </div>
        </section>

        {/* 3. 파티룸 요금 */}
        <section className="mb-16">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-[#3B342F]">파티룸 요금</h2>
              <span className="rounded-full bg-[#B98768] px-3 py-1 text-xs font-bold text-white">
                성인 전용
              </span>
            </div>
            <p className="text-sm text-[#6f655d]">
              생일파티, 모임, 뒤풀이, 소규모 파티를 위한 상품입니다.
              음식 및 주류 반입 가능하며, 성인 전용 상품입니다.
            </p>
          </div>

          {/* 데이 / 나잇 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {PARTY_DAY_NIGHT.map((pkg) => (
              <div key={pkg.name} className="rounded-2xl border border-[#D8CCBC] bg-white p-5">
                <h4 className="text-lg font-bold text-[#3B342F]">{pkg.name}</h4>
                <p className="text-sm text-[#6f655d] mt-1">{pkg.time}</p>
                <p className="text-xs text-[#9b9189] mb-4">{pkg.hours}시간</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[#F7F3EB] p-3">
                    <p className="text-xs text-[#9b9189] mb-1">비피크</p>
                    <p className="text-sm text-[#9b9189] line-through">
                      {formatPrice(pkg.off_peak.original)}
                    </p>
                    <p className="text-xl font-bold text-[#B98768]">
                      {formatPrice(pkg.off_peak.event)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-[#F7F3EB] p-3">
                    <p className="text-xs text-[#9b9189] mb-1">피크</p>
                    <p className="text-sm text-[#9b9189] line-through">
                      {formatPrice(pkg.peak.original)}
                    </p>
                    <p className="text-xl font-bold text-[#B98768]">
                      {formatPrice(pkg.peak.event)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 올데이 (조합형) */}
          <div className="rounded-2xl border border-[#D8CCBC] bg-white p-5 mb-3">
            <div className="flex flex-wrap items-baseline gap-2 mb-1">
              <h4 className="text-lg font-bold text-[#3B342F]">올데이 패키지</h4>
              <span className="text-sm text-[#6f655d]">10:00 ~ 익일 07:00</span>
              <span className="text-xs text-[#9b9189]">21시간</span>
            </div>
            <p className="text-sm text-[#6f655d] mb-4">
              올데이는 <strong className="text-[#3B342F]">데이 + 나잇</strong>의 조합 상품으로,
              당일·익일의 평일/주말·공휴일 조합에 따라 4단계 가격이 적용됩니다.
              각 패키지를 따로 예약하는 것보다 약 10~15% 저렴합니다.
            </p>

            <div className="overflow-hidden rounded-xl border border-[#D8CCBC]">
              <table className="w-full text-sm">
                <thead className="border-b border-[#D8CCBC] bg-[#EFE7DA]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-[#3B342F]">당일</th>
                    <th className="px-3 py-2 text-left font-semibold text-[#3B342F]">익일</th>
                    <th className="px-3 py-2 text-center font-semibold text-[#3B342F]">적용 기준</th>
                    <th className="px-3 py-2 text-right font-semibold text-[#3B342F]">가격 (10% 할인 적용)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8CCBC]/40 bg-[#F7F3EB]">
                  {PARTY_ALLDAY_TIERS.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-[#3B342F] align-top">{row.today}</td>
                      <td className="px-3 py-2 text-[#3B342F] align-top">{row.next}</td>
                      <td className="px-3 py-2 text-center text-xs text-[#6f655d] align-top">{row.label}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex flex-col items-end gap-2">
                          {/* 정상가 */}
                          <div className="flex items-baseline justify-end gap-2">
                            <span className="text-[10px] text-[#9b9189] uppercase tracking-wide">정상가</span>
                            <span className="text-xs text-[#9b9189] line-through">
                              {row.regSum.toLocaleString("ko-KR")}원
                            </span>
                            <span className="text-[#3B342F]">→</span>
                            <span className="font-semibold text-[#3B342F]">
                              {row.regFinal.toLocaleString("ko-KR")}원
                            </span>
                          </div>
                          {/* 특가 */}
                          <div className="flex items-baseline justify-end gap-2">
                            <span className="text-[10px] text-[#B98768] font-bold uppercase tracking-wide">특가</span>
                            <span className="text-xs text-[#9b9189] line-through">
                              {row.evtSum.toLocaleString("ko-KR")}원
                            </span>
                            <span className="text-[#B98768]">→</span>
                            <span className="font-bold text-[#B98768]">
                              {row.evtFinal.toLocaleString("ko-KR")}원
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 4. 파티룸 피크/비피크 기준 */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[#3B342F] mb-2">파티룸 피크 / 비피크 기준</h2>
          <p className="text-sm text-[#6f655d] mb-6">
            파티룸 패키지는 이용 날짜와 다음 날의 평일·주말·공휴일 여부에 따라 피크 / 비피크가 자동 적용됩니다.
          </p>

          <h3 className="text-base font-semibold text-[#3B342F] mb-2">데이 / 나잇 패키지 기준</h3>
          <div className="overflow-hidden rounded-2xl border border-[#D8CCBC] mb-6">
            <table className="w-full text-sm">
              <thead className="border-b border-[#D8CCBC] bg-[#EFE7DA]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">당일</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">익일</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#3B342F]">데이 패키지</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#3B342F]">나잇 패키지</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8CCBC]/40 bg-[#F7F3EB]">
                {PARTY_DAY_NIGHT_RULES.map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-[#3B342F]">{row.today}</td>
                    <td className="px-4 py-3 text-[#3B342F]">{row.next}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        row.day === '피크' ? 'bg-[#B98768]/20 text-[#B98768]' : 'bg-[#EFE7DA] text-[#3B342F]'
                      }`}>{row.day}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        row.night === '피크' ? 'bg-[#B98768]/20 text-[#B98768]' : 'bg-[#EFE7DA] text-[#3B342F]'
                      }`}>{row.night}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl bg-[#EFE7DA] p-5 text-sm text-[#6f655d] space-y-1.5">
            <p>• <strong className="text-[#3B342F]">데이 패키지</strong>: 이용 당일 기준</p>
            <p>• <strong className="text-[#3B342F]">나잇 패키지</strong>: 익일 기준</p>
            <p>• <strong className="text-[#3B342F]">올데이 패키지</strong>: 당일·익일 조합형 (데이 + 나잇 결합) — 위 파티룸 요금 섹션의 4단계 가격 참고</p>
          </div>
        </section>

        {/* 5. 인원 기준 */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[#3B342F] mb-6">인원 기준 안내</h2>
          <div className="overflow-hidden rounded-2xl border border-[#D8CCBC] mb-3">
            <table className="w-full text-sm">
              <thead className="border-b border-[#D8CCBC] bg-[#EFE7DA]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">구분</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">기본 포함 인원</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">추가 요금</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8CCBC]/40 bg-[#F7F3EB]">
                <tr>
                  <td className="px-4 py-3 font-medium text-[#3B342F]">연습실</td>
                  <td className="px-4 py-3 text-[#3B342F]">8인까지 포함</td>
                  <td className="px-4 py-3 text-[#3B342F]">9인부터 1인당 10,000원</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-[#3B342F]">파티룸</td>
                  <td className="px-4 py-3 text-[#3B342F]">10인까지 포함</td>
                  <td className="px-4 py-3 text-[#3B342F]">11인부터 1인당 10,000원</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-[#6f655d]">
            기준 인원을 초과하는 경우 사전 문의 후 이용 가능합니다.
          </p>
        </section>

        {/* 6. 월 장기대관 할인 */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[#3B342F] mb-2">월 장기대관 할인</h2>
          <p className="text-sm text-[#6f655d] mb-4">
            정해진 요일과 시간에 반복적으로 이용하는 월 단위 고정 대관 상품입니다.
          </p>
          <div className="rounded-xl bg-white border border-[#D8CCBC] p-5 text-sm text-[#6f655d] mb-6 space-y-1">
            <p className="font-semibold text-[#3B342F] mb-1">예시</p>
            <p>· 매주 월요일 19:00~21:00</p>
            <p>· 매주 수요일 20:00~22:00</p>
          </div>

          <h3 className="text-base font-semibold text-[#3B342F] mb-2">할인 기준</h3>
          <div className="overflow-hidden rounded-2xl border border-[#D8CCBC] mb-6">
            <table className="w-full text-sm">
              <thead className="border-b border-[#D8CCBC] bg-[#EFE7DA]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">월간 이용시간</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">할인율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8CCBC]/40 bg-[#F7F3EB]">
                {LONG_TERM_DISCOUNTS.map((row) => (
                  <tr key={row.range}>
                    <td className="px-4 py-3 text-[#3B342F]">{row.range}</td>
                    <td className="px-4 py-3 font-semibold text-[#B98768]">{row.discount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl bg-white border border-[#D8CCBC] p-5 text-sm space-y-2 mb-6">
            <p className="font-semibold text-[#3B342F]">계산 기준</p>
            <p className="text-[#6f655d]">장기대관 기준금액 = 시간제 요금 × 총 예약시간</p>
            <p className="text-[#6f655d]">장기대관 최종금액 = 장기대관 기준금액 × (1 - 할인율)</p>
            <p className="text-xs text-[#9b9189] mt-2">
              * 오픈 이벤트 기간에는 오픈 이벤트 시간제 요금을 기준으로 계산됩니다.
            </p>
          </div>

          {/* 예시 */}
          <h3 className="text-base font-semibold text-[#3B342F] mb-2">계산 예시</h3>
          <p className="text-xs text-[#9b9189] mb-3">평일 비피크 시간대 70시간 이용 시</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-[#D8CCBC] bg-white p-5">
              <h4 className="font-semibold text-[#3B342F] mb-3">정상가 기준</h4>
              <div className="space-y-2 text-sm">
                <p className="text-[#6f655d]">9,000원 × 70시간 = <span className="line-through text-[#9b9189]">630,000원</span></p>
                <p className="text-[#6f655d]">630,000원 - 189,000원 (30%)</p>
                <p className="text-xl font-bold text-[#B98768]">441,000원</p>
              </div>
            </div>
            <div className="rounded-2xl border border-[#B98768]/40 bg-[#f5ede6] p-5">
              <h4 className="font-semibold text-[#3B342F] mb-3 flex items-center gap-2">
                오픈 이벤트가 기준
                <Sparkles className="w-4 h-4 text-[#B98768]" />
              </h4>
              <div className="space-y-2 text-sm">
                <p className="text-[#6f655d]">7,000원 × 70시간 = <span className="line-through text-[#9b9189]">490,000원</span></p>
                <p className="text-[#6f655d]">490,000원 - 147,000원 (30%)</p>
                <p className="text-xl font-bold text-[#B98768]">343,000원</p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. 할인 적용 안내 */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[#3B342F] mb-6">할인 적용 안내</h2>
          <div className="overflow-hidden rounded-2xl border border-[#D8CCBC]">
            <table className="w-full text-sm">
              <thead className="border-b border-[#D8CCBC] bg-[#EFE7DA]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">항목</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">기준</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8CCBC]/40 bg-[#F7F3EB]">
                {DISCOUNT_TABLE.map((row) => (
                  <tr key={row.item}>
                    <td className="px-4 py-3 font-medium text-[#3B342F]">{row.item}</td>
                    <td className="px-4 py-3 text-[#6f655d]">{row.basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 8. 연습실 / 파티룸 비교 */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[#3B342F] mb-6">연습실 / 파티룸 구분</h2>
          <div className="overflow-x-auto rounded-2xl border border-[#D8CCBC]">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="border-b border-[#D8CCBC] bg-[#EFE7DA]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">구분</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">연습실</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">파티룸</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8CCBC]/40 bg-[#F7F3EB]">
                {COMPARE_TABLE.map((row) => (
                  <tr key={row.label}>
                    <td className="px-4 py-3 font-medium text-[#3B342F] whitespace-nowrap">{row.label}</td>
                    <td className="px-4 py-3 text-[#6f655d]">{row.studio}</td>
                    <td className="px-4 py-3 text-[#6f655d]">{row.party}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 9. 최종 안내 */}
        <section className="mb-12 rounded-2xl bg-[#EFE7DA] p-6 text-sm text-[#6f655d] space-y-3">
          <p>
            <strong className="text-[#3B342F]">A1 STUDIO는 연습실과 파티룸 요금을 분리하여 운영합니다.</strong>
          </p>
          <p>
            연습실은 연습·촬영 목적 전용 상품으로 음식 및 주류 반입이 불가합니다.
            음식·주류 반입을 원하시는 경우 파티룸 패키지로 예약해 주세요.
          </p>
          <p>
            장기대관은 고정 요일·고정 시간 이용을 기준으로 월 단위 할인 적용이 가능하며,
            패키지 할인과 장기대관 할인은 중복 적용되지 않습니다.
          </p>
          <p>기준 인원을 초과하는 경우 사전 문의 후 이용 가능합니다.</p>
        </section>

        {/* 환불 규정 */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#3B342F] mb-4">환불 규정</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#D8CCBC] bg-[#F7F3EB] p-6">
              <h3 className="text-lg font-bold text-[#3B342F] mb-3">연습실</h3>
              <ul className="space-y-2 text-sm text-[#6f655d] list-disc list-inside">
                <li>이용 3일 전: 100% 환불</li>
                <li>이용 2일 전: 50% 환불</li>
                <li>이용 전날: 취소 불가</li>
                <li>이용 당일: 취소 불가</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#D8CCBC] bg-[#F7F3EB] p-6">
              <h3 className="text-lg font-bold text-[#3B342F] mb-3">파티룸</h3>
              <ul className="space-y-2 text-sm text-[#6f655d] list-disc list-inside">
                <li>이용 7일 전 이상: 전액 환불</li>
                <li>이용 3일 ~ 6일 전: 50% 환불</li>
                <li>이용 전날: 취소 불가</li>
                <li>이용 당일: 취소 불가</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 flex items-start gap-2 text-xs text-[#b0a89e]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            천재지변·시설 장애로 운영 불가 시 100% 환불
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-[#B98768]/15 to-[#B98768]/15 p-8 text-center">
          <h3 className="text-xl font-bold text-[#3B342F]">지금 바로 예약하세요</h3>
          <p className="mt-2 text-sm text-[#6f655d]">
            실시간 예약현황을 확인하고 원하는 시간을 선택하세요
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/booking"
              className="rounded-full bg-[#B98768] px-8 py-3 text-sm font-bold text-[#F7F3EB] transition-all hover:bg-[#a9785c] active:scale-95"
            >
              예약하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
