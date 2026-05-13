import { Metadata } from "next";
import Link from "next/link";
import { Sparkles, CalendarCheck, Clock, Info } from "lucide-react";

export const metadata: Metadata = { title: "장기대관 요금 안내" };

// 수·금 11:00~13:00, 공휴일 제외
// 평일 비피크 (00:00~18:00) 적용
const HOURLY_RATE = { original: 9000, event: 7000 };
const HOURS_PER_SESSION = 2;       // 11:00~13:00
const SESSIONS_PER_WEEK = 2;       // 수요일 + 금요일
const HOURS_PER_WEEK = HOURS_PER_SESSION * SESSIONS_PER_WEEK; // 4시간

// 월 4주 / 5주 기준 (공휴일 제외 시 실제 주수 달라질 수 있음)
const MONTHLY_SCENARIOS = [
  { weeks: 4, label: "4주 기준 (공휴일 0회)", sessions: 8,  hours: 16 },
  { weeks: 4, label: "4주 중 공휴일 1회 제외",  sessions: 7,  hours: 14 },
  { weeks: 4, label: "4주 중 공휴일 2회 제외",  sessions: 6,  hours: 12 },
  { weeks: 5, label: "5주 기준 (공휴일 0회)", sessions: 10, hours: 20 },
];

// 장기대관 할인율 (월 이용시간 기준)
function getDiscountRate(hours: number): number {
  if (hours >= 70) return 0.30;
  if (hours >= 31) return 0.20;
  if (hours >= 1)  return 0.10;
  return 0;
}

