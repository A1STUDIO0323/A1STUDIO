import Link from "next/link";
import { MapPin, Train, Car, Phone } from "lucide-react";
import { STUDIO_ADDRESS, STUDIO_ADDRESS_DETAIL, STUDIO_PHONE } from "@/lib/constants";

export default function LocationSection() {
  return (
    <section className="bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
            Location
          </p>
          <h2 className="mt-1 text-3xl font-bold text-[#3B342F]">오시는 길</h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* 지도 임베드 영역 */}
          <div className="relative overflow-hidden rounded-2xl bg-[#F7F3EB]" style={{ minHeight: 360 }}>
            {/* 네이버 지도 임베드 (실제 사용 시 CLIENT_ID 설정 후 iframe으로 교체) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#EFE7DA] to-[#3B342F]/60">
              <MapPin className="h-12 w-12 text-[#B98768]" />
              <p className="text-sm font-medium text-[#3B342F]">
                네이버 지도 임베드 영역
              </p>
              <p className="text-xs text-[#9b9189]">
                NEXT_PUBLIC_NAVER_MAP_CLIENT_ID 설정 후 활성화
              </p>
              <a
                href={`https://map.naver.com/v5/search/${encodeURIComponent(STUDIO_ADDRESS)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 rounded-full bg-green-500 px-5 py-2 text-sm font-semibold text-[#3B342F] hover:bg-green-400 transition-colors"
              >
                네이버 지도로 보기
              </a>
            </div>
          </div>

          {/* 교통 정보 */}
          <div className="flex flex-col justify-center gap-5">
            <div className="flex items-start gap-4 rounded-xl border border-[#D8CCBC] bg-[#EFE7DA] p-5">
              <div className="rounded-lg bg-[#B98768]/15 p-2.5">
                <MapPin className="h-5 w-5 text-[#B98768]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#3B342F]">주소</h3>
                <p className="mt-1 text-sm text-[#6f655d]">{STUDIO_ADDRESS}</p>
                <p className="mt-0.5 text-xs text-[#9b9189]">{STUDIO_ADDRESS_DETAIL}</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-xl border border-[#D8CCBC] bg-[#EFE7DA] p-5">
              <div className="rounded-lg bg-blue-900/40 p-2.5">
                <Train className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[#3B342F]">대중교통</h3>
                <p className="mt-1 text-sm text-[#6f655d]">
                  8호선 문정역 → 도보 8분
                  <br />
                  8호선 장지역 → 도보 10분
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-xl border border-[#D8CCBC] bg-[#EFE7DA] p-5">
              <div className="rounded-lg bg-emerald-50 p-2.5">
                <Car className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[#3B342F]">주차</h3>
                <p className="mt-1 text-sm text-[#6f655d]">
                  건물 주차 가능 (예약 시 차량번호 입력)
                  <br />
                  인근 공영주차장 이용 가능
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-xl border border-[#D8CCBC] bg-[#EFE7DA] p-5">
              <div className="rounded-lg bg-orange-900/40 p-2.5">
                <Phone className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold text-[#3B342F]">전화 문의</h3>
                <a
                  href={`tel:${STUDIO_PHONE}`}
                  className="mt-1 block text-sm font-medium text-[#B98768] hover:text-[#B98768] transition-colors"
                >
                  {STUDIO_PHONE}
                </a>
                <p className="text-xs text-[#9b9189]">운영시간 09:00 – 24:00</p>
              </div>
            </div>

            <Link
              href="/location"
              className="text-center text-sm font-medium text-[#6f655d] underline-offset-2 hover:text-[#B98768] hover:underline transition-colors"
            >
              출입 방법 및 상세 안내 →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
