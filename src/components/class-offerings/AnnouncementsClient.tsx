"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Loader2, LogIn, ShieldAlert, Calendar, Clock, Users, Tag, CheckCircle2 } from "lucide-react";
import { useSession, signIn } from "@/lib/auth-client";
import { useMemberRole } from "@/lib/member-role";
import { cn } from "@/lib/utils";

// 클래스/레슨 공고 등록 페이지 — type별로 재사용
// - CM 또는 ADMIN만 등록 가능
// - class_offerings 테이블에 실제 저장 (status='OPEN')
// - 본인이 등록한 공고는 신청자가 없을 때 삭제 가능

const SUBJECT_OPTIONS = [
  { value: "vocal", label: "보컬" },
  { value: "dance", label: "댄스" },
  { value: "act", label: "연기" },
  { value: "musical", label: "뮤지컬" },
  { value: "etc", label: "기타" },
] as const;

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
  type: "oneday" | "lesson";
};

type Copy = {
  pageEyebrow: string;
  pageTitle: string;
  pageDesc: string;
  capacityDefault: number;
  capacityLabel: string;
  capacityHint: string;
  priceLabel: string;
};

const COPY: Record<"oneday" | "lesson", Copy> = {
  oneday: {
    pageEyebrow: "One-day Class Announcement",
    pageTitle: "원데이클래스 공고 등록",
    pageDesc: "단발성 원데이클래스 공고를 등록하면 즉시 모집이 시작됩니다.",
    capacityDefault: 8,
    capacityLabel: "최대 정원",
    capacityHint: "예: 8명",
    priceLabel: "1인당 가격 (포인트)",
  },
  lesson: {
    pageEyebrow: "Private Lesson Announcement",
    pageTitle: "개인레슨 공고 등록",
    pageDesc: "1:1 또는 소수 인원 맞춤형 레슨 공고를 등록하면 즉시 모집이 시작됩니다.",
    capacityDefault: 1,
    capacityLabel: "정원",
    capacityHint: "보통 1:1 = 1명",
    priceLabel: "회차당 가격 (포인트)",
  },
};

