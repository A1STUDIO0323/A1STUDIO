import { Metadata } from "next";
import { MapPin, Train, Car, Clock, Key } from "lucide-react";
import { STUDIO_ADDRESS } from "@/lib/constants";

export const metadata: Metadata = { title: "오시는길" };

export default function LocationPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">Location</p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">오시는 길</h1>
        </div>

        {/* 지도 */}
        <div className="mb-10 flex h-64 items-center justify-center overflow-hidden rounded-2xl bg-[#F7F3EB] sm:h-80">
          <div className="flex flex-col items-center gap-3 text-center">
            <MapPin className="h-10 w-10 text-[#B98768]" />
            <p className="text-sm text-[#6f655d]">{STUDIO_ADDRESS}</p>
            <a
              href={`https://map.naver.com/v5/search/${encodeURIComponent(STUDIO_ADDRESS)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-green-500 px-5 py-2 text-sm font-semibold text-[#3B342F] hover:bg-green-400 transition-colors"
            >
              네이버 지도로 보기
            </a>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {[
            {
              icon: Train,
              color: "blue",
              title: "지하철",
              lines: [
                "8호선 문정역 → 도보 8분",
                "8호선 장지역 → 도보 10분",
              ],
            },
            {
              icon: Car,
              color: "emerald",
              title: "자가용 / 주차",
              lines: [
                "건물 주차 가능 (예약 시 차량번호 입력)",
                "인근 공영주차장 이용 가능",
              ],
            },
            {
              icon: Clock,
              color: "orange",
              title: "운영 시간",
              lines: ["매일 09:00 – 24:00", "공휴일 동일 운영"],
            },
            {
              icon: Key,
              color: "violet",
              title: "출입 방법",
              lines: [
                "결제 완료 후 문자로 입장 코드 발송",
                "출입문 비밀번호 입력 후 입장",
              ],
            },
          ].map(({ icon: Icon, color, title, lines }) => (
            <div key={title} className="rounded-xl border border-[#D8CCBC] bg-[#EFE7DA] p-5">
              <div className="flex items-start gap-3">
                <div className={`rounded-lg bg-${color}-900/40 p-2.5`}>
                  <Icon className={`h-5 w-5 text-${color}-400`} />
                </div>
                <div>
                  <h3 className="font-semibold text-[#3B342F]">{title}</h3>
                  {lines.map((line) => (
                    <p key={line} className="mt-1 text-sm text-[#6f655d]">{line}</p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
