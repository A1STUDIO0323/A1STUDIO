"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, X, ChevronLeft, ChevronRight } from "lucide-react";

const GALLERY_IMAGES = [
  { src: "/연습실.jpg", alt: "A1 Room - 메인 공간", caption: "A1 Room · 15평 단독 공간" },
  { src: "/1.jpg", alt: "A1 Room - 전체 뷰" },
  { src: "/2.jpg", alt: "A1 Room - 조명 화이트" },
  { src: "/3.jpg", alt: "A1 Room - 조명 블루" },
  { src: "/8.jpg", alt: "A1 Room - 조명 퍼플/그린" },
];

export default function GallerySection() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedIndex(null);
      } else if (e.key === "ArrowLeft") {
        setSelectedIndex((prev) => (prev === null || prev === 0 ? GALLERY_IMAGES.length - 1 : prev - 1));
      } else if (e.key === "ArrowRight") {
        setSelectedIndex((prev) => (prev === null || prev === GALLERY_IMAGES.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [selectedIndex]);

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev === null || prev === 0 ? GALLERY_IMAGES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === null || prev === GALLERY_IMAGES.length - 1 ? 0 : prev + 1));
  };

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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setSelectedIndex(0)}
            className="group relative col-span-2 md:row-span-2 overflow-hidden rounded-2xl bg-[#F7F3EB] cursor-pointer transition-opacity hover:opacity-90"
          >
            <div className="relative aspect-[4/3]">
              <Image
                src={GALLERY_IMAGES[0].src}
                alt={GALLERY_IMAGES[0].alt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0f0e0d]/80 to-transparent p-4">
              <p className="text-base font-bold text-white">A1 Room</p>
              <p className="text-sm text-white/80">15평 단독 공간</p>
            </div>
          </button>

          {GALLERY_IMAGES.slice(1).map((img, idx) => (
            <button
              key={idx + 1}
              onClick={() => setSelectedIndex(idx + 1)}
              className="group relative overflow-hidden rounded-2xl bg-[#F7F3EB] cursor-pointer transition-opacity hover:opacity-90"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
            </button>
          ))}
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

      {/* Lightbox Modal */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={() => setSelectedIndex(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 z-10"
            aria-label="닫기"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Previous Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-4 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 z-10"
            aria-label="이전 이미지"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Next Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-4 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 z-10"
            aria-label="다음 이미지"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Image Container */}
          <div
            className="relative max-h-[90vh] max-w-[90vw] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <Image
                src={GALLERY_IMAGES[selectedIndex].src}
                alt={GALLERY_IMAGES[selectedIndex].alt}
                width={1920}
                height={1440}
                className="object-contain max-h-[90vh] w-auto h-auto"
                quality={95}
              />
            </div>
          </div>

          {/* Caption */}
          {GALLERY_IMAGES[selectedIndex].caption && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-6 py-3 backdrop-blur-md">
              <p className="text-sm font-medium text-white">
                {GALLERY_IMAGES[selectedIndex].caption}
              </p>
            </div>
          )}

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-md">
            <p className="text-sm font-medium text-white">
              {selectedIndex + 1} / {GALLERY_IMAGES.length}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
