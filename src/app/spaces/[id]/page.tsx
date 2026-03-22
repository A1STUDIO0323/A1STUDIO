import { Metadata } from "next";
import { Users, Maximize2, CheckCircle2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "룸 상세" };

export default function SpaceDetailPage({ params }: { params: { id: string } }) {
  const room = {
    id: params.id,
    name: "Gray Room",
    description:
      "보컬·댄스·연기·뮤지컬 연습이 모두 가능한 15평 단독 공간입니다. 전신거울, 전자피아노, 촬영용 조명, 삼각대, 요가매트, 폼롤러가 구비되어 있습니다.",
    capacity: 6,
    sizeM2: 50,
    amenities: [
      "전신거울",
      "전자피아노",
      "촬영용 조명",
      "삼각대",
      "요가매트",
      "폼롤러",
    ],
    cautions: [
      "예약 시간 내 준비·정리 포함 (시간 엄수)",
      "음식물 반입 금지 (음료 페트병 가능)",
      "추가 장비 반입 전 사전 문의",
    ],
    priceWeekdayDay: 15000,
    priceWeekdayNight: 20000,
    priceWeekend: 20000,
  };

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* 이미지 갤러리 */}
        <div className="grid grid-cols-3 gap-3 overflow-hidden rounded-2xl">
          <div className="col-span-2 h-64 bg-gradient-to-br from-[#B98768]/15 to-zinc-800 sm:h-80" />
          <div className="col-span-1 grid grid-rows-2 gap-3">
            <div className="h-full bg-gradient-to-br from-[#EFE7DA]/20 to-zinc-800" />
            <div className="h-full bg-gradient-to-br from-purple-900/40 to-zinc-800" />
          </div>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-3">
          {/* 상세 정보 */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#F7F3EB] px-3 py-1 text-xs text-[#6f655d]">
                <Maximize2 className="mr-1 inline h-3 w-3" />
                {room.sizeM2}㎡ (약 15평)
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
    </div>
  );
}
