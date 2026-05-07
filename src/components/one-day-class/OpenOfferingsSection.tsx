"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Clock, Users, User, Loader2, X } from "lucide-react";

const SUBJECT_LABELS: Record<string, string> = {
  vocal: "보컬", dance: "댄스", act: "연기", musical: "뮤지컬", etc: "기타",
};

type Offering = {
  id: string;
  type: "oneday" | "lesson";
  title: string;
  description: string | null;
  subject: string | null;
  duration_minutes: number;
  capacity: number;
  price_points: number;
  scheduled_at: string | null;
  enrolled_count: number;
  remaining: number;
  cm: { display_name: string; profile_image: string | null; subjects: string[] } | null;
};

type Props = {
  /** 'oneday' | 'lesson' | undefined (둘 다) */
  filterType?: "oneday" | "lesson";
};

export default function OpenOfferingsSection({ filterType }: Props = {}) {
  const [oneday, setOneday] = useState<Offering[]>([]);
  const [lesson, setLesson] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [openTarget, setOpenTarget] = useState<Offering | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const tasks: Promise<Response>[] = [];
      if (!filterType || filterType === "oneday") {
        tasks.push(fetch("/api/class-offerings?type=oneday", { cache: "no-store" }));
      }
      if (!filterType || filterType === "lesson") {
        tasks.push(fetch("/api/class-offerings?type=lesson", { cache: "no-store" }));
      }
      const responses = await Promise.all(tasks);
      const datas = await Promise.all(responses.map((r) => r.json()));
      let idx = 0;
      if (!filterType || filterType === "oneday") {
        setOneday(datas[idx].offerings ?? []);
        idx++;
      } else {
        setOneday([]);
      }
      if (!filterType || filterType === "lesson") {
        setLesson(datas[idx].offerings ?? []);
      } else {
        setLesson([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#B98768]" />
      </div>
    );
  }

  const total = oneday.length + lesson.length;
  if (total === 0) {
    return (
      <section className="mb-8 rounded-2xl border border-dashed border-[#D8CCBC] bg-white p-8 text-center">
        <p className="text-sm font-semibold text-[#3B342F] mb-1">현재 모집 중인 클래스·레슨이 없습니다</p>
        <p className="text-xs text-[#9b9189]">
          새로운 클래스·레슨이 등록되면 이 자리에 자동으로 노출됩니다.
        </p>
      </section>
    );
  }

  return (
    <>
      {oneday.length > 0 && (
        <Group title="모집 중 — 원데이클래스" items={oneday} onApply={setOpenTarget} />
      )}
      {lesson.length > 0 && (
        <Group title="모집 중 — 개인레슨" items={lesson} onApply={setOpenTarget} />
      )}
      {openTarget && (
        <ApplyModal
          offering={openTarget}
          onClose={() => setOpenTarget(null)}
          onSuccess={() => {
            setOpenTarget(null);
            void load();
          }}
        />
      )}
    </>
  );
}

function Group({
  title,
  items,
  onApply,
}: {
  title: string;
  items: Offering[];
  onApply: (o: Offering) => void;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-[#3B342F] mb-4">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((o) => (
          <article
            key={o.id}
            className="flex flex-col rounded-2xl border border-[#D8CCBC] bg-white p-5"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-bold text-[#3B342F] line-clamp-2">{o.title}</h3>
              {o.subject && (
                <span className="shrink-0 rounded-full bg-[#EFE7DA] px-2 py-0.5 text-[10px] font-semibold text-[#3B342F]">
                  {SUBJECT_LABELS[o.subject] ?? o.subject}
                </span>
              )}
            </div>
            {o.description && (
              <p className="text-sm text-[#6f655d] mb-3 line-clamp-3">{o.description}</p>
            )}
            <div className="space-y-1.5 text-xs text-[#6f655d] mb-4">
              {o.cm && (
                <div className="flex items-center gap-1.5">
                  {o.cm.profile_image ? (
                    <span className="relative h-5 w-5 overflow-hidden rounded-full">
                      <Image src={o.cm.profile_image} alt="" fill className="object-cover" />
                    </span>
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                  <span>CM {o.cm.display_name}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {o.scheduled_at ? new Date(o.scheduled_at).toLocaleString("ko-KR") : "일정 매칭 예정"}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {o.duration_minutes}분
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {o.type === "lesson" ? "1:1" : `${o.enrolled_count}/${o.capacity}명`}
                {o.type !== "lesson" && o.remaining > 0 && o.remaining <= 3 && (
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    잔여 {o.remaining}석
                  </span>
                )}
              </div>
            </div>
            <div className="mt-auto flex items-center justify-between">
              <p className="text-lg font-bold text-[#B98768]">
                {o.price_points.toLocaleString("ko-KR")}P
              </p>
              <button
                onClick={() => onApply(o)}
                disabled={o.remaining <= 0}
                className="rounded-lg bg-[#B98768] px-4 py-2 text-sm font-bold text-white hover:bg-[#a9785c] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {o.remaining <= 0 ? "마감" : "신청"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ApplyModal({
  offering,
  onClose,
  onSuccess,
}: {
  offering: Offering;
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
          .then(({ data }) => setPointBalance(data?.balance ?? 0));
      }
    });
  }, []);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
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
        setError(data.error ?? "신청 실패");
        return;
      }
      alert("신청이 완료되었습니다. 포인트가 임시 차감(HOLD)되었으며, 수업 완료 시 사용 확정됩니다.");
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  const insufficient =
    pointBalance != null && pointBalance < offering.price_points;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#3B342F]">
            {offering.type === "oneday" ? "원데이클래스" : "개인레슨"} 신청
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-[#EFE7DA]">
            <X className="w-5 h-5 text-[#6f655d]" />
          </button>
        </div>

        <div className="mb-4 rounded-xl bg-[#F7F3EB] p-4 space-y-1 text-sm">
          <p className="font-semibold text-[#3B342F]">{offering.title}</p>
          <p className="text-xs text-[#6f655d]">
            {offering.scheduled_at
              ? new Date(offering.scheduled_at).toLocaleString("ko-KR")
              : "일정 매칭 후 안내"} · {offering.duration_minutes}분
          </p>
          {offering.cm && (
            <p className="text-xs text-[#6f655d]">CM {offering.cm.display_name}</p>
          )}
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
  );
}
