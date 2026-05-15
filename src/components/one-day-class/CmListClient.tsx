"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { User, X, ChevronLeft, ChevronRight } from "lucide-react";

export type CmProfile = {
  user_id: string;
  display_name: string;
  bio: string | null;
  career: string | null;
  subjects: string[] | null;
  profile_image: string | null;
  portfolio_url: string | null;
};

const SUBJECT_LABELS: Record<string, string> = {
  vocal: "보컬",
  dance: "댄스",
  act: "연기",
  musical: "뮤지컬",
  etc: "기타",
};

const PAGE_SIZE = 9;

type Props = {
  profiles: CmProfile[];
};

export default function CmListClient({ profiles }: Props) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<CmProfile | null>(null);

  const totalPages = Math.max(1, Math.ceil(profiles.length / PAGE_SIZE));

  // 페이지 범위 보정
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return profiles.slice(start, start + PAGE_SIZE);
  }, [profiles, page]);

  // 모달 ESC 닫기 + 스크롤락
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [selected]);

  if (profiles.length === 0) return null;

  const pageNumbers = buildPageNumbers(page, totalPages);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {paged.map((cm) => (
          <button
            key={cm.user_id}
            type="button"
            onClick={() => setSelected(cm)}
            className="group text-left rounded-2xl border border-[#D8CCBC] bg-white p-5 transition hover:-translate-y-0.5 hover:border-[#B98768] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#B98768]/40"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#EFE7DA]">
                {cm.profile_image ? (
                  <Image
                    src={cm.profile_image}
                    alt={cm.display_name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-6 w-6 text-[#9b9189]" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-[#3B342F] truncate group-hover:text-[#B98768]">
                  {cm.display_name}
                </h3>
                {cm.subjects && cm.subjects.length > 0 && (
                  <p className="text-xs text-[#9b9189] mt-0.5">
                    {cm.subjects.map((s) => SUBJECT_LABELS[s] ?? s).join(" · ")}
                  </p>
                )}
              </div>
            </div>

            {cm.bio && (
              <p className="text-sm text-[#6f655d] mb-3 line-clamp-2">{cm.bio}</p>
            )}

            {cm.career && (
              <div className="rounded-lg bg-[#F7F3EB] p-3">
                <p className="text-[10px] font-semibold uppercase text-[#9b9189] mb-1">
                  주요 경력
                </p>
                <p className="text-xs text-[#6f655d] whitespace-pre-line line-clamp-3">
                  {cm.career}
                </p>
              </div>
            )}

            <p className="mt-3 text-[11px] font-semibold text-[#B98768] opacity-0 group-hover:opacity-100 transition">
              자세히 보기 →
            </p>
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="페이지네이션"
          className="mt-8 flex items-center justify-center gap-1"
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8CCBC] bg-white text-[#6f655d] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#B98768] hover:text-[#B98768]"
            aria-label="이전 페이지"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {pageNumbers.map((n, i) =>
            n === "…" ? (
              <span
                key={`dots-${i}`}
                className="inline-flex h-9 w-9 items-center justify-center text-sm text-[#9b9189]"
              >
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                aria-current={page === n ? "page" : undefined}
                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition ${
                  page === n
                    ? "border-[#B98768] bg-[#B98768] text-white"
                    : "border-[#D8CCBC] bg-white text-[#6f655d] hover:border-[#B98768] hover:text-[#B98768]"
                }`}
              >
                {n}
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#D8CCBC] bg-white text-[#6f655d] disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#B98768] hover:text-[#B98768]"
            aria-label="다음 페이지"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`${selected.display_name} 상세`}
        >
          <div
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#6f655d] shadow ring-1 ring-[#D8CCBC] hover:text-[#3B342F]"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="bg-gradient-to-b from-[#F7F3EB] to-white px-6 pt-10 pb-6 sm:px-10 sm:pt-12">
              <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left sm:gap-6">
                <div className="relative h-28 w-28 sm:h-32 sm:w-32 shrink-0 overflow-hidden rounded-full bg-[#EFE7DA] ring-4 ring-white shadow">
                  {selected.profile_image ? (
                    <Image
                      src={selected.profile_image}
                      alt={selected.display_name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User className="h-12 w-12 text-[#9b9189]" />
                    </div>
                  )}
                </div>
                <div className="mt-4 sm:mt-0 min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#3B342F]">
                    {selected.display_name}
                  </h2>
                  {selected.subjects && selected.subjects.length > 0 && (
                    <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                      {selected.subjects.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center rounded-full bg-[#B98768]/10 px-2.5 py-1 text-xs font-semibold text-[#B98768]"
                        >
                          {SUBJECT_LABELS[s] ?? s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 sm:px-10 pb-10 space-y-6">
              {selected.bio && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-[#B98768] mb-2">
                    소개
                  </h3>
                  <p className="text-sm leading-relaxed text-[#3B342F] whitespace-pre-line">
                    {selected.bio}
                  </p>
                </section>
              )}

              {selected.career && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-[#B98768] mb-2">
                    주요 경력
                  </h3>
                  <div className="rounded-xl bg-[#F7F3EB] p-4">
                    <p className="text-sm leading-relaxed text-[#3B342F] whitespace-pre-line">
                      {selected.career}
                    </p>
                  </div>
                </section>
              )}

              {selected.portfolio_url && (
                <section>
                  <a
                    href={selected.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#B98768] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#a4755a]"
                  >
                    포트폴리오 보러가기 →
                  </a>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 1 … (page-1) page (page+1) … total 형태로 페이지 번호 배열 생성
function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const result: (number | "…")[] = [];
  const add = (v: number | "…") => result.push(v);

  add(1);
  if (current > 3) add("…");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) add(i);

  if (current < total - 2) add("…");
  add(total);
  return result;
}
