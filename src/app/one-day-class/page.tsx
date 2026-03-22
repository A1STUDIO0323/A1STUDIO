import Link from "next/link";
import { Megaphone, MessageSquarePlus, ChevronRight } from "lucide-react";

export default function OneDayClassPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB] flex items-center justify-center py-20 px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-14 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">One-Day Class</p>
          <h1 className="mt-2 text-4xl font-extrabold text-[#3B342F]">원데이클래스</h1>
          <p className="mt-4 text-base text-[#6f655d] max-w-md mx-auto">
            원하는 장르의 클래스를 신청하거나, 새로운 클래스를 요청해보세요.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Link
            href="/one-day-class/announcements"
            className="group flex flex-col gap-4 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-7 transition-all hover:border-[#B98768]/50 hover:bg-[#3B342F]/80"
          >
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-[#B98768]/15 p-3">
                <Megaphone className="h-6 w-6 text-[#B98768]" />
              </div>
              <ChevronRight className="h-5 w-5 text-[#b0a89e] transition-transform group-hover:translate-x-1 group-hover:text-[#B98768]" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-[#B98768] uppercase mb-1">Admin · Member</p>
              <h2 className="text-lg font-bold text-[#3B342F]">클래스 공고 등록</h2>
              <p className="mt-1.5 text-sm text-[#6f655d] leading-relaxed">
                CM(클래스마스터) 회원이 원데이클래스 공고를 등록하고, 참가 신청을 받을 수 있습니다.
              </p>
            </div>
          </Link>

          <Link
            href="/one-day-class/requests"
            className="group flex flex-col gap-4 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-7 transition-all hover:border-emerald-500/40 hover:bg-[#3B342F]/80"
          >
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-emerald-50 p-3">
                <MessageSquarePlus className="h-6 w-6 text-emerald-400" />
              </div>
              <ChevronRight className="h-5 w-5 text-[#b0a89e] transition-transform group-hover:translate-x-1 group-hover:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-emerald-400 uppercase mb-1">Member Only</p>
              <h2 className="text-lg font-bold text-[#3B342F]">클래스 요청</h2>
              <p className="mt-1.5 text-sm text-[#6f655d] leading-relaxed">
                일반회원만 원하는 장르, 시간, 날짜·요일을 선택해 클래스 개설을 요청할 수 있습니다.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