function calcLongTerm(hours: number) {
  const discount = getDiscountRate(hours);
  const originalBase = HOURLY_RATE.original * hours;
  const eventBase    = HOURLY_RATE.event    * hours;
  return {
    discount,
    originalBase,
    eventBase,
    originalFinal: Math.round(originalBase * (1 - discount)),
    eventFinal:    Math.round(eventBase    * (1 - discount)),
  };
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

export default function LongTermPricingPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">Long-term Rental</p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">장기대관 요금 안내</h1>
        </div>

        {/* 이벤트 배너 */}
        <div className="mb-10 rounded-2xl border border-[#B98768]/40 bg-[#f5ede6] p-5 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#B98768]/20 px-4 py-2 text-sm font-semibold text-[#B98768] mb-2">
            <Sparkles className="w-4 h-4" />
            현재 오픈 이벤트 할인 적용 중
          </div>
          <p className="text-sm text-[#3B342F]">
            이벤트 기간에는 <span className="font-bold text-[#B98768]">오픈 이벤트가</span>를 기준으로 장기대관 할인이 추가 적용됩니다.
          </p>
        </div>

        {/* 대관 일정 요약 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#3B342F] mb-4">대관 일정</h2>
          <div className="rounded-2xl border border-[#D8CCBC] bg-white p-6 space-y-4">
            <div className="flex items-start gap-3">
              <CalendarCheck className="w-5 h-5 text-[#B98768] mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-[#3B342F]">요일</p>
                <p className="text-[#6f655d] text-sm">매주 수요일 · 금요일 (공휴일 제외)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#B98768] mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-[#3B342F]">시간</p>
                <p className="text-[#6f655d] text-sm">11:00 ~ 13:00 (2시간)</p>
              </div>
            </div>
            <div className="rounded-lg bg-[#EFE7DA] px-4 py-3 text-sm text-[#6f655d]">
              <span className="font-semibold text-[#3B342F]">적용 요금:</span>{" "}
              평일 비피크 (00:00 ~ 18:00) — 시간당{" "}
              <span className="line-through text-[#9b9189]">{fmt(HOURLY_RATE.original)}</span>{" "}
              <span className="font-bold text-[#B98768]">{fmt(HOURLY_RATE.event)}</span>
            </div>
          </div>
        </section>

        {/* 할인 기준 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#3B342F] mb-2">장기대관 할인 기준</h2>
          <p className="text-sm text-[#6f655d] mb-4">
            월간 총 이용시간에 따라 할인율이 달라집니다.
          </p>
          <div className="overflow-hidden rounded-2xl border border-[#D8CCBC]">
            <table className="w-full text-sm">
              <thead className="border-b border-[#D8CCBC] bg-[#EFE7DA]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">월간 이용시간</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">할인율</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">해당 여부</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8CCBC]/40 bg-[#F7F3EB]">
                {[
                  { range: "월 1~30시간",   rate: "10%",       match: true  },
                  { range: "월 31~69시간",  rate: "20%",       match: false },
                  { range: "월 70시간 이상", rate: "최대 30%", match: false },
                ].map((row) => (
                  <tr key={row.range}>
                    <td className="px-4 py-3 text-[#3B342F]">{row.range}</td>
                    <td className="px-4 py-3 font-semibold text-[#B98768]">{row.rate} 할인</td>
                    <td className="px-4 py-3">
                      {row.match ? (
                        <span className="rounded-full bg-[#B98768]/20 px-3 py-1 text-xs font-bold text-[#B98768]">
                          ✓ 해당
                        </span>
                      ) : (
                        <span className="text-xs text-[#c0b8af]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-[#9b9189]">
            수·금 2시간 × 주 2회 기준 월 12~20시간 → <strong>10% 할인</strong> 구간 적용
          </p>
        </section>

        {/* 월별 요금 시나리오 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-[#3B342F] mb-2">월별 예상 요금</h2>
          <p className="text-sm text-[#6f655d] mb-4">
            공휴일 발생 여부에 따른 월 이용시간과 최종 요금입니다.
          </p>

          <div className="space-y-4">
            {MONTHLY_SCENARIOS.map((sc) => {
              const calc = calcLongTerm(sc.hours);
              return (
                <div key={sc.label} className="rounded-2xl border border-[#D8CCBC] bg-white p-5">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                    <div>
                      <p className="font-semibold text-[#3B342F]">{sc.label}</p>
                      <p className="text-sm text-[#6f655d]">
                        총 {sc.sessions}회 · {sc.hours}시간 ·{" "}
                        <span className="font-semibold text-[#B98768]">{(calc.discount * 100).toFixed(0)}% 할인</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* 정상가 기준 */}
                    <div className="rounded-xl bg-[#F7F3EB] border border-[#D8CCBC] p-4">
                      <p className="text-xs text-[#9b9189] mb-2">정상가 기준</p>
                      <p className="text-xs text-[#9b9189]">
                        {fmt(HOURLY_RATE.original)} × {sc.hours}h = <span className="line-through">{fmt(calc.originalBase)}</span>
                      </p>
                      <p className="text-xs text-[#9b9189] mb-1">
                        -{(calc.discount * 100).toFixed(0)}% = {fmt(calc.originalBase - calc.originalFinal)}
                      </p>
                      <p className="text-xl font-bold text-[#3B342F]">{fmt(calc.originalFinal)}</p>
                    </div>

                    {/* 이벤트가 기준 */}
                    <div className="rounded-xl bg-[#f5ede6] border border-[#B98768]/30 p-4">
                      <p className="text-xs text-[#B98768] font-semibold mb-2 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> 이벤트가 기준
                      </p>
                      <p className="text-xs text-[#9b9189]">
                        {fmt(HOURLY_RATE.event)} × {sc.hours}h = <span className="line-through">{fmt(calc.eventBase)}</span>
                      </p>
                      <p className="text-xs text-[#9b9189] mb-1">
                        -{(calc.discount * 100).toFixed(0)}% = {fmt(calc.eventBase - calc.eventFinal)}
                      </p>
                      <p className="text-xl font-bold text-[#B98768]">{fmt(calc.eventFinal)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 안내 사항 */}
        <section className="mb-10 rounded-2xl bg-[#EFE7DA] p-6 text-sm text-[#6f655d] space-y-2">
          <p className="font-semibold text-[#3B342F] mb-1">안내 사항</p>
          <p>• 장기대관은 <strong className="text-[#3B342F]">고정 요일·고정 시간</strong> 기준 월 단위 할인 적용입니다.</p>
          <p>• 공휴일은 대관에서 제외되며, 해당 회차는 요금에서 차감됩니다.</p>
          <p>• 패키지 할인과 장기대관 할인은 <strong className="text-[#3B342F]">중복 적용 불가</strong>입니다.</p>
          <p>• 오픈 이벤트 기간에는 <strong className="text-[#3B342F]">이벤트가 기준</strong>으로 할인이 적용됩니다.</p>
          <p>• 실제 월별 요금은 해당 월의 공휴일 수에 따라 달라질 수 있습니다.</p>
          <div className="flex items-start gap-2 mt-3 text-xs text-[#b0a89e]">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>장기대관 신청 및 문의는 아래 문의하기 버튼을 이용해 주세요.</span>
          </div>
        </section>

        {/* CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-[#B98768]/15 to-[#B98768]/15 p-8 text-center">
          <h3 className="text-xl font-bold text-[#3B342F]">장기대관 문의하기</h3>
          <p className="mt-2 text-sm text-[#6f655d]">
            자세한 안내 및 일정 조율은 문의를 통해 진행해 드립니다.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/contact"
              className="rounded-full bg-[#B98768] px-8 py-3 text-sm font-bold text-[#F7F3EB] transition-all hover:bg-[#a9785c] active:scale-95"
            >
              문의하기
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-[#B98768] px-8 py-3 text-sm font-bold text-[#B98768] transition-all hover:bg-[#B98768]/10"
            >
              전체 요금 보기
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
