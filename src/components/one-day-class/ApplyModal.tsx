"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, X, Calendar, Clock, User, ExternalLink, Tag } from "lucide-react";
import Image from "next/image";

// 원데이클래스 / 개인레슨 공통 신청·상세 모달.
// 메인 페이지(/one-day-class)와 공고 등록 페이지(/one-day-class/announcements) 양쪽에서 재사용.
// - 비로그인: 로그인 유도
// - 로그인 + 포인트 부족: 충전 페이지로 이동
// - 로그인 + 포인트 충분: 신청 확정 → /api/class-enrollments POST
//
// 레이아웃: 데스크탑(sm+) = 좌(CM 정보) / 우(클래스 상세·신청). 모바일 = 세로 스택.

const SUBJECT_LABELS: Record<string, string> = {
  vocal: "보컬", dance: "댄스", act: "연기", musical: "뮤지컬", etc: "기타",
};

export type ApplyModalOffering = {
  id: string;
  type: "oneday" | "lesson";
  title: string;
  description: string | null;
  duration_minutes: number;
  price_points: number;
  scheduled_at: string | null;
  cm: {
    display_name: string;
    profile_image: string | null;
    subjects?: string[] | null;
    bio?: string | null;
    career?: string | null;
    portfolio_url?: string | null;
  } | null;
};

const LOG_PREFIX = "[ApplyModal]";

