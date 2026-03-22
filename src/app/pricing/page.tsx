import { Metadata } from "next";
import { Info } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { REFUND_POLICY } from "@/lib/constants";

export const metadata: Metadata = { title: "요금안내" };

const PRICING_TABLE = [
  {
    category: "평일 주간",
    desc: "월~금 09:00 – 18:00",
    pricePerHour: 15000,
    minHours: 2,
    highlight: false,
  },
  {
    category: "평일 야간",
    desc: "월~금 18:00 – 24:00",
    pricePerHour: 20000,
    minHours: 2,
    highlight: false,
  },
  {
    category: "주말 종일",
    desc: "토·일 09:00 – 24:00",
    pricePerHour: 20000,
    minHours: 2,
    highlight: true,
  },
];

// 시간 패키지 임시 보관 (미구현)
// const PACKAGES = [
//   { name: "패키지 10H", hours: 10, price: 130000, perHour: 13000, validMonths: 3 },
//   { name: "패키지 20H", hours: 20, price: 240000, perHour: 12000, validMonths: 3 },
//   { name: "패키지 30H", hours: 30, price: 330000, perHour: 11000, validMonths: 6 },
// ];

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

        {/* 기본 요금표 */}
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
              {PRICING_TABLE.map((row) => (
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
                  <td className="px-6 py-4 text-right font-bold text-[#3B342F]">
                    {formatPrice(row.pricePerHour)}
                  </td>
                  <td className="px-6 py-4 text-right text-[#6f655d]">
                    {row.minHours}시간
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 시간 패키지 임시 숨김 (코드 보관)
        <h2 className="mt-14 text-2xl font-bold text-[#3B342F]">시간 패키지</h2>
        <p className="mt-1 text-sm text-[#6f655d]">
          미리 구매해 두고 기간 내 자유롭게 나눠 사용
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {PACKAGES.map((pkg) => (
            <div
              key={pkg.name}
              className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-5"
            >
              <h3 className="font-bold text-[#3B342F]">{pkg.name}</h3>
              <p className="mt-1 text-sm text-[#9b9189]">{pkg.validMonths}개월 유효</p>
              <p className="mt-4 text-3xl font-extrabold text-[#3B342F]">
                {formatPrice(pkg.price)}
              </p>
              <p className="mt-0.5 text-xs text-[#B98768]">
                {formatPrice(pkg.perHour)}/시간
              </p>
            </div>
          ))}
        </div>
        */}

        {/* 추가 요금 */}
        <h2 className="mt-14 text-2xl font-bold text-[#3B342F]">추가 요금</h2>
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
