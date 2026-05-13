import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { User } from "lucide-react";

// CM 카드 섹션 — 공개 프로필 노출
// - type prop이 지정되면 cm_applications.status='APPROVED' + can_<type>=true인 CM만 표시
// - type 미지정 시 모든 공개 활성 CM 표시
//
// Phase 1: 단일 is_public 토글 기반.
// Phase 2 예정: show_in_section / show_in_list 컬럼 분리 (CM 목록 페이지와 본문 카드 노출 독립 제어)

type Props = {
  /** 'oneday' | 'lesson' — 해당 분류로 승인된 CM만 노출. 미지정 시 전체. */
  type?: "oneday" | "lesson";
  /** 'section' (본문 임베드) | 'list' (CM 목록 페이지) — 헤더 문구만 다름 */
  variant?: "section" | "list";
};

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

const TYPE_LABEL: Record<NonNullable<Props["type"]>, string> = {
  oneday: "원데이클래스",
  lesson: "개인레슨",
};

export default async function CmCardSection({ type, variant = "section" }: Props = {}) {
  let profiles: CmProfile[] = [];

  try {
    const supabase = await createClient();

    // 1) type 지정 시: cm_applications에서 해당 분류 승인된 user_id 목록 조회
    let allowedUserIds: string[] | null = null;
    if (type) {
      const filterColumn = type === "oneday" ? "can_oneday" : "can_lesson";
      const { data: apps, error: appErr } = await supabase
        .from("cm_applications")
        .select("user_id")
        .eq("status", "APPROVED")
        .eq(filterColumn, true);
      if (appErr) {
        console.warn(`[CmCardSection] cm_applications query failed type=${type}`, appErr);
      }
      allowedUserIds = (apps ?? []).map((a: { user_id: string }) => a.user_id);
      // 매칭되는 승인 신청이 없으면 빈 결과로 단락
      if (allowedUserIds.length === 0) {
        profiles = [];
        return renderSection(profiles, type, variant);
      }
    }

    // 2) 공개·활성 CM 프로필 조회
    //    variant='section' → show_in_section=true, variant='list' → show_in_list=true
    //    Phase 2 마이그레이션 후 적용. 컬럼이 아직 없는 환경에서는 자동으로 is_public fallback.
    const visibilityColumn = variant === "list" ? "show_in_list" : "show_in_section";
    let query = supabase
      .from("cm_profiles")
      .select("user_id, display_name, bio, career, subjects, profile_image, portfolio_url")
      .eq("is_active", true)
      .eq(visibilityColumn, true)
      .order("created_at", { ascending: false });
    if (allowedUserIds) {
      query = query.in("user_id", allowedUserIds);
    }
    let { data, error } = await query;

    // Phase 2 마이그레이션 전 — 컬럼 미존재 시 is_public 으로 fallback
    if (error && /column .* does not exist/i.test(error.message ?? "")) {
      console.warn(
        `[CmCardSection] ${visibilityColumn} 컬럼이 아직 없습니다. is_public 으로 fallback. SQL 마이그레이션 필요: prisma/migrations/add_cm_profile_visibility_toggles.sql`
      );
      let fallback = supabase
        .from("cm_profiles")
        .select("user_id, display_name, bio, career, subjects, profile_image, portfolio_url")
        .eq("is_public", true)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (allowedUserIds) fallback = fallback.in("user_id", allowedUserIds);
      const fb = await fallback;
      data = fb.data;
      error = fb.error;
    }

    if (error) {
      console.warn("[CmCardSection] cm_profiles query failed", error);
    } else if (data) {
      profiles = data as CmProfile[];
    }
  } catch (err) {
    console.warn("[CmCardSection] fallback to empty", err);
    profiles = [];
  }

  return renderSection(profiles, type, variant);
}

function renderSection(
  profiles: CmProfile[],
  type: Props["type"],
  variant: NonNullable<Props["variant"]>
) {
  const heading =
    variant === "list"
      ? `클래스마스터(CM)${type ? ` — ${TYPE_LABEL[type]}` : ""}`
      : "클래스마스터(CM) 소개";
  const subText =
    variant === "list"
      ? type
        ? `${TYPE_LABEL[type]} 분야로 활동 중인 CM을 소개합니다.`
        : "A1 STUDIO에서 활동 중인 클래스마스터를 소개합니다."
      : "A1 STUDIO와 함께하는 클래스마스터를 소개합니다.";

  return (
    <section className="mb-8">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-[#3B342F]">{heading}</h2>
        <p className="text-sm text-[#6f655d] mt-1">{subText}</p>
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D8CCBC] bg-[#F7F3EB] p-8 text-center">
          <p className="text-sm font-semibold text-[#3B342F] mb-1">
            {type
              ? `${TYPE_LABEL[type]} CM을 모시는 중입니다`
              : "클래스마스터를 모시는 중입니다"}
          </p>
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
