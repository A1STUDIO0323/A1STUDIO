import { Metadata } from "next";
import { Info, Sparkles } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { REFUND_POLICY } from "@/lib/constants";

export const metadata: Metadata = { title: "요금안내" };

// 연습실 시간당 요금
const ROOM_PRICING_TABLE = [
  {
    category: "평일 비피크",
    desc: "월~금 00:00~18:00",
    priceOriginal: 9000,
    priceEvent: 7000,
    minHours: 1,
    highlight: false,
  },
  {
    category: "평일 피크타임",
    desc: "월~금 18:00~00:00",
    priceOriginal: 11000,
    priceEvent: 9000,
    minHours: 1,
    highlight: false,
  },
  {
    category: "주말/공휴일 비피크",
    desc: "토·일·공휴일 00:00~13:00",
    priceOriginal: 10000,
    priceEvent: 8000,
    minHours: 1,
    highlight: true,
  },
  {
    category: "주말/공휴일 피크타임",
    desc: "토·일·공휴일 13:00~00:00",
    priceOriginal: 12000,
    priceEvent: 10000,
    minHours: 1,
    highlight: false,
  },
];

// 파티룸 패키지 요금
const PARTY_ROOM_PACKAGES = [
  {
    name: "낮 패키지",
    time: "10:00 ~ 17:00",
    hours: 7,
    priceOffPeak: { regular: 100000, event: 70000 },
    pricePeak: { regular: 130000, event: 90000 },
  },
  {
    name: "야간 패키지",
    time: "19:00 ~ 익일 07:00",
    hours: 12,
    priceOffPeak: { regular: 140000, event: 100000 },
    pricePeak: { regular: 160000, event: 120000 },
  },
  {
    name: "종일권",
    time: "10:00 ~ 익일 07:00",
    hours: 21,
    priceOffPeak: { regular: 210000, event: 150000 },
    pricePeak: { regular: 250000, event: 180000 },
  },
];

