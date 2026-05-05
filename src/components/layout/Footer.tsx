import Link from "next/link";
import { Music2, Phone, MapPin, Instagram } from "lucide-react";
import {
  STUDIO_NAME,
  STUDIO_ADDRESS,
  STUDIO_ADDRESS_DETAIL,
  STUDIO_PHONE,
  STUDIO_INSTAGRAM,
  STUDIO_KAKAO_CHANNEL,
} from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="border-t border-[#D8CCBC] bg-[#F7F3EB] text-[#6f655d]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* 브랜드 */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <Music2 className="h-5 w-5 text-[#B98768]" />
              <span className="text-base font-bold text-[#3B342F]">{STUDIO_NAME}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed">
              보컬 · 댄스 · 연기 · 뮤지컬 전문 연습실.
              <br />
              전신거울, 전자피아노, 촬영조명 완비.
            </p>
            <div className="mt-4 flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-[#B98768]" />
              <div>
                <span>{STUDIO_ADDRESS}</span>
                <p className="text-xs text-[#9b9189] mt-0.5">{STUDIO_ADDRESS_DETAIL}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 shrink-0 text-[#B98768]" />
              <a href={`tel:${STUDIO_PHONE}`} className="hover:text-[#B98768]">
                {STUDIO_PHONE}
              </a>
            </div>
          </div>

          {/* 빠른 링크 */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#3B342F]">
              서비스
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: "연습실 소개", href: "/spaces" },
                { label: "원데이클래스", href: "/one-day-class" },
                { label: "요금안내", href: "/pricing" },
                // 예약 메뉴 임시 숨김 (코드 보관)
                // { label: "예약현황", href: "/availability" },
                // { label: "예약하기", href: "/booking" },
                { label: "이용안내", href: "/guide" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-[#B98768] transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 고객지원 */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#3B342F]">
              고객지원
            </h3>
            <ul className="space-y-2 text-sm">
              {[
                { label: "후기", href: "/reviews" },
                { label: "공지사항", href: "/notices" },
                { label: "이벤트", href: "/events" },
                { label: "오시는길", href: "/location" },
                { label: "문의하기", href: "/contact" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-[#B98768] transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-3">
              <a
                href={STUDIO_KAKAO_CHANNEL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-semibold text-[#3B342F] hover:bg-yellow-300 transition-colors"
              >
                카카오 채널
              </a>
              <a
                href={STUDIO_INSTAGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-[#D8CCBC] px-3 py-1 text-xs font-medium hover:border-[#D8CCBC] hover:text-[#B98768] transition-colors"
              >
                <Instagram className="inline h-3 w-3 mr-1" />
                인스타
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[#D8CCBC] pt-6 text-center text-xs text-[#b0a89e]">
          © {new Date().getFullYear()} {STUDIO_NAME}. All rights reserved.
          <span className="mx-2">|</span>
          <Link href="/privacy" className="hover:text-[#6f655d] transition-colors">
            개인정보처리방침
          </Link>
          <span className="mx-2">|</span>
          <Link href="/terms" className="hover:text-[#6f655d] transition-colors">
            서비스 이용약관
          </Link>
        </div>
      </div>
    </footer>
  );
}
