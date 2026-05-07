import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import OpenOfferingsSection from "@/components/one-day-class/OpenOfferingsSection";

export default function OneDayClassListPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20 px-4">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
              One-Day Class
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-[#3B342F]">원데이클래스 목록</h1>
            <p className="mt-2 text-sm text-[#6f655d]">
              현재 모집 중인 원데이클래스입니다.
            </p>
          </div>
          <Link
            href="/one-day-class"
            className="inline-flex items-center gap-1.5 text-sm text-[#6f655d] hover:text-[#B98768]"
          >
            <ArrowLeft className="w-4 h-4" />
            안내로
          </Link>
        </div>

        <OpenOfferingsSection filterType="oneday" />
      </div>
    </div>
  );
}
