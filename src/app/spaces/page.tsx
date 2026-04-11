import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Maximize2,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = { title: "공간소개" };

const ROOMS = [
  {
    id: "a1-room",
    name: "A1 Room",
    slug: "a1-room",
    sizeM2: 50,
    capacity: 6,
    description:
      "보컬·댄스·연기·뮤지컬 연습이 모두 가능한 15평 단독 공간. 전신거울·전자피아노·촬영용 조명·삼각대·요가매트·폼롤러 구비.",
    amenities: [
      "전신거울",
      "전자피아노",
      "촬영용 조명",
      "삼각대",
      "요가매트",
      "폼롤러",
    ],
    priceFrom: 15000,
  },
];

export default function SpacesPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
            Spaces
          </p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">공간 소개</h1>
          <p className="mt-3 text-[#6f655d]">
            보컬·댄스·연기·뮤지컬 목적으로 활용 가능한 15평 단독 연습실
          </p>
        </div>

        <div className="grid gap-8">
          {ROOMS.map((room) => (
            <div
              key={room.id}
              className="overflow-hidden rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA]"
            >
              {/* 이미지 영역 */}
              <div className="relative h-56 sm:h-72">
                <Image
                  src="/연습실.jpg"
                  alt={room.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1280px) 100vw, 1280px"
                />
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#3B342F] backdrop-blur-sm">
                    <Maximize2 className="mr-1 inline h-3 w-3" />
                    {room.sizeM2}㎡
                  </span>
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#3B342F] backdrop-blur-sm">
                    <Users className="mr-1 inline h-3 w-3" />
                    최대 {room.capacity}인
                  </span>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-[#3B342F]">{room.name}</h2>
                    <p className="mt-2 leading-relaxed text-[#6f655d]">
                      {room.description}
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {room.amenities.map((item) => (
                        <div key={item} className="flex items-center gap-1.5 text-sm text-[#3B342F]">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#B98768]" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-[#9b9189]">시간당</p>
                    <p className="text-3xl font-extrabold text-[#3B342F]">
                      {room.priceFrom.toLocaleString("ko-KR")}원~
                    </p>
                    <div className="mt-4 flex flex-col gap-2">
                      {/* 예약 메뉴 임시 숨김 (코드 보관)
                      <Link
                        href="/booking"
                        className="flex items-center justify-center gap-1.5 rounded-full bg-[#B98768] px-6 py-3 text-sm font-bold text-[#F7F3EB] transition-all hover:bg-[#a9785c] active:scale-95"
                      >
                        예약하기
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                      */}
                      <Link
                        href={`/spaces/${room.slug}`}
                        className="rounded-full border border-[#D8CCBC] px-6 py-3 text-center text-sm font-medium text-[#3B342F] transition-all hover:border-[#D8CCBC] hover:text-[#B98768]"
                      >
                        상세 보기
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