export default function ApplyModal({
  offering,
  onClose,
  onSuccess,
}: {
  offering: ApplyModalOffering;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pointBalance, setPointBalance] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthed(!!user);
      setAuthChecked(true);
      if (user) {
        supabase
          .from("user_points")
          .select("balance")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data, error: pErr }) => {
            if (pErr) {
              console.warn(`${LOG_PREFIX} 포인트 조회 실패`, pErr);
            }
            setPointBalance(data?.balance ?? 0);
          });
      }
    });
  }, []);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      console.log(`${LOG_PREFIX} apply start offeringId=${offering.id}`);
      const res = await fetch("/api/class-enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offering_id: offering.id,
          request_note: requestNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.warn(`${LOG_PREFIX} apply failed`, data);
        setError(data.error ?? "신청 실패");
        return;
      }
      console.log(`${LOG_PREFIX} apply success offeringId=${offering.id}`);
      alert("신청이 완료되었습니다. 포인트가 임시 차감(HOLD)되었으며, 수업 완료 시 사용 확정됩니다.");
      onSuccess();
    } catch (err) {
      console.error(`${LOG_PREFIX} apply exception`, err);
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const insufficient =
    pointBalance != null && pointBalance < offering.price_points;

  const cmSubjects = (offering.cm?.subjects ?? []).filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl my-8 rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-[#EFE7DA] px-6 py-4">
          <h2 className="text-lg font-bold text-[#3B342F]">
            {offering.type === "oneday" ? "원데이클래스" : "개인레슨"} 상세 · 신청
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-[#EFE7DA]">
            <X className="w-5 h-5 text-[#6f655d]" />
          </button>
        </div>

        {/* 본문: 좌(CM) / 우(클래스+신청) — 모바일은 세로 스택 */}
        <div className="grid gap-0 sm:grid-cols-[260px_1fr] sm:divide-x sm:divide-[#EFE7DA]">
          {/* ── 좌: CM 정보 ───────────────────────────────── */}
          <aside className="space-y-4 bg-[#FAF6EE] p-6 sm:rounded-bl-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#B98768]">
              담당 CM
            </p>
            {offering.cm ? (
              <>
                <div className="flex flex-col items-center text-center">
                  <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-white bg-[#F7F3EB] shadow-sm">
                    {offering.cm.profile_image ? (
                      <Image
                        src={offering.cm.profile_image}
                        alt={offering.cm.display_name}
                        fill
                        sizes="96px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#9b9189]">
                        <User className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <p className="mt-3 font-bold text-[#3B342F]">
                    {offering.cm.display_name}
                  </p>
                  {cmSubjects.length > 0 && (
                    <div className="mt-2 flex flex-wrap justify-center gap-1">
                      {cmSubjects.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-0.5 rounded-full bg-[#EFE7DA] px-2 py-0.5 text-[10px] font-semibold text-[#3B342F]"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {SUBJECT_LABELS[s] ?? s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {offering.cm.bio && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9b9189] mb-1">
                      소개
                    </p>
                    <p className="text-xs text-[#6f655d] whitespace-pre-line leading-relaxed">
                      {offering.cm.bio}
                    </p>
                  </div>
                )}

                {offering.cm.career && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#9b9189] mb-1">
                      주요 경력
                    </p>
                    <p className="text-xs text-[#6f655d] whitespace-pre-line leading-relaxed">
                      {offering.cm.career}
                    </p>
                  </div>
                )}

                {offering.cm.portfolio_url && (
                  <a
                    href={offering.cm.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#B98768] hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    포트폴리오 보기
                  </a>
                )}
              </>
            ) : (
              <p className="text-xs text-[#9b9189]">CM 정보는 비공개입니다.</p>
            )}
          </aside>

          {/* ── 우: 클래스 상세 + 신청 ─────────────────────── */}
          <div className="p-6">
            {/* 클래스 상세 정보 */}
            <div className="mb-4 rounded-xl bg-[#F7F3EB] p-4 space-y-2 text-sm">
              <p className="font-semibold text-[#3B342F]">{offering.title}</p>
              {offering.description && (
                <p className="text-xs text-[#6f655d] whitespace-pre-line">
                  {offering.description}
                </p>
              )}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6f655d] pt-1">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {offering.scheduled_at
                    ? new Date(offering.scheduled_at).toLocaleString("ko-KR")
                    : "일정 매칭 후 안내"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {offering.duration_minutes}분
                </span>
              </div>
            </div>

            {!authChecked ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-[#B98768]" />
              </div>
            ) : !authed ? (
              <>
                <p className="text-sm text-[#6f655d] mb-4">
                  신청을 위해 로그인이 필요합니다.
                </p>
                <button
                  onClick={() => router.push(`/login?redirect=/one-day-class`)}
                  className="w-full rounded-xl bg-[#B98768] px-4 py-3 text-sm font-bold text-white hover:bg-[#a9785c]"
                >
                  로그인
                </button>
              </>
            ) : (
              <>
                {offering.type === "lesson" && (
                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-[#3B342F] mb-1">
                      희망 분야·일정·목표 (선택)
                    </label>
                    <textarea
                      rows={3}
                      value={requestNote}
                      onChange={(e) => setRequestNote(e.target.value)}
                      className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 text-sm focus:border-[#B98768] focus:outline-none resize-none"
                      placeholder="예) 평일 저녁 8시 이후 / 발성 기초부터 / 뮤지컬 오디션 준비 중"
                    />
                  </div>
                )}

                <div className="mb-4 rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6f655d]">필요 포인트</span>
                    <span className="font-bold text-[#B98768]">
                      {offering.price_points.toLocaleString("ko-KR")}P
                    </span>
                  </div>
                  {pointBalance != null && (
                    <div className="flex justify-between mt-1">
                      <span className="text-[#6f655d]">보유 포인트</span>
                      <span className="text-[#3B342F]">
                        {pointBalance.toLocaleString("ko-KR")}P
                      </span>
                    </div>
                  )}
                </div>

                <p className="mb-4 text-xs text-[#9b9189] leading-relaxed">
                  · 신청 시 포인트가 임시 차감(HOLD)됩니다.<br />
                  · 수업 완료 시 사용 확정, 취소·환불 시 포인트가 복구됩니다.
                </p>

                {error && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    {error}
                  </div>
                )}

                {insufficient ? (
                  <button
                    onClick={() => router.push("/charge")}
                    className="w-full rounded-xl bg-[#B98768] px-4 py-3 text-sm font-bold text-white hover:bg-[#a9785c]"
                  >
                    포인트 충전하기
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full rounded-xl bg-[#B98768] px-4 py-3 text-sm font-bold text-white hover:bg-[#a9785c] disabled:opacity-50"
                  >
                    {submitting ? "신청 중..." : "신청 확정하기"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
