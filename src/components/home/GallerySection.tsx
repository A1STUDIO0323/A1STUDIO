import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function GallerySection() {
  return (
    <section className="bg-[#EFE7DA] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
              Gallery
            </p>
            <h2 className="mt-1 text-3xl font-bold text-[#3B342F]">
              공간을 직접 확인하세요
            </h2>
          </div>
          <Link
            href="/spaces"
            className="hidden items-center gap-1 text-sm font-medium text-[#6f655d] transition-colors hover:text-[#B98768] sm:flex"
          >
            공간 상세 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* 15평 단독 공간 플레이스홀더 (실제 사진 촬영 후 교체) */}
        <div
          className="group relative overflow-hidden rounded-2xl bg-[#F7F3EB]"
          style={{ aspectRatio: "16/7" }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#3B342F]/40 to-[#3B342F]/60/80 transition-all duration-500 group-hover:scale-105" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-lg font-bold text-[#3B342F]">Gray Room — 15평 단독 공간</p>
            <p className="text-sm text-[#6f655d]">실제 사진으로 교체 예정</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#3B342F]/60 to-transparent p-4">
            <p className="text-sm font-semibold text-[#3B342F]">15평 단독 공간</p>
          </div>
        </div>

        <div className="mt-6 flex justify-center sm:hidden">
          <Link
            href="/spaces"
            className="flex items-center gap-1.5 text-sm font-medium text-[#B98768]"
          >
            공간 상세 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