const ROOM_SIZE_PYEONG = 15;
const PYEONG_PER_PERSON = 2.5;
const EXTRA_PERSON_FEE_PER_HOUR = 5000;
const BASE_MAX_HEADCOUNT = Math.max(1, Math.floor(ROOM_SIZE_PYEONG / PYEONG_PER_PERSON));

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
            Pricing
          </p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">요금 안내</h1>
          <p className="mt-3 text-[#6f655d]">
            플랫폼 수수료 없이 직접 예약 — 모든 요금은 VAT 포함
          </p>
        </div>

        {/* 연습실 요금표 */}
        <div className="mb-16">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#3B342F]">연습실 요금</h2>
            <p className="mt-1 text-sm text-[#6f655d]">
              시간 단위로 자유롭게 예약 가능
            </p>
          </div>
          
          <div className="overflow-hidden rounded-2xl border border-[#D8CCBC]">
            <table className="w-full text-sm">
              <thead className="border-b border-[#D8CCBC] bg-[#EFE7DA]">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-[#3B342F]">구분</th>
                  <th className="px-6 py-4 text-left font-semibold text-[#3B342F]">시간대</th>
                  <th className="px-6 py-4 text-right font-semibold text-[#3B342F]">시간당</th>
                  <th className="px-6 py-4 text-right font-semibold text-[#3B342F]">최소</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 bg-[#F7F3EB]">
                {ROOM_PRICING_TABLE.map((row) => (
                  <tr
                    key={row.category}
                    className={row.highlight ? "bg-[#B98768]/8" : ""}
                  >
                    <td className="px-6 py-4 font-medium text-[#3B342F]">
                      {row.category}
                      {row.highlight && (
                        <span className="ml-2 rounded-full bg-[#B98768]/20 px-2 py-0.5 text-xs text-[#B98768]">
                          인기
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[#6f655d]">{row.desc}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="line-through text-[#9b9189] text-sm">
                          {formatPrice(row.priceOriginal)}
                        </span>
                        <span className="font-bold text-[#B98768]">
                          {formatPrice(row.priceEvent)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-[#6f655d]">
                      {row.minHours}시간
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 파티룸 요금표 */}
        <div className="mb-16">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-[#3B342F]">파티룸 요금</h2>
              <span className="rounded-full bg-[#B98768] px-3 py-1 text-xs font-bold text-white">
                성인 전용
              </span>
            </div>
            <p className="text-sm text-[#6f655d]">
              패키지 단위로 예약 (최대 10인, 추가 인원 요금 없음)
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#B98768]/20 px-4 py-2 text-sm font-semibold text-[#B98768]">
              <Sparkles className="w-4 h-4" />
              현재 오픈 이벤트 기간 - 특별 할인가 적용 중
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PARTY_ROOM_PACKAGES.map((pkg) => (
              <div key={pkg.name} className="rounded-2xl border border-[#D8CCBC] bg-white p-6">
                <h3 className="text-xl font-bold text-[#3B342F] mb-2">{pkg.name}</h3>
                <p className="text-sm text-[#6f655d] mb-1">{pkg.time}</p>
                <p className="text-xs text-[#9b9189] mb-4">({pkg.hours}시간)</p>
                
                <div className="space-y-3">
                  {/* 비피크 */}
                  <div className="rounded-lg bg-[#F7F3EB] p-3">
                    <p className="text-xs text-[#9b9189] mb-1">비피크</p>
                    <p className="text-sm text-[#9b9189] line-through">
                      {pkg.priceOffPeak.regular.toLocaleString("ko-KR")}원
                    </p>
                    <p className="text-2xl font-bold text-[#B98768]">
                      {pkg.priceOffPeak.event.toLocaleString("ko-KR")}원
                    </p>
                  </div>
                  
                  {/* 피크 */}
                  <div className="rounded-lg bg-[#F7F3EB] p-3">
                    <p className="text-xs text-[#9b9189] mb-1">피크</p>
                    <p className="text-sm text-[#9b9189] line-through">
                      {pkg.pricePeak.regular.toLocaleString("ko-KR")}원
                    </p>
                    <p className="text-2xl font-bold text-[#B98768]">
                      {pkg.pricePeak.event.toLocaleString("ko-KR")}원
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 파티룸 안내사항 */}
          <div className="mt-6 rounded-xl bg-[#EFE7DA] p-6 text-sm text-[#6f655d] space-y-2">
            <p>• 낮 패키지와 야간 패키지 사이 17:00~19:00은 청소·환기 시간으로 예약 불가</p>
            <p>• 최대 10인 기준이며 추가 인원 요금은 없습니다</p>
            <p>• 만 19세 이상 성인 전용 공간입니다</p>
            <p>• 10인 기준 1인당: 낮 패키지 7,000원부터 / 야간 패키지 10,000원부터</p>
            <p>• 피크/비피크 구분은 예약 날짜의 요일에 따라 자동 적용됩니다</p>
          </div>
        </div>

        {/* 추가 요금 (연습실만 해당) */}
        <h2 className="mt-14 text-2xl font-bold text-[#3B342F]">추가 요금 (연습실)</h2>
        <p className="mt-1 text-sm text-[#6f655d]">
          최대 인원은 평수 기준으로 계산되며, 초과 인원은 시간당 추가 요금이 적용됩니다.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[#D8CCBC]">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-white/5 bg-[#F7F3EB]">
              <tr>
                <td className="px-6 py-4 text-[#3B342F]">
                  기본 최대 인원 ({ROOM_SIZE_PYEONG}평 기준)
                </td>
                <td className="px-6 py-4 text-right font-medium text-[#3B342F]">
                  {BASE_MAX_HEADCOUNT}명
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-[#3B342F]">추가 인원 요금 (1인당)</td>
                <td className="px-6 py-4 text-right font-medium text-[#3B342F]">
                  {formatPrice(EXTRA_PERSON_FEE_PER_HOUR)} / 시간
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-[#9b9189]">
          계산식: 최대 인원 = 평수 ÷ {PYEONG_PER_PERSON} (소수점 버림)
        </p>

        {/* 환불규정 요약 */}
        <h2 className="mt-14 text-2xl font-bold text-[#3B342F]">환불 규정</h2>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[#D8CCBC]">
          <table className="w-full text-sm">
            <thead className="border-b border-[#D8CCBC] bg-[#EFE7DA]">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-[#3B342F]">취소 시점</th>
                <th className="px-6 py-4 text-right font-semibold text-[#3B342F]">환불율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-[#F7F3EB]">
              {REFUND_POLICY.map((row) => (
                <tr key={row.condition}>
                  <td className="px-6 py-4 text-[#3B342F]">{row.condition}</td>
                  <td className="px-6 py-4 text-right font-bold text-[#3B342F]">
                    {row.refundRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-start gap-2 text-xs text-[#b0a89e]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          천재지변·시설 장애로 운영 불가 시 100% 환불
        </div>

        {/* CTA */}
        <div className="mt-14 rounded-2xl bg-gradient-to-r from-[#B98768]/15 to-[#B98768]/15 p-8 text-center">
          <h3 className="text-xl font-bold text-[#3B342F]">지금 바로 예약하세요</h3>
          <p className="mt-2 text-sm text-[#6f655d]">
            실시간 예약현황을 확인하고 원하는 시간을 선택하세요
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {/* 예약 메뉴 임시 숨김 (코드 보관)
            <Link
              href="/booking"
              className="rounded-full bg-[#B98768] px-8 py-3 text-sm font-bold text-[#F7F3EB] transition-all hover:bg-[#a9785c]"
            >
              예약하기
            </Link>
            <Link
              href="/availability"
              className="rounded-full border border-[#D8CCBC] px-8 py-3 text-sm font-medium text-[#3B342F] transition-all hover:border-[#D8CCBC]"
            >
              예약현황 확인
            </Link>
            */}
          </div>
        </div>
      </div>
    </div>
  );
}
