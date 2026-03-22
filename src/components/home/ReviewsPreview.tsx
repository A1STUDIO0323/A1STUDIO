import Link from "next/link";
import { ArrowRight, ExternalLink, Star } from "lucide-react";

export default function ReviewsPreview() {
  return (
    <section className="bg-[#EFE7DA] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
              Reviews
            </p>
            <h2 className="mt-1 text-3xl font-bold text-[#3B342F]">
              이용 후기
            </h2>
          </div>
          <Link
            href="/reviews"
            className="hidden items-center gap-1 text-sm font-medium text-[#6f655d] hover:text-[#B98768] transition-colors sm:flex"
          >
            후기 페이지 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-2xl border border-[#D8CCBC] bg-[#F7F3EB]/60 p-8 text-center">
          <div className="flex justify-center gap-1 mb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-7 w-7 fill-amber-500 text-amber-500" />
            ))}
          </div>
          <p className="text-base font-semibold text-[#3B342F] mb-2">
            고객이 직접 작성한 후기를 소중히 생각합니다.
          </p>
          <p className="text-sm text-[#6f655d] mb-8">
            네이버 플레이스 또는 스페이스클라우드에서 후기를 확인하고 작성해주세요.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="https://map.naver.com/v5/search/A1%20STUDIO%20문정동"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-[#03C75A] px-6 py-3 text-sm font-semibold text-[#3B342F] transition-all hover:opacity-90 active:scale-95"
            >
              <ExternalLink className="h-4 w-4" />
              네이버 플레이스 후기
            </a>
            <a
              href="https://www.spacecloud.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-[#5C6BC0] px-6 py-3 text-sm font-semibold text-[#3B342F] transition-all hover:opacity-90 active:scale-95"
            >
              <ExternalLink className="h-4 w-4" />
              스페이스클라우드 후기
            </a>
          </div>
        </div>

        <div className="mt-6 flex justify-center sm:hidden">
          <Link
            href="/reviews"
            className="flex items-center gap-1.5 text-sm font-medium text-[#B98768]"
          >
            후기 페이지 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
