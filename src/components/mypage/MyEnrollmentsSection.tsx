"use client";

import { useEffect, useState } from "react";
import { Loader2, GraduationCap } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "대기",
  HELD: "진행 예정",
  COMPLETED: "완료",
  CANCELLED: "취소",
  REFUNDED: "환불",
  NO_SHOW: "노쇼",
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: "text-[#6f655d] bg-[#EFE7DA]",
  HELD: "text-amber-700 bg-amber-50",
  COMPLETED: "text-emerald-700 bg-emerald-50",
  CANCELLED: "text-red-600 bg-red-50",
  REFUNDED: "text-blue-600 bg-blue-50",
  NO_SHOW: "text-purple-700 bg-purple-50",
};

type Enrollment = {
  id: string;
  status: keyof typeof STATUS_LABEL;
  points_held: number;
  points_used: number;
  points_refunded: number;
  enrolled_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  request_note: string | null;
  offering: {
    id: string;
    type: "oneday" | "lesson";
    title: string;
    subject: string | null;
    duration_minutes: number;
    scheduled_at: string | null;
    status: string;
  };
};

export default function MyEnrollmentsSection() {
  const [items, setItems] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/class-enrollments/me", { cache: "no-store" });
      const data = await res.json();
      setItems(res.ok ? (data.enrollments ?? []) : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm("이 신청을 취소하시겠습니까? 신청 시 차감된 포인트가 환불됩니다.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/class-enrollments/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "취소 실패");
        return;
      }
      alert("취소 완료. 포인트가 환불되었습니다.");
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-[#B98768]" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D8CCBC] bg-white p-10 text-center">
        <GraduationCap className="w-8 h-8 text-[#9b9189] mx-auto mb-2" />
        <p className="text-sm text-[#6f655d]">아직 신청한 클래스/레슨이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((e) => (
        <div key={e.id} className="rounded-2xl border border-[#D8CCBC] bg-white p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                  e.offering.type === "oneday" ? "bg-[#B98768]/20 text-[#B98768]" : "bg-emerald-50 text-emerald-700"
                }`}>
                  {e.offering.type === "oneday" ? "원데이" : "레슨"}
                </span>
                <h3 className="font-bold text-[#3B342F]">{e.offering.title}</h3>
                <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[e.status]}`}>
                  {STATUS_LABEL[e.status]}
                </span>
              </div>
              <p className="text-xs text-[#6f655d]">
                {e.offering.scheduled_at
                  ? new Date(e.offering.scheduled_at).toLocaleString("ko-KR")
                  : "일정 매칭 예정"} · {e.offering.duration_minutes}분
              </p>
              <p className="text-xs text-[#9b9189] mt-1">
                신청 {new Date(e.enrolled_at).toLocaleString("ko-KR")}
              </p>
            </div>
            <div className="text-right text-xs text-[#6f655d] shrink-0">
              {e.points_held > 0 && <p>HOLD {e.points_held.toLocaleString("ko-KR")}P</p>}
              {e.points_used > 0 && <p>사용 확정 {e.points_used.toLocaleString("ko-KR")}P</p>}
              {e.points_refunded > 0 && <p className="text-blue-600">환불 {e.points_refunded.toLocaleString("ko-KR")}P</p>}
            </div>
          </div>

          {e.request_note && (
            <div className="rounded-lg bg-[#F7F3EB] p-2.5 text-xs text-[#3B342F] mb-2">
              <p className="text-[#9b9189] font-semibold mb-0.5">내 메모</p>
              <p className="whitespace-pre-line">{e.request_note}</p>
            </div>
          )}

          {e.cancelled_reason && (
            <p className="text-xs text-red-600 mb-2">취소 사유: {e.cancelled_reason}</p>
          )}

          {e.status === "HELD" && (
            <div className="flex justify-end">
              <button
                disabled={busyId === e.id}
                onClick={() => handleCancel(e.id)}
                className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {busyId === e.id ? "처리 중..." : "신청 취소"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
