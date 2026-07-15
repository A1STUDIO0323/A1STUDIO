import Link from "next/link";
import { EquipmentAccordion } from "@/components/equipment/EquipmentAccordion";

export const metadata = {
  title: "비품 및 시설 안내 | A1 STUDIO",
  description: "A1 STUDIO의 전문 장비와 편의시설을 확인하세요.",
};

export default function EquipmentPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-bg)] py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--color-accent)]">
              Equipment &amp; Facilities
            </p>
            <h1 className="mb-4 text-4xl font-bold text-[var(--color-text)] md:text-5xl">
              비품 및 시설 안내
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-[var(--color-text-muted)]">
              A1 STUDIO는 프리미엄 장비와 편의시설을 갖추고 있습니다.
              <br />
              분류를 클릭하면 포함된 비품을 확인하실 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      {/* Equipment Accordion */}
      <section className="pb-20">
        <div className="mx-auto max-w-5xl px-4">
          <EquipmentAccordion />
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-[var(--color-accent)] to-[#a07558] py-16">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">
            프리미엄 장비로 완성도 높은 연습을
          </h2>
          <p className="mb-8 text-lg text-white/90">
            기본 비품은 예약 시 무료, 추가옵션 비품은 유료로 이용 가능합니다
          </p>
          <Link
            href="/booking"
            className="inline-block rounded-full bg-white px-8 py-3 font-semibold text-[var(--color-accent)] transition-all hover:scale-105 hover:shadow-lg"
          >
            지금 예약하기
          </Link>
        </div>
      </section>
    </div>
  );
}