export default function AnnouncementsClient({ type }: Props) {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { role, isCM, isAdmin } = useMemberRole(session?.user?.email);

  const copy = COPY[type];
  const [showForm, setShowForm] = useState(false);
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/class-offerings?type=${type}`, { cache: "no-store" });
      const data = await res.json();
      setOfferings(data.offerings ?? []);
    } catch (err) {
      console.error("[announcements] load failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const handleDelete = async (id: string) => {
    if (!confirm("정말 이 공고를 삭제하시겠어요? (이미 신청자가 있다면 삭제할 수 없습니다)")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/class-offerings/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "삭제에 실패했습니다.");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">{copy.pageEyebrow}</p>
            <h1 className="mt-1 text-3xl font-extrabold text-[#3B342F] sm:text-4xl">{copy.pageTitle}</h1>
            <p className="mt-3 max-w-2xl text-sm text-[#6f655d]">{copy.pageDesc}</p>
          </div>
          <Link
            href={type === "oneday" ? "/one-day-class" : "/lessons"}
            className="text-sm text-[#6f655d] underline-offset-4 hover:text-[#B98768] hover:underline"
          >
            ← 메인으로
          </Link>
        </div>

        {/* 권한 상태 */}
        <AuthBanner
          authStatus={authStatus}
          isCM={isCM}
          role={role}
          onLogin={() => signIn()}
        />

        {/* 등록 영역 */}
        {(isCM || isAdmin) && (
          <div className="mb-8">
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#B98768] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#a9785c]"
              >
                <Plus className="h-4 w-4" />
                공고 등록하기
              </button>
            ) : (
              <CreateForm
                type={type}
                copy={copy}
                onCancel={() => setShowForm(false)}
                onCreated={() => {
                  setShowForm(false);
                  void load();
                }}
              />
            )}
          </div>
        )}

        {/* 모집 중 공고 목록 */}
        <section>
          <h2 className="mb-4 text-lg font-bold text-[#3B342F]">
            모집 중 — {type === "oneday" ? "원데이클래스" : "개인레슨"}
            <span className="ml-2 text-sm font-normal text-[#9b9189]">({offerings.length}건)</span>
          </h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#B98768]" />
            </div>
          ) : offerings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#D8CCBC] bg-white p-10 text-center">
              <p className="text-sm font-semibold text-[#3B342F]">아직 등록된 공고가 없습니다</p>
              <p className="mt-1 text-xs text-[#9b9189]">
                {isCM ? "위 [공고 등록하기] 버튼으로 첫 공고를 올려보세요." : "곧 새로운 공고가 등록될 예정입니다."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {offerings.map((o) => (
                <OfferingCard
                  key={o.id}
                  offering={o}
                  canDelete={isAdmin || (isCM && o.cm?.display_name === session?.user?.name)}
                  busy={busyId === o.id}
                  onDelete={() => handleDelete(o.id)}
                  onApply={() => router.push(type === "oneday" ? "/one-day-class" : "/lessons")}
                />
              ))}
            </div>
          )}
        </section>

        {/* 신청 위치 안내 */}
        <p className="mt-6 text-center text-[11px] text-[#9b9189]">
          ※ 회원이 신청하려면{" "}
          <Link href={type === "oneday" ? "/one-day-class" : "/lessons"} className="underline">
            {type === "oneday" ? "원데이클래스" : "개인레슨"} 메인 페이지
          </Link>
          를 이용해주세요.
        </p>
      </div>
    </div>
  );
}

function AuthBanner({
  authStatus,
  isCM,
  role,
  onLogin,
}: {
  authStatus: string;
  isCM: boolean;
  role: string;
  onLogin: () => void;
}) {
  if (authStatus === "loading") return null;
  if (authStatus !== "authenticated") {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D8CCBC] bg-[#EFE7DA] px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-[#6f655d]">
          <LogIn className="h-4 w-4" />
          공고를 등록하려면 로그인이 필요합니다 (CM 또는 관리자 권한).
        </div>
        <button
          onClick={onLogin}
          className="rounded-lg bg-[#B98768] px-4 py-2 text-xs font-semibold text-white hover:bg-[#a9785c]"
        >
          로그인
        </button>
      </div>
    );
  }
  if (!isCM) {
    return (
      <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          공고 등록은 <strong>CM(클래스마스터)</strong> 또는 관리자만 가능합니다. 현재 회원등급:{" "}
          <span className="font-semibold">{role === "ADMIN" ? "ADMIN" : role === "CM" ? "CM" : "일반회원"}</span>
          <br />
          CM 등록은{" "}
          <Link href="/one-day-class/apply-cm" className="underline">
            CM 신청 페이지
          </Link>
          에서 가능합니다.
        </div>
      </div>
    );
  }
  return (
    <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      <span>
        현재 권한: <strong>{role === "ADMIN" ? "관리자" : "CM"}</strong>. 공고 등록이 가능합니다.
      </span>
    </div>
  );
}

function CreateForm({
  type,
  copy,
  onCancel,
  onCreated,
}: {
  type: "oneday" | "lesson";
  copy: Copy;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState<string>("vocal");
  const [duration, setDuration] = useState(type === "oneday" ? 120 : 60);
  const [capacity, setCapacity] = useState(copy.capacityDefault);
  const [pricePoints, setPricePoints] = useState(0);
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && pricePoints >= 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/class-offerings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim() || null,
          subject,
          duration_minutes: duration,
          capacity,
          price_points: pricePoints,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "등록 실패");
        return;
      }
      onCreated();
    } catch (err) {
      console.error("[announcements] create failed", err);
      setError("네트워크 오류로 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-[#D8CCBC] bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[#3B342F]">새 공고 등록</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-[#9b9189] hover:text-[#B98768]"
        >
          닫기
        </button>
      </div>

      <Field label="제목" required>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={type === "oneday" ? "예: 발라드 보컬 집중 원데이" : "예: 뮤지컬 오디션 1:1 레슨"}
          className="form-input"
          required
          maxLength={100}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="분야">
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="form-input"
          >
            {SUBJECT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="진행 시간 (분)" required>
          <input
            type="number"
            min={30}
            max={480}
            step={30}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="form-input"
            required
          />
        </Field>
      </div>

      <Field label="설명">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="커리큘럼·준비물·CM 소개 등"
          rows={4}
          className="form-input resize-y"
          maxLength={2000}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={copy.capacityLabel} hint={copy.capacityHint}>
          <input
            type="number"
            min={1}
            max={50}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className="form-input"
          />
        </Field>
        <Field label={copy.priceLabel} required>
          <input
            type="number"
            min={0}
            step={1000}
            value={pricePoints}
            onChange={(e) => setPricePoints(Number(e.target.value))}
            className="form-input"
            required
          />
        </Field>
      </div>

      <Field label="예정 일시 (선택)" hint="비워두면 '일정 매칭 예정'으로 표시">
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="form-input"
        />
      </Field>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[#D8CCBC] px-4 py-2 text-sm font-semibold text-[#6f655d] hover:text-[#B98768]"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold text-white transition-colors",
            canSubmit ? "bg-[#B98768] hover:bg-[#a9785c]" : "cursor-not-allowed bg-[#D8CCBC]"
          )}
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "등록 중..." : "공고 등록"}
        </button>
      </div>

      <style jsx>{`
        :global(.form-input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #d8ccbc;
          background: #ffffff;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: #3b342f;
          outline: none;
        }
        :global(.form-input:focus) {
          border-color: #b98768;
          box-shadow: 0 0 0 3px rgba(185, 135, 104, 0.15);
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#3B342F]">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
        {hint && <span className="ml-2 font-normal text-[#9b9189]">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function OfferingCard({
  offering,
  canDelete,
  busy,
  onDelete,
  onApply,
}: {
  offering: Offering;
  canDelete: boolean;
  busy: boolean;
  onDelete: () => void;
  onApply: () => void;
}) {
  const subjectLabel =
    SUBJECT_OPTIONS.find((s) => s.value === offering.subject)?.label ?? offering.subject;

  return (
    <article className="flex flex-col rounded-2xl border border-[#D8CCBC] bg-white p-5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 font-bold text-[#3B342F]">{offering.title}</h3>
        {subjectLabel && (
          <span className="shrink-0 rounded-full bg-[#EFE7DA] px-2 py-0.5 text-[10px] font-semibold text-[#3B342F]">
            <Tag className="mr-0.5 inline h-2.5 w-2.5" />
            {subjectLabel}
          </span>
        )}
      </div>
      {offering.description && (
        <p className="mb-3 line-clamp-3 text-sm text-[#6f655d]">{offering.description}</p>
      )}
      <div className="mb-4 space-y-1.5 text-xs text-[#6f655d]">
        {offering.cm && (
          <div className="flex items-center gap-1.5">
            <span>CM</span>
            <span className="font-semibold text-[#3B342F]">{offering.cm.display_name}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          {offering.scheduled_at ? new Date(offering.scheduled_at).toLocaleString("ko-KR") : "일정 매칭 예정"}
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {offering.duration_minutes}분
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {offering.type === "lesson"
            ? "1:1"
            : `${offering.enrolled_count}/${offering.capacity}명`}
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <p className="text-lg font-bold text-[#B98768]">
          {offering.price_points.toLocaleString("ko-KR")}P
        </p>
        <div className="flex gap-1.5">
          {canDelete && (
            <button
              onClick={onDelete}
              disabled={busy}
              title="공고 삭제"
              className="rounded-lg border border-[#D8CCBC] p-2 text-[#9b9189] hover:border-red-300 hover:text-red-500 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={onApply}
            className="rounded-lg bg-[#B98768] px-4 py-2 text-sm font-bold text-white hover:bg-[#a9785c]"
          >
            신청하기
          </button>
        </div>
      </div>
    </article>
  );
}
