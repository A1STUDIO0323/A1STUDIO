import Link from "next/link";
import {
  EQUIPMENT_LIST,
  EQUIPMENT_CATEGORIES,
  type EquipmentCategory,
} from "@/lib/equipment-data";

export const metadata = {
  title: "비품 및 시설 안내 | A1 STUDIO",
  description: "A1 STUDIO의 전문 장비와 편의시설을 확인하세요.",
};

export default function EquipmentPage() {
  // 카테고리별 그룹화
  const equipmentByCategory = Object.keys(EQUIPMENT_CATEGORIES).reduce(
    (acc, cat) => {
      const category = cat as EquipmentCategory;
      acc[category] = EQUIPMENT_LIST.filter((eq) => eq.category === category);
      return acc;
    },
    {} as Record<EquipmentCategory, typeof EQUIPMENT_LIST>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-bg)] py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--color-accent)]">
              Equipment & Facilities
            </p>
            <h1 className="mb-4 text-4xl font-bold text-[var(--color-text)] md:text-5xl">
              비품 및 시설 안내
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-[var(--color-text-muted)]">
              A1 STUDIO는 프리미엄 장비와 편의시설을 갖추고 있습니다.
              <br />
              연습실 예약 시 모든 비품을 무료로 이용하실 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      {/* Equipment Categories */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          {(Object.keys(equipmentByCategory) as EquipmentCategory[]).map(
            (category) => {
              const items = equipmentByCategory[category];
              if (items.length === 0) return null;

              const categoryInfo = EQUIPMENT_CATEGORIES[category];

              return (
                <div key={category} className="mb-16">
                  <div className="mb-8 flex items-center gap-3">
                    <span className="text-4xl">{categoryInfo.icon}</span>
                    <h2 className="text-2xl font-bold text-[var(--color-text)]">
                      {categoryInfo.label}
                    </h2>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((equipment) => (
                      <Link
                        key={equipment.id}
                        href={`/equipment/${equipment.id}`}
                        className="group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-all hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-bg)]">
                          {/* 플레이스홀더 이미지 */}
                          <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-20">
                            {categoryInfo.icon}
                          </div>
                          {equipment.status === "upcoming" && (
                            <div className="absolute right-4 top-4 rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-medium text-white">
                              도입 예정
                            </div>
                          )}
                        </div>
                        <div className="p-6">
                          <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)]">
                            {equipment.name}
                          </h3>
                          <p className="mb-3 text-sm text-[var(--color-text-muted)]">
                            {equipment.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-[var(--color-accent)]">
                              수량: {equipment.quantity}개
                            </span>
                            <span className="text-xs text-[var(--color-text-subtle)] transition-colors group-hover:text-[var(--color-accent)]">
                              자세히 보기 →
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-[var(--color-accent)] to-[#a07558] py-16">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">
            프리미엄 장비로 완성도 높은 연습을
          </h2>
          <p className="mb-8 text-lg text-white/90">
            모든 비품은 연습실 예약 시 무료로 이용 가능합니다
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
