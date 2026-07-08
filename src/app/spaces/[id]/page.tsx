"use client";

import { use, useState, useEffect } from "react";
import Image from "next/image";
import { Users, Maximize2, CheckCircle2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";

const GALLERY_IMAGES = [
  { src: "/연습실.jpg", alt: "A1 Room - 메인 공간" },
  { src: "/1.jpg", alt: "A1 Room - 전체 뷰" },
  { src: "/2.jpg", alt: "A1 Room - 조명 화이트" },
  { src: "/3.jpg", alt: "A1 Room - 조명 블루" },
  { src: "/8.jpg", alt: "A1 Room - 조명 퍼플/그린" },
];

export default function SpaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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

  const room = {
    id: id,
    name: "A1 Room",
    description:
      "보컬·댄스·연기·뮤지컬 연습이 모두 가능한 약 20평 단독 공간입니다. 전신거울, 전자피아노, 촬영용 조명, 삼각대, 보면대, 무선마이크, 요가매트, 폼롤러가 구비되어 있습니다.",
    capacity: 8,
    sizeM2: 66,
    amenities: [
      "전신거울",
      "전자피아노",
      "촬영용 조명",
      "삼각대",
      "보면대",
      "무선마이크",
      "요가매트",
      "폼롤러",
    ],
    cautions: [
      "예약 시간 내 준비·정리 포함 (시간 엄수)",
      "음식물 반입 금지 (음료 페트병 가능)",
      "외부 신발 금지 (실내화 또는 여분의 깨끗한 신발 이용)",
      "추가 장비 반입 전 사전 문의",
    ],
    priceWeekdayDay: 7000,
    priceWeekdayNight: 9000,
    priceWeekend: 8000,
  };

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* 이미지 갤러리 */}
        <div className="grid grid-cols-4 gap-3 overflow-hidden rounded-2xl">
          <button
            onClick={() => setSelectedIndex(0)}
            className="relative col-span-3 row-span-2 h-64 sm:h-96 cursor-pointer transition-opacity hover:opacity-90"
          >
            <Image
              src={GALLERY_IMAGES[0].src}
              alt={GALLERY_IMAGES[0].alt}
              fill
              className="object-cover rounded-l-2xl"
              sizes="(max-width: 768px) 100vw, 75vw"
              priority
            />
          </button>
          <button
            onClick={() => setSelectedIndex(1)}
            className="relative h-full cursor-pointer transition-opacity hover:opacity-90"
          >
            <Image
              src={GALLERY_IMAGES[1].src}
              alt={GALLERY_IMAGES[1].alt}
              fill
              className="object-cover rounded-tr-2xl"
              sizes="25vw"
            />
          </button>
          <button
            onClick={() => setSelectedIndex(2)}
            className="relative h-full cursor-pointer transition-opacity hover:opacity-90"
          >
            <Image
              src={GALLERY_IMAGES[2].src}
              alt={GALLERY_IMAGES[2].alt}
              fill
              className="object-cover"
              sizes="25vw"
            />
          </button>
          <button
            onClick={() => setSelectedIndex(3)}
            className="relative col-span-2 h-32 cursor-pointer transition-opacity hover:opacity-90"
          >
            <Image
              src={GALLERY_IMAGES[3].src}
              alt={GALLERY_IMAGES[3].alt}
              fill
              className="object-cover rounded-bl-2xl"
              sizes="50vw"
            />
          </button>
          <button
            onClick={() => setSelectedIndex(4)}
            className="relative col-span-2 h-32 cursor-pointer transition-opacity hover:opacity-90"
          >
            <Image
              src={GALLERY_IMAGES[4].src}
              alt={GALLERY_IMAGES[4].alt}
              fill
              className="object-cover rounded-br-2xl"
              sizes="50vw"
            />
          </button>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-3">
          {/* 상세 정보 */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#F7F3EB] px-3 py-1 text-xs text-[#6f655d]">
                <Maximize2 className="mr-1 inline h-3 w-3" />
                {room.sizeM2}㎡ (약 20평)
              </span>
              <span className="rounded-full bg-[#F7F3EB] px-3 py-1 text-xs text-[#6f655d]">
                <Users className="mr-1 inline h-3 w-3" />
                최대 {room.capacity}인
              </span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold text-[#3B342F]">{room.name}</h1>
            <p className="mt-4 leading-relaxed text-[#6f655d]">{room.description}</p>

            {/* 구비 비품 */}
            <h2 className="mt-8 text-xl font-bold text-[#3B342F]">구비 비품</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {room.amenities.map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-[#3B342F]">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#B98768]" />
                  {item}
                </div>
              ))}
            </div>

            {/* 유의사항 */}
            <h2 className="mt-8 text-xl font-bold text-[#3B342F]">이용 유의사항</h2>
            <ul className="mt-4 list-inside space-y-2 text-sm text-[#6f655d]">
              {room.cautions.map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                  {c}
                </li>
              ))}
            </ul>
          </div>

          {/* 예약 사이드 패널 */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6">
              <h3 className="text-lg font-bold text-[#3B342F]">요금</h3>
              <div className="mt-4 space-y-3">
                {[
                  { label: "평일 주간 (09–18시)", price: room.priceWeekdayDay },
                  { label: "평일 야간 (18시~)", price: room.priceWeekdayNight },
                  { label: "주말 종일", price: room.priceWeekend },
                ].map((p) => (
                  <div key={p.label} className="flex justify-between text-sm">
                    <span className="text-[#6f655d]">{p.label}</span>
                    <span className="font-semibold text-[#3B342F]">
                      {formatPrice(p.price)}/h
                    </span>
                  </div>
                ))}
                <p className="mt-1 text-xs text-[#b0a89e]">최소 2시간 예약</p>
              </div>

              {/* 예약 메뉴 임시 숨김 (코드 보관)
              <Link
                href="/booking"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#B98768] py-3.5 text-sm font-bold text-[#F7F3EB] transition-all hover:bg-[#a9785c] active:scale-95"
              >
                <CalendarCheck className="h-4 w-4" />
                이 룸 예약하기
              </Link>
              <Link
                href="/availability"
                className="mt-3 block text-center text-xs text-[#9b9189] hover:text-[#B98768] transition-colors"
              >
                예약현황 먼저 확인하기 →
              </Link>
              */}
            </div>
          </div>
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

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-md">
            <p className="text-sm font-medium text-white">
              {selectedIndex + 1} / {GALLERY_IMAGES.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
