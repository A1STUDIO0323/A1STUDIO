import { Star } from "lucide-react";
import { STUDIO_DESCRIPTION, STUDIO_NAME, STUDIO_TAGLINE } from "@/lib/constants";

export default function Hero() {
  return (
    <section className="relative flex min-h-[92vh] items-center overflow-hidden bg-[#F7F3EB]">
      {/* 배경 그라디언트 오브 */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-[#B98768]/10 blur-[120px]" />
        <div className="absolute -right-20 bottom-0 h-[400px] w-[500px] rounded-full bg-[#B98768]/8 blur-[100px]" />
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#B98768]/8 blur-[80px]" />
        {/* 격자 배경 */}
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `linear-gradient(rgba(59,52,47,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(59,52,47,.08) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* 배지 */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#B98768]/40 bg-[#B98768]/8 px-4 py-1.5 text-sm text-[#B98768]">
            <Star className="h-3.5 w-3.5 fill-[#B98768] text-[#B98768]" />
            VOCAL · DANCE · ACT · MUSICAL
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#3B342F] sm:text-5xl lg:text-6xl">
            {STUDIO_NAME}
            <br />
            <span className="bg-gradient-to-r from-[#B98768] to-[#a9785c] bg-clip-text text-transparent">
              {STUDIO_TAGLINE}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[#6f655d] sm:text-lg">
            {STUDIO_DESCRIPTION}
          </p>

          {/* CTA 버튼 그룹 */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {/* 예약 메뉴 임시 숨김 (코드 보관)
            <Link
              href="/booking"
              className="group flex items-center gap-2 rounded-full bg-[#B98768] px-8 py-4 text-base font-bold text-[#F7F3EB] shadow-2xl shadow-[#B98768]/15 transition-all hover:bg-[#a9785c] hover:shadow-[#B98768]/20 active:scale-95"
            >
              <CalendarCheck className="h-5 w-5" />
              지금 예약하기
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/availability"
              className="flex items-center gap-2 rounded-full border border-[#D8CCBC] px-8 py-4 text-base font-semibold text-[#3B342F] transition-all hover:border-[#D8CCBC] hover:text-[#B98768]"
            >
              예약현황 확인
            </Link>
            */}
          </div>

          {/* 소셜 프루프 */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-[#9b9189]">
            {[
              { value: "약 20평", label: "단독 공간" },
              { value: "4가지", label: "활용 용도" },
              { value: "8분", label: "문정역 도보" },
              { value: "10분", label: "장지역 도보" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-[#3B342F]">{stat.value}</p>
                <p className="mt-0.5 text-xs text-[#9b9189]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 스크롤 인디케이터 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="h-10 w-6 rounded-full border-2 border-[#D8CCBC] flex items-start justify-center pt-2">
          <div className="h-2 w-1 rounded-full bg-[#3B342F]/5" />
        </div>
      </div>
    </section>
  );
}
