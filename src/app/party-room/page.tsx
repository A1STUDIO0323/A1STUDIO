"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";

const PACKAGES = [
  {
    id: "day",
    name: "낮 패키지",
    time: "10:00 ~ 17:00",
    hours: 7,
    priceOffPeak: { regular: 100000, event: 70000 },
    pricePeak: { regular: 130000, event: 90000 },
  },
  {
    id: "night",
    name: "야간 패키지",
    time: "19:00 ~ 익일 07:00",
    hours: 12,
    priceOffPeak: { regular: 140000, event: 100000 },
    pricePeak: { regular: 160000, event: 120000 },
  },
  {
    id: "allday",
    name: "종일권",
    time: "10:00 ~ 익일 07:00",
    hours: 21,
    priceOffPeak: { regular: 210000, event: 150000 },
    pricePeak: { regular: 250000, event: 180000 },
  },
];

export default function PartyRoomPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB]">
      {/* 히어로 배너 */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/30 z-10" />
        <Image
          src="/연습실.jpg"
          alt="파티룸"
          fill
          className="object-cover"
          priority
        />
        <div className="relative z-20 text-center text-white px-4">
          <h1 className="text-5xl md:text-7xl font-serif mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            음악이 조명이 됩니다
          </h1>
          <p className="text-lg md:text-xl mb-8 text-white/90">
            성인 전용 프라이빗 모임 공간 · 최대 10인 · 15평 단독
          </p>
          <Link
            href="/booking?type=party-room"
            className="inline-block rounded-xl bg-[#B98768] px-8 py-4 text-lg font-bold text-white transition-all hover:bg-[#a9785c] active:scale-95"
          >
            파티룸 예약하기
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20">
        {/* 강점 카드 3개 */}
        <section className="mb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-[#D8CCBC] bg-white p-8 text-center">
              <div className="mb-4 text-4xl">🎵</div>
              <h3 className="text-xl font-bold text-[#3B342F] mb-2">음악반응 조명</h3>
              <p className="text-[#6f655d]">
                틀어놓은 음악에<br />조명이 반응합니다.
              </p>
            </div>
            <div className="rounded-2xl border border-[#D8CCBC] bg-white p-8 text-center">
              <div className="mb-4 text-4xl">🏠</div>
              <h3 className="text-xl font-bold text-[#3B342F] mb-2">15평 단독 공간</h3>
              <p className="text-[#6f655d]">
                공간 전체를 우리<br />팀만 사용합니다.
              </p>
            </div>
            <div className="rounded-2xl border border-[#D8CCBC] bg-white p-8 text-center">
              <div className="mb-4 text-4xl">🍱</div>
              <h3 className="text-xl font-bold text-[#3B342F] mb-2">배달·주류 자유</h3>
              <p className="text-[#6f655d]">
                배달음식 반입 가능<br />주류도 가능합니다.
              </p>
            </div>
          </div>
        </section>

        {/* 갤러리 */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-[#3B342F] mb-8 text-center">공간 갤러리</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {["1.jpg", "2.jpg", "3.jpg", "8.jpg", "연습실.jpg"].map((img) => (
              <div key={img} className="relative aspect-square overflow-hidden rounded-xl">
                <Image
                  src={`/${img}`}
                  alt="파티룸 갤러리"
                  fill
                  className="object-cover hover:scale-110 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </section>

        {/* 가격표 */}
        <section className="mb-20">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-[#3B342F] mb-4">파티룸 가격표</h2>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#B98768]/20 px-4 py-2 text-sm font-semibold text-[#B98768]">
              <Sparkles className="w-4 h-4" />
              현재 오픈 이벤트 기간으로 할인 운영 중입니다
            </div>
            <p className="text-sm text-[#9b9189] mt-2">
              냉장고·노래방·보드게임 설치 완료 후 정가로 전환됩니다
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {PACKAGES.map((pkg) => (
              <div key={pkg.id} className="rounded-2xl border border-[#D8CCBC] bg-white p-6">
                <h3 className="text-xl font-bold text-[#3B342F] mb-2">{pkg.name}</h3>
                <p className="text-[#6f655d] mb-4">{pkg.time}</p>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-[#9b9189] mb-1">비피크</p>
                    <p className="text-sm text-[#9b9189] line-through">
                      {pkg.priceOffPeak.regular.toLocaleString("ko-KR")}원
                    </p>
                    <p className="text-2xl font-bold text-[#B98768]">
                      {pkg.priceOffPeak.event.toLocaleString("ko-KR")}원
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[#9b9189] mb-1">피크</p>
                    <p className="text-sm text-[#9b9189] line-through">
                      {pkg.pricePeak.regular.toLocaleString("ko-KR")}원
                    </p>
                    <p className="text-2xl font-bold text-[#B98768]">
                      {pkg.pricePeak.event.toLocaleString("ko-KR")}원
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-[#EFE7DA] p-6 text-sm text-[#6f655d] space-y-2">
            <p>* 낮 패키지(10~17시)와 야간 패키지(19시~익일 7시) 사이 17~19시는 예약이 불가합니다.</p>
            <p>* 최대 10인 기준이며 추가 인원 요금은 없습니다.</p>
            <p>* 이용 시간에는 준비 및 정리 시간이 포함됩니다.</p>
            <p>* 오픈 이벤트 가격은 비품 업그레이드 완료 전까지 적용됩니다.</p>
            <p>* 만 19세 이상 성인 전용입니다.</p>
            <p>* 10인 기준 1인당: 낮 패키지 7,000원부터 / 야간 패키지 10,000원부터</p>
          </div>
        </section>

        {/* 비품 안내 */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-[#3B342F] mb-8">비품 안내</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#D8CCBC] bg-white p-6">
              <h3 className="text-lg font-bold text-[#3B342F] mb-4">현재 제공</h3>
              <div className="flex flex-wrap gap-2">
                {["음악반응 조명", "전신거울", "촬영용 조명", "삼각대", "전자피아노", "요가매트", "폼롤러", "공기청정기"].map((item) => (
                  <span key={item} className="rounded-full bg-[#EFE7DA] px-3 py-1 text-sm text-[#3B342F]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-[#D8CCBC] bg-white p-6">
              <h3 className="text-lg font-bold text-[#3B342F] mb-4">준비 중 - 설치 후 정가 전환</h3>
              <div className="flex flex-wrap gap-2">
                {["냉장고", "노래방", "보드게임"].map((item) => (
                  <span key={item} className="rounded-full bg-[#F7F3EB] border border-[#D8CCBC] px-3 py-1 text-sm text-[#9b9189]">
                    {item} <span className="text-xs">(준비 중)</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 성인 전용 안내 */}
        <section className="mb-20">
          <div className="rounded-2xl border border-[#B98768] bg-[#f5ede6] p-8 text-center">
            <h3 className="text-xl font-bold text-[#3B342F] mb-2">만 19세 이상 성인 전용 공간입니다</h3>
            <p className="text-[#6f655d]">
              회원 프로필의 생년월일을 기준으로 이용 자격이 확인됩니다.
            </p>
          </div>
        </section>

        {/* 이용수칙 */}
        <section>
          <h2 className="text-3xl font-bold text-[#3B342F] mb-8">이용수칙</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#D8CCBC] bg-white p-6">
              <h3 className="text-lg font-bold text-green-700 mb-4">✓ 이용 가능</h3>
              <ul className="space-y-2 text-sm text-[#6f655d]">
                <li>· 배달음식 반입 가능</li>
                <li>· 주류 반입 가능 (만 19세 이상)</li>
                <li>· 음악 재생 자유 (음악반응 조명 연동)</li>
                <li>· 삼각대·촬영용 조명 무료 사용</li>
                <li>· 1회용 컵·접시·수저·용기 사용 가능</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-[#D8CCBC] bg-white p-6">
              <h3 className="text-lg font-bold text-red-700 mb-4">✗ 이용 불가</h3>
              <ul className="space-y-2 text-sm text-[#6f655d]">
                <li>· 다회용 식기 및 세척이 필요한 용기 사용 불가 (세척 시설 없음)</li>
                <li>· 조리 행위 불가 (전기조리도구·가스버너 등 반입 금지)</li>
                <li>· 최대 10명 초과 이용 불가</li>
                <li>· 미성년자 동반 이용 불가</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 rounded-xl bg-yellow-50 border border-yellow-200 p-6">
            <h3 className="text-lg font-bold text-yellow-900 mb-3">⚠️ 퇴실 전 정리 필수</h3>
            <ul className="space-y-2 text-sm text-yellow-800">
              <li>· 음식물·쓰레기 전용 봉투에 담아 지정 장소 배출</li>
              <li>· 이동한 물건 원위치</li>
              <li>· 바닥 오염 시 비치된 청소 도구로 기본 정리</li>
              <li>· 미이행 시 청소비 20,000원~50,000원 청구 가능</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
