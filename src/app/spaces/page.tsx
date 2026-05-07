import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Maximize2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Calendar,
} from "lucide-react";

export const metadata: Metadata = { title: "공간소개" };

const SPACES = [
  {
    id: "practice-room",
    name: "A1 연습실",
    slug: "a1-room",
    type: "연습실",
    sizeM2: 66,
    capacity: 6,
    description:
      "보컬·댄스·연기·뮤지컬 연습이 모두 가능한 약 20평 단독 공간. 전신거울·전자피아노·촬영용 조명·삼각대·보면대·무선마이크·요가매트·폼롤러 구비.",
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
    priceFrom: 7000,
    priceUnit: "시간당",
    bookingUrl: "/booking",
    detailUrl: "/spaces/a1-room",
    imageSrc: "/연습실.jpg",
  },
  {
    id: "party-room",
    name: "A1 파티룸",
    slug: "party-room",
    type: "파티룸",
    sizeM2: 66,
    capacity: 10,
    description:
      "성인 전용 프라이빗 모임 공간. 음악반응 조명·배달음식 반입·주류 가능. 약 20평 단독 공간. 데이/나잇/올데이 패키지로 운영.",
    amenities: [
      "음악반응 조명",
      "전신거울",
      "촬영용 조명",
      "삼각대",
      "전자피아노",
      "요가매트",
      "폼롤러",
      "공기청정기",
    ],
    priceFrom: 70000,
    priceUnit: "데이 패키지",
    bookingUrl: "/booking?type=party-room",
    detailUrl: "/party-room",
    imageSrc: "/연습실.jpg",
    isNew: true,
    badge: "오픈 이벤트",
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
            A1 STUDIO는 연습실과 파티룸 두 가지 공간을 제공합니다
          </p>
        </div>

        <div className="grid gap-8">
          {SPACES.map((space) => (
            <div
              key={space.id}
              className="overflow-hidden rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA]"
            >
              {/* 이미지 영역 */}
              <div className="relative h-56 sm:h-72">
                <Image
                  src={space.imageSrc}
                  alt={space.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1280px) 100vw, 1280px"
                />
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#3B342F] backdrop-blur-sm">
                    <Maximize2 className="mr-1 inline h-3 w-3" />
                    {space.sizeM2}㎡
                  </span>
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#3B342F] backdrop-blur-sm">
                    <Users className="mr-1 inline h-3 w-3" />
                    최대 {space.capacity}인
                  </span>
                </div>
                {space.badge && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#B98768] px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                      <Sparkles className="h-3 w-3" />
                      {space.badge}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-6 sm:p-8">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-2xl font-bold text-[#3B342F]">{space.name}</h2>
                      {space.isNew && (
                        <span className="rounded-full bg-[#B98768] px-2 py-0.5 text-[10px] font-bold text-white">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#B98768] mb-2">{space.type}</p>
                    <p className="mt-2 leading-relaxed text-[#6f655d]">
                      {space.description}
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {space.amenities.map((item) => (
                        <div key={item} className="flex items-center gap-1.5 text-sm text-[#3B342F]">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#B98768]" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-[#9b9189]">{space.priceUnit}</p>
                    <p className="text-3xl font-extrabold text-[#3B342F]">
                      {space.priceFrom.toLocaleString("ko-KR")}원~
                    </p>
                    <div className="mt-4 flex flex-col gap-2">
                      <Link
                        href={space.bookingUrl}
                        className="flex items-center justify-center gap-1.5 rounded-full bg-[#B98768] px-6 py-3 text-sm font-bold text-[#F7F3EB] transition-all hover:bg-[#a9785c] active:scale-95"
                      >
                        <Calendar className="h-4 w-4" />
                        예약하기
                      </Link>
                      <Link
                        href={space.detailUrl}
                        className="flex items-center justify-center gap-1.5 rounded-full border border-[#D8CCBC] px-6 py-3 text-sm font-medium text-[#3B342F] transition-all hover:border-[#B98768] hover:text-[#B98768]"
                      >
                        상세 보기
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 안내 문구 */}
        <div className="mt-12 rounded-2xl border border-[#D8CCBC] bg-white p-8 text-center">
          <h3 className="text-xl font-bold text-[#3B342F] mb-3">
            각 공간의 상세 정보가 궁금하신가요?
          </h3>
          <p className="text-[#6f655d]">
            상세 보기를 클릭하시면 공간별 사진, 가격표, 이용수칙 등 자세한 정보를 확인하실 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
