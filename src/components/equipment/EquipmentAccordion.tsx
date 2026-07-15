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
    null
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
                    {info.descriptionEmphasis && (
                      <>
                        {" "}
                        <strong className="font-bold text-[var(--color-text)]">
                          {info.descriptionEmphasis}
                        </strong>
                      </>
                    )}
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
                  {info.descriptionEmphasis && (
                    <>
                      {" "}
                      <strong className="font-bold text-[var(--color-text)]">
                        {info.descriptionEmphasis}
                      </strong>
                    </>
                  )}
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
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-all hover:border-[var(--color-accent)] hover:shadow-md sm:flex-row sm:items-center sm:gap-6 sm:p-5">
        {/* 사진 */}
        <div className="relative aspect-[4/3] w-full flex-shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface)] sm:aspect-square sm:w-24">
          {imageSrc && !imageFailed ? (
            <Image
              src={imageSrc}
              alt={equipment.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 96px"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center text-4xl opacity-20"
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

        {/* 비품명 / 모델명 / 설명 */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-base font-semibold text-[var(--color-text)] sm:text-lg">
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
          <p className="mb-1 text-xs text-[var(--color-text-subtle)]">
            모델명: {equipment.model ?? "별도 문의"}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">
            {equipment.description}
          </p>
        </div>

        {/* 사용방법 버튼 */}
        <div className="flex-shrink-0">
          <Link
            href={`/equipment/${equipment.id}`}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent)] transition-all hover:bg-[var(--color-accent)] hover:text-white sm:w-auto"
          >
            사용방법
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </li>
  );
}
