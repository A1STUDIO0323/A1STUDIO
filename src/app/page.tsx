import { Metadata } from "next";
import HeroScroll from "@/components/HeroScroll";
import StudioIntro from "@/components/home/StudioIntro";
import AboutSection from "@/components/home/AboutSection";
import FadeInSection from "@/components/FadeInSection";
import GallerySection from "@/components/home/GallerySection";
import PricingSummary from "@/components/home/PricingSummary";
import ReviewsPreview from "@/components/home/ReviewsPreview";
import LocationSection from "@/components/home/LocationSection";
import { STUDIO_NAME, STUDIO_DESCRIPTION } from "@/lib/constants";
import Link from "next/link";
import { Mic2, Music2, Clapperboard, Star, ScanFace, Camera, Piano, Dumbbell, BookOpen, Mic } from "lucide-react";

export const metadata: Metadata = {
  title: STUDIO_NAME,
  description: STUDIO_DESCRIPTION,
};

const ROOM_USES = [
  { icon: Mic2,         label: "VOCAL",   ko: "보컬",   desc: "전자피아노로 반주하며 보컬 연습" },
  { icon: Music2,       label: "DANCE",   ko: "댄스",   desc: "전신거울 앞에서 안무 연습" },
  { icon: Clapperboard, label: "ACT",     ko: "연기",   desc: "촬영용 조명 · 삼각대로 셀프 촬영·연기 연습" },
  { icon: Star,         label: "MUSICAL", ko: "뮤지컬", desc: "전자피아노 · 전신거울로 뮤지컬 연습" },
];

const AMENITIES = [
  { icon: ScanFace, label: "전신 거울",   desc: "댄스·연기·뮤지컬 연습 필수" },
  { icon: Camera,   label: "촬영용 조명", desc: "영상·사진 촬영 가능" },
  { icon: Camera,   label: "삼각대",      desc: "스마트폰·카메라 거치" },
  { icon: Piano,    label: "전자피아노",  desc: "보컬·뮤지컬 반주 연습" },
  { icon: BookOpen, label: "보면대",      desc: "악보·대본 거치" },
  { icon: Mic,      label: "무선마이크",  desc: "보컬 연습·녹음" },
  { icon: Dumbbell, label: "요가매트",    desc: "몸풀기·스트레칭" },
  { icon: Dumbbell, label: "폼롤러",      desc: "근막이완·근육 회복" },
];

