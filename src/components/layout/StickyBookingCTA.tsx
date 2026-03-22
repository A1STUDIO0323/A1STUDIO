"use client";

import { usePathname } from "next/navigation";

const HIDE_ON = ["/booking", "/admin"];

export default function StickyBookingCTA() {
  const pathname = usePathname();
  const hidden = HIDE_ON.some((p) => pathname.startsWith(p));
  if (hidden) return null;

  // 예약 메뉴 임시 숨김 (코드 보관)
  return null;

  /*
  return (
    <div className="fixed bottom-6 right-6 z-40 lg:hidden">
      <Link
        href="/booking"
        className="flex items-center gap-2 rounded-full bg-[#B98768] px-5 py-3.5 text-sm font-bold text-[#F7F3EB] shadow-2xl shadow-[#B98768]/15 transition-all hover:bg-[#a9785c] active:scale-95"
      >
        <CalendarCheck className="h-5 w-5" />
        예약하기
      </Link>
    </div>
  );
  */
}
