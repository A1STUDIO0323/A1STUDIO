import { Metadata } from "next";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "이용안내" };

const RULES = [
  // 예약 안내 임시 숨김 (코드 보관)
  // "예약 시간에는 준비 및 정리 시간이 포함됩니다. 시간을 엄수해 주세요.",
  "음식물 반입은 금지됩니다. 음료(페트병)만 가능합니다.",
  "개인 악기·장비 반입은 사전에 문의해 주세요.",
  "화재 예방을 위해 흡연은 건물 외부 지정 장소에서만 가능합니다.",
  "시설 훼손 시 수리 비용이 청구될 수 있습니다.",
  "연습실 내 녹음·촬영은 자유롭게 가능합니다.",
  "소지품은 본인이 관리해 주세요. 분실물에 대해 책임지지 않습니다.",
];

const FAQ = [
  // 예약/결제 FAQ 임시 숨김 (코드 보관)
  // {
  //   q: "비회원도 예약할 수 있나요?",
  //   a: "네! 회원가입 없이 이름과 휴대폰 번호만으로 예약 가능합니다. 예약 후 문자로 확인 코드가 발송됩니다.",
  // },
  // {
  //   q: "예약 변경이 가능한가요?",
  //   a: "예약 변경은 현재 지원하지 않습니다. 기존 예약을 취소 후 재예약해 주세요. 환불규정에 따라 처리됩니다.",
  // },
  {
    q: "개인 악기를 반입할 수 있나요?",
    a: "기본 장비 외 추가 반입은 사전 문의가 필요합니다. 공간 및 전원 상황에 따라 안내해 드립니다.",
  },
  {
    q: "주차는 어떻게 하나요?",
    a: "건물 앞 입구 1대 주차 가능합니다 (SUV 이상 불가). 이외에는 인근 공영주차장을 이용해 주세요.",
  },
  // {
  //   q: "결제는 어떤 수단을 지원하나요?",
  //   a: "카드, 토스페이, 카카오페이, 네이버페이 등 대부분의 결제 수단을 지원합니다.",
  // },
  // {
  //   q: "현금영수증 발급이 가능한가요?",
  //   a: "결제 후 문의 페이지 또는 전화로 요청해 주시면 안내해 드립니다.",
  // },
];

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
            Guide
          </p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">이용 안내</h1>
        </div>

        {/* 이용수칙 */}
        <section id="rules">
          <h2 className="mb-5 text-2xl font-bold text-[#3B342F]">이용 수칙</h2>
          <div className="space-y-3">
            {RULES.map((rule, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl border border-[#D8CCBC] bg-[#EFE7DA] px-5 py-4 text-sm text-[#3B342F]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#B98768]/15 text-xs font-bold text-[#B98768]">
                  {i + 1}
                </span>
                {rule}
              </div>
            ))}
          </div>
        </section>

        {/* 결제/환불 안내 임시 숨김 (코드 보관)
        <section id="refund" className="mt-14">
          <h2 className="mb-5 text-2xl font-bold text-[#3B342F]">환불 규정</h2>
          <div className="overflow-hidden rounded-2xl border border-[#D8CCBC]">
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
                    <td className="px-6 py-4 text-right">
                      <span
                        className={cn(
                          "font-bold",
                          row.refundRate === 100
                            ? "text-emerald-400"
                            : row.refundRate === 0
                              ? "text-red-400"
                              : "text-amber-500"
                        )}
                      >
                        {row.refundRate}% 환불
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-[#b0a89e]">
            * 천재지변, 시설 장애 등 운영 불가 상황에서는 100% 환불됩니다.
          </p>
        </section>
        */}

        {/* FAQ */}
        <section id="faq" className="mt-14">
          <h2 className="mb-5 text-2xl font-bold text-[#3B342F]">자주 묻는 질문</h2>
          <div className="space-y-4">
            {FAQ.map((item, i) => (
              <details
                key={i}
                className="group rounded-xl border border-[#D8CCBC] bg-[#EFE7DA]"
              >
                <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold text-[#3B342F]">
                  {item.q}
                  <span className="ml-2 shrink-0 text-[#9b9189] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="px-5 pb-4 pt-0 text-sm leading-relaxed text-[#6f655d]">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
