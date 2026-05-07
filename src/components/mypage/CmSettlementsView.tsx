"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "검토 대기",
  APPROVED: "이체 대기",
  PAID: "이체 완료",
  FAILED: "이체 실패",
};
const STATUS_COLOR: Record<string, string> = {
  PENDING: "text-amber-700 bg-amber-50",
  APPROVED: "text-blue-700 bg-blue-50",
  PAID: "text-emerald-700 bg-emerald-50",
  FAILED: "text-red-700 bg-red-50",
};

type Settlement = {
  id: string;
  type: "oneday" | "lesson";
  base_amount: number;
  ratio: number;
  amount: number;
  status: keyof typeof STATUS_LABEL;
  approved_at: string | null;
  paid_at: string | null;
  paid_method: string | null;
  created_at: string;
  enrollment: {
    completed_at: string | null;
    offering: { title: string; scheduled_at: string | null };
  };
};

export default function CmSettlementsView() {
  const [items, setItems] = useState<Settlement[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cm/settlements/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setItems(data.settlements ?? []);
        setTotals(data.totals ?? {});
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-[#B98768]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 합계 */}
      <div className="grid gap-3 sm:grid-cols-4">
        {(["PENDING", "APPROVED", "PAID", "FAILED"] as const).map((s) => (
          <div key={s} className="rounded-xl border border-[#D8CCBC] bg-white p-4">
            <p className="text-xs text-[#9b9189] mb-1">{STATUS_LABEL[s]}</p>
            <p className="text-lg font-bold text-[#3B342F]">
              {(totals[s] ?? 0).toLocaleString("ko-KR")}원
            </p>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D8CCBC] bg-white p-10 text-center text-sm text-[#9b9189]">
          정산 내역이 없습니다. 수업이 완료되면 자동으로 생성됩니다.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <div key={s.id} className="rounded-xl border border-[#D8CCBC] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                      s.type === "oneday" ? "bg-[#B98768]/20 text-[#B98768]" : "bg-emerald-50 text-emerald-700"
                    }`}>
                      {s.type === "oneday" ? "원데이" : "레슨"}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[s.status]}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                    <p className="font-semibold text-[#3B342F]">{s.enrollment.offering.title}</p>
                  </div>
                  <p className="text-xs text-[#9b9189]">
                    수업 완료: {s.enrollment.completed_at ? new Date(s.enrollment.completed_at).toLocaleString("ko-KR") : "-"}
                  </p>
                  {s.paid_at && (
                    <p className="text-xs text-emerald-700 mt-0.5">
                      입금 완료 {new Date(s.paid_at).toLocaleString("ko-KR")}
                      {s.paid_method && ` · ${s.paid_method === "manual_transfer" ? "수동 이체" : "자동이체"}`}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-[#9b9189]">
                    {s.base_amount.toLocaleString("ko-KR")}원 × {s.ratio}%
                  </p>
                  <p className="text-base font-bold text-[#B98768]">
                    {s.amount.toLocaleString("ko-KR")}원
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[#9b9189]">
        · 정산은 수업 완료 후 자동 생성되며, A1 STUDIO 검토 → 이체 완료 순으로 진행됩니다.<br />
        · 정산 계좌는 CM 프로필에서 관리할 수 있습니다.
      </p>
    </div>
  );
}