export default function HomePage() {
  return (
    <>
      {/* 히어로 스크롤 */}
      <HeroScroll />

      {/* 스튜디오 소개 */}
      <StudioIntro />

      {/* 회사 소개 */}
      <FadeInSection>
        <AboutSection />
      </FadeInSection>

      {/* 활용 용도 */}
      <section className="border-y border-[#D8CCBC] bg-[#EFE7DA]/80 py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeInSection>
            <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-[#B98768]">
              One Space · Four Uses
            </p>
            <h2 className="mb-2 text-center text-2xl font-bold text-[#3B342F]">
              15평 단독 공간, 4가지 활용
            </h2>
            <p className="mb-10 text-center text-sm text-[#9b9189]">
              하나의 연습실을 보컬·댄스·연기·뮤지컬 용도로 자유롭게 활용하세요.
            </p>
          </FadeInSection>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {ROOM_USES.map(({ icon: Icon, label, ko, desc }, i) => (
              <FadeInSection key={label} delay={0.08 + i * 0.1}>
                <div className="flex h-full flex-col items-center gap-3 rounded-xl border border-[#D8CCBC] bg-[#EFE7DA] p-5 text-center transition-all hover:border-[#B98768]/50 hover:bg-[#EFE7DA]">
                  <div className="rounded-full bg-[#B98768]/15 p-3">
                    <Icon className="h-6 w-6 text-[#B98768]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold tracking-widest text-[#B98768]">{label}</p>
                    <p className="text-sm font-semibold text-[#3B342F]">{ko}</p>
                  </div>
                  <p className="text-xs leading-relaxed text-[#9b9189]">{desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* 구비 비품 */}
      <section className="bg-[#F7F3EB] py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeInSection>
            <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-[#B98768]">
              Equipment
            </p>
            <h2 className="mb-10 text-center text-2xl font-bold text-[#3B342F]">
              구비 비품
            </h2>
          </FadeInSection>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {AMENITIES.map(({ icon: Icon, label, desc }, i) => (
              <FadeInSection key={label} delay={0.08 + i * 0.09}>
                <div className="flex h-full flex-col items-center gap-2 rounded-xl border border-[#D8CCBC] bg-[#EFE7DA] p-4 text-center transition-colors hover:border-[#D8CCBC]">
                  <div className="rounded-full bg-[#B98768]/15 p-3">
                    <Icon className="h-5 w-5 text-[#B98768]" />
                  </div>
                  <p className="text-sm font-semibold text-[#3B342F]">{label}</p>
                  <p className="text-xs text-[#9b9189]">{desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* 갤러리 */}
      <FadeInSection>
        <GallerySection />
      </FadeInSection>

      {/* 예약 흐름 안내 — 예약 페이지 완성 후 활성화
      <section className="bg-[#F7F3EB] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeInSection>
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
                How to Book
              </p>
              <h2 className="mt-1 text-3xl font-bold text-[#3B342F]">
                3단계로 끝나는 간편 예약
              </h2>
            </div>
          </FadeInSection>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {[
              {
                step: "01",
                title: "시간 선택",
                desc: "예약현황 캘린더에서 원하는 날짜와 시간대를 선택하세요.",
              },
              {
                step: "02",
                title: "정보 입력",
                desc: "이름·연락처를 입력합니다. 회원가입 없이 비회원으로도 가능해요.",
              },
              {
                step: "03",
                title: "결제 완료",
                desc: "토스페이·카드 등으로 결제하면 즉시 예약이 확정됩니다.",
              },
            ].map((item, i) => (
              <FadeInSection key={item.step} delay={0.08 + i * 0.12}>
                <div className="relative rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6">
                  <span className="text-6xl font-black text-[#3B342F]">{item.step}</span>
                  <h3 className="mt-2 text-xl font-bold text-[#3B342F]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6f655d]">{item.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 rounded-full bg-[#B98768] px-8 py-4 text-base font-bold text-[#F7F3EB] shadow-xl shadow-[#B98768]/15 transition-all hover:bg-[#a9785c] active:scale-95"
            >
              지금 바로 예약하기
            </Link>
          </div>
        </div>
      </section>
      */}

      {/* 요금 요약 */}
      <FadeInSection>
        <PricingSummary />
      </FadeInSection>

      {/* 후기 */}
      <FadeInSection>
        <ReviewsPreview />
      </FadeInSection>

      {/* 오시는 길 */}
      <FadeInSection>
        <LocationSection />
      </FadeInSection>

      {/* 하단 CTA 배너 */}
      <FadeInSection>
      <section className="relative overflow-hidden bg-gradient-to-r from-[#EFE7DA] to-[#D8CCBC] py-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-[#3B342F] sm:text-4xl">
            오늘 연습, 지금 예약하세요
          </h2>
          <p className="mt-4 text-lg text-[#B98768]">
            실시간 예약현황 확인 · 10분 내 결제 · 즉시 확정
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            {/* 예약 메뉴 임시 숨김 (코드 보관)
            <Link
              href="/booking"
              className="w-full rounded-full bg-[#F7F3EB] px-8 py-4 text-base font-bold text-[#3B342F] shadow-xl transition-all hover:bg-[#EFE7DA] active:scale-95 sm:w-auto"
            >
              예약하기
            </Link>
            <Link
              href="/availability"
              className="w-full rounded-full border-2 border-[#D8CCBC] px-8 py-4 text-base font-semibold text-[#3B342F] transition-all hover:border-white hover:bg-[#EFE7DA]/10 sm:w-auto"
            >
              예약현황 보기
            </Link>
            */}
          </div>
        </div>
      </section>
      </FadeInSection>
    </>
  );
}
