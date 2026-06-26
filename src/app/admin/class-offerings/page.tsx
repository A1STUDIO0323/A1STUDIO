"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw, Loader2, Edit, X, Users, CheckCircle2, XCircle, UserX } from "lucide-react";
import { ADMIN_PASSWORD_SESSION_KEY, useAdmin } from "@/lib/admin-context";
import { AdminGate } from "@/components/admin/AdminGate";
import HourDateTimePicker from "@/components/class-offerings/HourDateTimePicker";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "초안",
  OPEN: "모집 중",
  CLOSED: "마감",
  CANCELLED: "취소",
  COMPLETED: "완료",
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: "text-[#6f655d] bg-[#EFE7DA]",
  OPEN: "text-emerald-600 bg-emerald-50",
  CLOSED: "text-amber-600 bg-amber-50",
  CANCELLED: "text-red-600 bg-red-50",
  COMPLETED: "text-blue-600 bg-blue-50",
};
const SUBJECT_LABELS: Record<string, string> = {
  vocal: "보컬", dance: "댄스", act: "연기", musical: "뮤지컬", etc: "기타",
};

type Offering = {
  id: string;
  type: "oneday" | "lesson";
  cm_user_id: string | null;
  title: string;
  description: string | null;
  subject: string | null;
  duration_minutes: number;
  capacity: number;
  price_points: number;
  scheduled_at: string | null;
  status: keyof typeof STATUS_LABEL;
  created_at: string;
  cm: { id: string; name: string | null; email: string | null } | null;
  _count: { enrollments: number };
};

type CmOption = {
  user_id: string;
  display_name: string;
  subjects: string[];
  is_public: boolean;
  user: { name: string | null; email: string | null };
};

function adminHeaders(): HeadersInit {
  const pw =
    typeof window !== "undefined"
      ? sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) ?? ""
      : "";
  return { "Content-Type": "application/json", "x-admin-password": pw };
}

