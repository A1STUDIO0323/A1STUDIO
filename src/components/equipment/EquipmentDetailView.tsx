"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EQUIPMENT_CATEGORIES, type Equipment } from "@/lib/equipment-data";

type Props = {
  equipment: Equipment;
};

export function EquipmentDetailView({ equipment }: Props) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [mainImageFailed, setMainImageFailed] = useState(false);

  const categoryInfo = EQUIPMENT_CATEGORIES[equipment.category];
  const imageSrc =
    equipment.images[selectedImageIndex] ?? equipment.images[0] ?? null;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset error overlay when image source changes
    setMainImageFailed(false);
  }, [selectedImageIndex, equipment.id, imageSrc]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
            >
              홈
            </Link>
            <span className="text-[var(--color-text-subtle)]">/</span>
            <Link
              href="/equipment"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
            >
              비품 및 시설
            </Link>
            <span className="text-[var(--color-text-subtle)]">/</span>
            <span className="text-[var(--color-text)]">{equipment.name}</span>
          </div>
        </div>
      </div>

      <section className="py-8 sm:py-12 lg:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="relative aspect-[4/3] bg-[var(--color-bg)]">
                  {imageSrc && !mainImageFailed ? (
                    <Image
                      src={imageSrc}
                      alt={`${equipment.name} — 이미지 ${selectedImageIndex + 1}`}
                      fill
                      className="z-10 object-contain"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority
                      onError={() => setMainImageFailed(true)}
                    />
                  ) : null}
                  {(!imageSrc || mainImageFailed) && (
                    <div
                      className="absolute inset-0 z-0 flex items-center justify-center text-7xl opacity-20 sm:text-9xl"
                      aria-hidden
                    >
                      {categoryInfo.icon}
                    </div>
                  )}
                  {equipment.status === "upcoming" && (
                    <div className="absolute right-4 top-4 sm:right-6 sm:top-6 rounded-full bg-[var(--color-accent)] px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white">
                      도입 예정
                    </div>
                  )}
                  {equipment.images.length > 1 && (
                    <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 rounded-full bg-black/50 px-2.5 py-1 sm:px-3 text-[10px] sm:text-xs text-white backdrop-blur-sm">
                      {selectedImageIndex + 1} / {equipment.images.length}
                    </div>
                  )}
                </div>
              </div>

              {equipment.images.length > 1 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
                  {equipment.images.map((src, index) => (
                    <ThumbButton
                      key={`${src}-${index}`}
                      src={src}
                      alt={`${equipment.name} 썸네일 ${index + 1}`}
                      selected={selectedImageIndex === index}
                      icon={categoryInfo.icon}
                      onSelect={() => setSelectedImageIndex(index)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-accent)]">
                {categoryInfo.icon}
                <span>{categoryInfo.label}</span>
              </div>

              <h1 className="mb-4 text-3xl font-bold text-[var(--color-text)] sm:text-4xl">
                {equipment.name}
              </h1>

              <p className="mb-6 text-lg text-[var(--color-text-muted)]">
                {equipment.description}
              </p>

              <div className="mb-8 flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="rounded-xl bg-[var(--color-surface)] px-5 py-3 sm:px-6">
                  <div className="text-sm text-[var(--color-text-subtle)]">수량</div>
                  <div className="text-2xl font-bold text-[var(--color-accent)]">
                    {equipment.quantity}개
                  </div>
                </div>
                <div className="rounded-xl bg-[var(--color-surface)] px-5 py-3 sm:px-6">
                  <div className="text-sm text-[var(--color-text-subtle)]">상태</div>
                  <div className="text-lg font-semibold text-[var(--color-text)]">
                    {equipment.status === "available" ? "이용 가능" : "도입 예정"}
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="mb-4 text-xl font-bold text-[var(--color-text)]">
                  사용 방법
                </h2>
                <ul className="space-y-3">
                  {equipment.usage.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="text-[var(--color-text-muted)]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Link
                  href="/booking"
                  className="flex-1 rounded-full bg-[var(--color-accent)] px-6 py-3 text-center font-semibold text-white transition-all hover:bg-[var(--color-accent-hover)] hover:shadow-lg"
                >
                  연습실 예약하기
                </Link>
                <Link
                  href="/equipment"
                  className="flex-1 rounded-full border-2 border-[var(--color-border)] px-6 py-3 text-center font-semibold text-[var(--color-text)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  목록으로
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ThumbButton({
  src,
  alt,
  selected,
  icon,
  onSelect,
}: {
  src: string;
  alt: string;
  selected: boolean;
  icon: string;
  onSelect: () => void;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "overflow-hidden rounded-xl border-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2",
        selected
          ? "border-[var(--color-accent)] scale-[1.02] shadow-sm"
          : "border-[var(--color-border)] opacity-80 hover:border-[var(--color-accent)] hover:opacity-100"
      )}
    >
      <div className="relative aspect-square bg-[var(--color-bg)]">
        {!failed ? (
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            sizes="120px"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-40">
            {icon}
          </div>
        )}
      </div>
    </button>
  );
}
