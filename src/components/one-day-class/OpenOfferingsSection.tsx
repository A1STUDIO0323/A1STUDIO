"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Calendar, Clock, Users, User, Loader2 } from "lucide-react";
import ApplyModal from "./ApplyModal";

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
          // 카드 전체 클릭 → 상세·신청 모달 오픈 (마감되어도 상세 열람은 가능)
          <article
            key={o.id}
            onClick={() => onApply(o)}
            className="flex flex-col rounded-2xl border border-[#D8CCBC] bg-white p-5 cursor-pointer transition-colors hover:border-[#B98768]/60 hover:bg-[#F7F3EB]"
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
                onClick={(e) => {
                  // 카드 onClick 과 중복 발화 방지
                  e.stopPropagation();
                  onApply(o);
                }}
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

// ApplyModal 은 components/one-day-class/ApplyModal.tsx 로 분리 — announcements 페이지와 공유