export default function AdminClassOfferingsPage() {
  const { isAdmin } = useAdmin();

  const [filterType, setFilterType] = useState<"all" | "oneday" | "lesson">("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [items, setItems] = useState<Offering[]>([]);
  const [cms, setCms] = useState<CmOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Offering | null>(null);
  const [enrollmentsTarget, setEnrollmentsTarget] = useState<Offering | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("type", filterType);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const url = `/api/admin/class-offerings${params.toString() ? `?${params}` : ""}`;
      const [r1, r2] = await Promise.all([
        fetch(url, { headers: adminHeaders(), cache: "no-store" }),
        fetch("/api/admin/cm-list", { headers: adminHeaders(), cache: "no-store" }),
      ]);
      const d1 = await r1.json();
      const d2 = await r2.json();
      setItems(r1.ok ? (d1.offerings ?? []) : []);
      setCms(r2.ok ? (d2.cms ?? []) : []);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (!isAdmin) return <AdminGate />;

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-10 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#3B342F]">클래스/레슨 상품 관리</h1>
          <div className="flex gap-2">
            <button
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8CCBC] bg-white px-3 py-2 text-sm text-[#6f655d] hover:bg-[#EFE7DA]"
            >
              <RefreshCw className="w-4 h-4" />
              새로고침
            </button>
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#B98768] px-4 py-2 text-sm font-bold text-white hover:bg-[#a9785c]"
            >
              <Plus className="w-4 h-4" />
              새 상품
            </button>
          </div>
        </div>

        {/* 필터 */}
        <div className="mb-4 flex flex-wrap gap-2">
          {(["all", "oneday", "lesson"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                filterType === t ? "bg-[#B98768] text-white" : "border border-[#D8CCBC] bg-white text-[#6f655d]"
              }`}
            >
              {t === "all" ? "전체 유형" : t === "oneday" ? "원데이클래스" : "개인레슨"}
            </button>
          ))}
          <span className="mx-1 text-[#D8CCBC]">|</span>
          {(["all", "DRAFT", "OPEN", "CLOSED", "CANCELLED", "COMPLETED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                filterStatus === s ? "bg-[#B98768] text-white" : "border border-[#D8CCBC] bg-white text-[#6f655d]"
              }`}
            >
              {s === "all" ? "전체 상태" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#B98768]" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D8CCBC] bg-white p-12 text-center text-sm text-[#9b9189]">
            등록된 상품이 없습니다. 우측 상단 &quot;새 상품&quot;으로 등록해주세요.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#D8CCBC] bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-[#D8CCBC] bg-[#EFE7DA]">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-[#3B342F]">유형</th>
                  <th className="px-3 py-3 text-left font-semibold text-[#3B342F]">제목 / CM</th>
                  <th className="px-3 py-3 text-left font-semibold text-[#3B342F]">분야</th>
                  <th className="px-3 py-3 text-right font-semibold text-[#3B342F]">가격</th>
                  <th className="px-3 py-3 text-center font-semibold text-[#3B342F]">정원</th>
                  <th className="px-3 py-3 text-center font-semibold text-[#3B342F]">신청</th>
                  <th className="px-3 py-3 text-left font-semibold text-[#3B342F]">일정</th>
                  <th className="px-3 py-3 text-center font-semibold text-[#3B342F]">상태</th>
                  <th className="px-3 py-3 text-center font-semibold text-[#3B342F]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8CCBC]/40">
                {items.map((o) => (
                  <tr key={o.id}>
                    <td className="px-3 py-3 text-[#3B342F]">
                      <span className={`rounded px-2 py-0.5 text-xs ${o.type === "oneday" ? "bg-[#B98768]/20 text-[#B98768]" : "bg-emerald-50 text-emerald-700"}`}>
                        {o.type === "oneday" ? "원데이" : "레슨"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-[#3B342F]">{o.title}</p>
                      <p className="text-xs text-[#9b9189]">
                        CM: {o.cm?.name ?? o.cm?.email ?? "미지정"}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-xs text-[#6f655d]">
                      {o.subject ? SUBJECT_LABELS[o.subject] ?? o.subject : "-"}
                    </td>
                    <td className="px-3 py-3 text-right text-[#3B342F]">
                      {o.price_points.toLocaleString("ko-KR")}P
                    </td>
                    <td className="px-3 py-3 text-center text-[#6f655d]">{o.capacity}</td>
                    <td className="px-3 py-3 text-center text-[#6f655d]">{o._count.enrollments}</td>
                    <td className="px-3 py-3 text-xs text-[#6f655d]">
                      {o.scheduled_at ? new Date(o.scheduled_at).toLocaleString("ko-KR") : "미정"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[o.status] ?? ""}`}>
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEnrollmentsTarget(o)}
                          className="rounded p-1.5 hover:bg-[#EFE7DA]"
                          title="신청자"
                        >
                          <Users className="w-4 h-4 text-[#6f655d]" />
                        </button>
                        <button
                          onClick={() => { setEditing(o); setShowForm(true); }}
                          className="rounded p-1.5 hover:bg-[#EFE7DA]"
                          title="편집"
                        >
                          <Edit className="w-4 h-4 text-[#6f655d]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <OfferingFormModal
          offering={editing}
          cms={cms}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); void load(); }}
        />
      )}

      {enrollmentsTarget && (
        <EnrollmentsModal
          offering={enrollmentsTarget}
          onClose={() => setEnrollmentsTarget(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}

function OfferingFormModal({
  offering,
  cms,
  onClose,
  onSaved,
}: {
  offering: Offering | null;
  cms: CmOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<"oneday" | "lesson">(offering?.type ?? "oneday");
  const [cmUserId, setCmUserId] = useState(offering?.cm_user_id ?? "");
  const [title, setTitle] = useState(offering?.title ?? "");
  const [description, setDescription] = useState(offering?.description ?? "");
  const [subject, setSubject] = useState(offering?.subject ?? "");
  const [durationMinutes, setDurationMinutes] = useState(offering?.duration_minutes ?? 60);
  const [capacity, setCapacity] = useState(offering?.capacity ?? (offering?.type === "lesson" ? 1 : 8));
  const [pricePoints, setPricePoints] = useState(offering?.price_points ?? 20000);
  const [scheduledAt, setScheduledAt] = useState(
    offering?.scheduled_at ? new Date(offering.scheduled_at).toISOString().slice(0, 16) : ""
  );
  const [status, setStatus] = useState(offering?.status ?? "DRAFT");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        type,
        cm_user_id: cmUserId || null,
        title,
        description,
        subject: subject || null,
        duration_minutes: Number(durationMinutes),
        capacity: Number(capacity),
        price_points: Number(pricePoints),
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        status,
      };
      const url = offering
        ? `/api/admin/class-offerings/${offering.id}`
        : "/api/admin/class-offerings";
      const res = await fetch(url, {
        method: offering ? "PATCH" : "POST",
        headers: adminHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "저장 실패");
        return;
      }
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!offering) return;
    if (!confirm("이 상품을 삭제하시겠습니까? 신청이 있는 상품은 삭제되지 않습니다.")) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/class-offerings/${offering.id}`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "삭제 실패");
        return;
      }
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 my-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#3B342F]">
            {offering ? "상품 수정" : "새 상품 등록"}
          </h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-[#EFE7DA]">
            <X className="w-5 h-5 text-[#6f655d]" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="유형" required>
            <div className="flex gap-2">
              {(["oneday", "lesson"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-xl border-2 px-4 py-2 text-sm font-semibold ${
                    type === t ? "border-[#B98768] bg-[#f5ede6] text-[#B98768]" : "border-[#D8CCBC] bg-white text-[#6f655d]"
                  }`}
                >
                  {t === "oneday" ? "원데이클래스" : "개인레슨"}
                </button>
              ))}
            </div>
          </Field>

          <Field label="CM (선택)">
            <select
              value={cmUserId}
              onChange={(e) => setCmUserId(e.target.value)}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none"
            >
              <option value="">미지정</option>
              {cms.map((c) => (
                <option key={c.user_id} value={c.user_id}>
                  {c.display_name} ({c.user.email ?? "이메일 없음"})
                </option>
              ))}
            </select>
          </Field>

          <Field label="제목" required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none"
              placeholder="예: 뮤지컬 발성 입문 클래스"
            />
          </Field>

          <Field label="설명">
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="분야">
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none"
              >
                <option value="">선택</option>
                {Object.entries(SUBJECT_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="진행시간 (분)">
              <input
                type="number"
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={type === "lesson" ? "정원 (1)" : "정원"}>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none"
              />
            </Field>
            <Field label="1인당 가격 (포인트)" required>
              <input
                type="number"
                min={0}
                value={pricePoints}
                onChange={(e) => setPricePoints(Number(e.target.value))}
                className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none"
              />
            </Field>
          </div>

          <Field label={type === "lesson" ? "예정일시 (선택, 매칭 후 지정 가능)" : "수업 일시"}>
            <HourDateTimePicker
              value={scheduledAt}
              onChange={setScheduledAt}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none"
            />
          </Field>

          <Field label="상태">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Offering["status"])}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none"
            >
              {Object.entries(STATUS_LABEL).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[#9b9189]">
              DRAFT는 비공개. OPEN으로 변경하면 사용자 신청이 가능해집니다.
            </p>
          </Field>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {offering && (
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                삭제
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="rounded-lg border border-[#D8CCBC] bg-white px-4 py-2 text-sm font-semibold text-[#6f655d] hover:bg-[#EFE7DA]"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !title}
              className="rounded-lg bg-[#B98768] px-6 py-2 text-sm font-bold text-white hover:bg-[#a9785c] disabled:opacity-50"
            >
              {submitting ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[#3B342F] mb-1.5">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

// ===== 신청자 처리 모달 =====
const ENROLL_STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  HELD: "진행 예정",
  COMPLETED: "완료",
  CANCELLED: "취소",
  REFUNDED: "환불",
  NO_SHOW: "노쇼",
};
const ENROLL_STATUS_COLOR: Record<string, string> = {
  PENDING: "text-[#6f655d] bg-[#EFE7DA]",
  HELD: "text-amber-700 bg-amber-50",
  COMPLETED: "text-emerald-700 bg-emerald-50",
  CANCELLED: "text-red-600 bg-red-50",
  REFUNDED: "text-blue-600 bg-blue-50",
  NO_SHOW: "text-purple-700 bg-purple-50",
};

type AdminEnrollment = {
  id: string;
  status: keyof typeof ENROLL_STATUS_LABEL;
  points_held: number;
  points_used: number;
  points_refunded: number;
  request_note: string | null;
  enrolled_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  user: { id: string; name: string | null; email: string | null; phone: string | null };
};

function EnrollmentsModal({
  offering,
  onClose,
  onChanged,
}: {
  offering: Offering;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<AdminEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/class-offerings/${offering.id}/enrollments`, {
        headers: adminHeaders(),
        cache: "no-store",
      });
      const data = await res.json();
      setItems(res.ok ? (data.enrollments ?? []) : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offering.id]);

  const action = async (id: string, op: "complete" | "cancel" | "no_show") => {
    const labels = { complete: "완료 처리", cancel: "취소 + 포인트 환불", no_show: "노쇼 처리" };
    let reason = "";
    if (op === "cancel") {
      const r = prompt("취소 사유 (선택):", "") ?? "";
      reason = r;
    }
    if (!confirm(`이 신청을 [${labels[op]}] 하시겠습니까?`)) return;

    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/class-enrollments/${id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ action: op, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "처리 실패");
        return;
      }
      await load();
      onChanged();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 my-8">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#3B342F]">{offering.title}</h2>
            <p className="text-xs text-[#6f655d] mt-0.5">
              신청자 {items.length}명 · 정원 {offering.capacity}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-[#EFE7DA]">
            <X className="w-5 h-5 text-[#6f655d]" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#B98768]" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D8CCBC] bg-[#F7F3EB] p-8 text-center text-sm text-[#9b9189]">
            신청자가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((e) => (
              <div key={e.id} className="rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-[#3B342F]">
                        {e.user.name ?? e.user.email ?? "회원"}
                      </p>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${ENROLL_STATUS_COLOR[e.status]}`}>
                        {ENROLL_STATUS_LABEL[e.status]}
                      </span>
                    </div>
                    <p className="text-xs text-[#9b9189]">
                      {e.user.email ?? "-"} · {e.user.phone ?? "전화번호 미등록"}
                    </p>
                    <p className="text-xs text-[#9b9189] mt-0.5">
                      신청 {new Date(e.enrolled_at).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <div className="text-right text-xs text-[#6f655d] shrink-0">
                    <p>HOLD {e.points_held.toLocaleString("ko-KR")}P</p>
                    <p>USED {e.points_used.toLocaleString("ko-KR")}P</p>
                    {e.points_refunded > 0 && (
                      <p>환불 {e.points_refunded.toLocaleString("ko-KR")}P</p>
                    )}
                  </div>
                </div>

                {e.request_note && (
                  <div className="rounded-lg bg-white p-3 text-xs text-[#3B342F] mb-2">
                    <p className="font-semibold mb-0.5 text-[#9b9189]">신청자 메모</p>
                    <p className="whitespace-pre-line">{e.request_note}</p>
                  </div>
                )}

                {e.cancelled_reason && (
                  <p className="text-xs text-red-600 mb-2">취소 사유: {e.cancelled_reason}</p>
                )}

                {e.status === "HELD" && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={busyId === e.id}
                      onClick={() => action(e.id, "complete")}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      수업 완료
                    </button>
                    <button
                      disabled={busyId === e.id}
                      onClick={() => action(e.id, "cancel")}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      취소 + 환불
                    </button>
                    <button
                      disabled={busyId === e.id}
                      onClick={() => action(e.id, "no_show")}
                      className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      노쇼
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs text-[#9b9189] leading-relaxed">
          · 수업 완료 시 포인트가 사용 확정되며, CM이 지정된 상품은 정산 행이 자동 생성됩니다.<br />
          · 취소 시 신청 시점 포인트가 환불되고, 노쇼는 환불 없이 정산만 진행됩니다.
        </p>
      </div>
    </div>
  );
}
