import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { User } from "lucide-react";

type CmProfile = {
  user_id: string;
  display_name: string;
  bio: string | null;
  career: string | null;
  subjects: string[] | null;
  profile_image: string | null;
  portfolio_url: string | null;
};

const SUBJECT_LABELS: Record<string, string> = {
  vocal: "보컬",
  dance: "댄스",
  act: "연기",
  musical: "뮤지컬",
  etc: "기타",
};

export default async function CmCardSection() {
  let profiles: CmProfile[] = [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("cm_profiles")
      .select("user_id, display_name, bio, career, subjects, profile_image, portfolio_url")
      .eq("is_public", true)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      profiles = data as CmProfile[];
    }
  } catch {
    // 테이블 미존재 또는 조회 실패 시 빈 상태로 폴백
    profiles = [];
  }

  return (
    <section className="mb-8">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-[#3B342F]">클래스마스터(CM) 소개</h2>
        <p className="text-sm text-[#6f655d] mt-1">
          A1 STUDIO와 함께하는 클래스마스터를 소개합니다.
        </p>
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D8CCBC] bg-[#F7F3EB] p-8 text-center">
          <p className="text-sm font-semibold text-[#3B342F] mb-1">클래스마스터를 모시는 중입니다</p>
          <p className="text-xs text-[#9b9189]">
            승인된 CM이 마이페이지에 공개 프로필을 등록하면 이 자리에 자동으로 노출됩니다.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((cm) => (
            <article
              key={cm.user_id}
              className="rounded-2xl border border-[#D8CCBC] bg-white p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#EFE7DA]">
                  {cm.profile_image ? (
                    <Image
                      src={cm.profile_image}
                      alt={cm.display_name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User className="h-6 w-6 text-[#9b9189]" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-[#3B342F] truncate">{cm.display_name}</h3>
                  {cm.subjects && cm.subjects.length > 0 && (
                    <p className="text-xs text-[#9b9189] mt-0.5">
                      {cm.subjects.map((s) => SUBJECT_LABELS[s] ?? s).join(" · ")}
                    </p>
                  )}
                </div>
              </div>

              {cm.bio && (
                <p className="text-sm text-[#6f655d] mb-3 line-clamp-3">{cm.bio}</p>
              )}

              {cm.career && (
                <div className="rounded-lg bg-[#F7F3EB] p-3 mb-3">
                  <p className="text-[10px] font-semibold uppercase text-[#9b9189] mb-1">주요 경력</p>
                  <p className="text-xs text-[#6f655d] whitespace-pre-line line-clamp-4">{cm.career}</p>
                </div>
              )}

              {cm.portfolio_url && (
                <a
                  href={cm.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs font-semibold text-[#B98768] hover:underline"
                >
                  포트폴리오 →
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
