"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  EQUIPMENT_CATEGORIES,
  getEquipmentByCategory,
  type Equipment,
  type EquipmentCategory,
} from "@/lib/equipment-data";

const CATEGORY_ORDER: EquipmentCategory[] = [
  "common",
  "practice",
  "party",
  "option",
];

export function EquipmentAccordion() {
  const [openCategory, setOpenCategory] = useState<EquipmentCategory | null>(
    "common"
  );

  return (
    <div className="space-y-4">
      {CATEGORY_ORDER.map((category) => {
        const info = EQUIPMENT_CATEGORIES[category];
        const items = getEquipmentByCategory(category);
        if (items.length === 0) return null;

        const isOpen = openCategory === category;

        return (
          <div
            key={category}
            className={cn(
              "overflow-hidden rounded-2xl border bg-[var(--color-surface)] transition-colors",
              isOpen
                ? "border-[var(--color-accent)]"
                : "border-[var(--color-border)]"
            )}
          >
            {/* 대분류 헤더 */}
            <button
              type="button"
              onClick={() => setOpenCategory(isOpen ? null : category)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-[var(--color-bg)] sm:px-8"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="text-3xl sm:text-4xl">{info.icon}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-[var(--color-text)] sm:text-2xl">
                      {info.label}
                    </h2>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        category === "option"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-[var(--color-bg)] text-[var(--color-accent)]"
                      )}
                    >
                      {info.sublabel}
                    </span>
                  </div>
                  <p className="mt-1 hidden text-sm text-[var(--color-text-muted)] sm:block">
                    {info.description}
                  </p>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-3">
                <span className="hidden text-sm text-[var(--color-text-subtle)] sm:inline">
                  {items.length}종
                </span>
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] transition-transform",
                    isOpen && "rotate-180 border-[var(--color-accent)] text-[var(--color-accent)]"
                  )}
                  aria-hidden
                >
                  ▾
                </span>
              </div>
            </button>

            {/* 소분류(비품 목록) */}
            {isOpen && (
              <div className="border-t border-[var(--color-border)] px-4 py-5 sm:px-8 sm:py-6">
                <p className="mb-5 text-sm text-[var(--color-text-muted)] sm:hidden">
                  {info.description}
                </p>
                <ul className="space-y-4">
                  {items.map((equipment) => (
                    <EquipmentRow key={equipment.id} equipment={equipment} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function EquipmentRow({ equipment }: { equipment: Equipment }) {
  const [imageFailed, setImageFailed] = useState(false);
  const info = EQUIPMENT_CATEGORIES[equipment.category];
  const imageSrc = equipment.images[0] ?? null;

  return (
    <li>
      <Link
        href={`/equipment/${equipment.id}`}
        className="group flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:shadow-md sm:flex-row sm:gap-6 sm:p-5"
      >
        {/* 사진 */}
        <div className="relative aspect-[4/3] w-full flex-shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface)] sm:aspect-square sm:w-32">
          {imageSrc && !imageFailed ? (
            <Image
              src={imageSrc}
              alt={equipment.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 128px"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center text-5xl opacity-20"
              aria-hidden
            >
              {info.icon}
            </div>
          )}
          {equipment.status === "upcoming" && (
            <div className="absolute right-2 top-2 rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-[10px] font-medium text-white">
              도입 예정
            </div>
          )}
        </div>

        {/* 비품명 / 모델명 / 사용방법 */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-base font-semibold text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent)] sm:text-lg">
              {equipment.name}
            </h3>
            <span className="text-sm font-medium text-[var(--color-accent)]">
              {equipment.quantity}개
            </span>
            {equipment.optionPrice != null && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                +{equipment.optionPrice.toLocaleString()}원
              </span>
            )}
          </div>
          <p className="mb-2 text-xs text-[var(--color-text-subtle)]">
            모델명: {equipment.model ?? "별도 문의"}
          </p>
          <ul className="space-y-1">
            {equipment.usage.map((line, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]"
              >
                <span className="mt-0.5 text-[var(--color-accent)]" aria-hidden>
                  ·
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <span className="mt-3 inline-block text-xs text-[var(--color-text-subtle)] transition-colors group-hover:text-[var(--color-accent)]">
            자세히 보기 →
          </span>
        </div>
      </Link>
    </li>
  );
}
