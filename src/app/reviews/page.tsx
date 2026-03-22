import { Metadata } from "next";
import { ExternalLink, Star } from "lucide-react";

export const metadata: Metadata = { title: "후기" };

const REVIEW_PLATFORMS = [
  {
    name: "네이버 플레이스",
    description: "네이버 지도에서 A1 STUDIO 후기를 확인하고 작성하세요.",
    url: "https://map.naver.com/v5/search/A1%20STUDIO%20문정동",
    color: "bg-[#03C75A]",
    textColor: "text-[#3B342F]",
    logo: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden="true">
        <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
      </svg>
    ),
  },
  {
    name: "스페이스클라우드",
    description: "스페이스클라우드에서 A1 STUDIO 후기를 확인하고 작성하세요.",
    url: "https://www.spacecloud.kr",
    color: "bg-[#5C6BC0]",
    textColor: "text-[#3B342F]",
    logo: (
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white" aria-hidden="true">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
      </svg>
    ),
  },
];

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">Reviews</p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">이용 후기</h1>
          <p className="mt-3 text-[#6f655d]">실제 이용하신 분들의 솔직한 후기</p>
        </div>

        {/* 안내 문구 */}
        <div className="mb-10 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6 text-center">
          <div className="flex justify-center gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-6 w-6 fill-amber-500 text-amber-500" />
            ))}
          </div>
          <p className="text-base font-semibold text-[#3B342F]">
            고객이 직접 작성한 후기를 소중히 생각합니다.
          </p>
          <p className="mt-2 text-sm text-[#6f655d]">
            아래 플랫폼에서 A1 STUDIO 후기를 확인하거나 직접 작성해주세요.
            <br />
            소중한 피드백이 스튜디오 운영에 큰 도움이 됩니다.
          </p>
        </div>

        {/* 플랫폼 링크 */}
        <div className="grid gap-5 sm:grid-cols-2">
          {REVIEW_PLATFORMS.map((platform) => (
            <a
              key={platform.name}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6 transition-all hover:border-[#B98768]/50 hover:bg-[#EFE7DA]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${platform.color}`}>
                  {platform.logo}
                </div>
                <h2 className="text-lg font-bold text-[#3B342F]">{platform.name}</h2>
              </div>
              <p className="flex-1 text-sm text-[#6f655d] leading-relaxed">
                {platform.description}
              </p>
              <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-[#B98768] group-hover:text-[#B98768] transition-colors">
                후기 작성하러 가기
                <ExternalLink className="h-4 w-4" />
              </div>
            </a>
          ))}
        </div>

        {/* 추후 리뷰 영역 안내 */}
        <div className="mt-10 rounded-2xl border border-dashed border-[#D8CCBC] p-8 text-center">
          <p className="text-sm text-[#9b9189]">
            고객 후기가 쌓이면 이 곳에 표시됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
