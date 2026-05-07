"use client";

import { useEffect, useState, useCallback } from "react";
import { Lock, RefreshCw, Loader2, CheckCircle2, Banknote, XCircle, RotateCcw } from "lucide-react";
import { ADMIN_PASSWORD_SESSION_KEY, useAdmin } from "@/lib/admin-context";

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
  cm_user_id: string;
  type: "oneday" | "lesson";
  base_amount: number;
  ratio: number;
  amount: number;
  status: keyof typeof STATUS_LABEL;
  approved_at: string | null;
  paid_at: string | null;
  paid_method: string | null;
  paid_memo: string | null;
  failed_reason: string | null;
  created_at: string;
  cm: {
    id: string;
    name: string | null;
    email: string | null;
    cm_profile: {
      display_name: string;
      bank_name: string | null;
      account_number: string | null;
      account_holder: string | null;
    } | null;
  };
  enrollment: {
    id: string;
    status: string;
    completed_at: string | null;
    offering: { id: string; type: string; title: string; scheduled_at: string | null };
    user: { id: string; name: string | null; email: string | null };
  };
};

function adminHeaders(): HeadersInit {
  const pw =
    typeof window !== "undefined"
      ? sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) ?? ""
      : "";
  return { "Content-Type": "application/json", "x-admin-password": pw };
}

export default function AdminSettlementsPage() {
  const { isAdmin, adminLogin } = useAdmin();
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [filterStatus, setFilterStatus] = useState<string>("PENDING");
  const [items, setItems] = useState<Settlement[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(
        `/api/admin/cm-settlements${params.toString() ? `?${params}` : ""}`,
        { headers: adminHeaders(), cache: "no-store" }
      );
      const data = await res.json();
      if (res.ok) {
        setItems(data.settlements ?? []);
        setTotals(data.totals ?? {});
      } else {
        setItems([]);
        setTotals({});
      }
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  const action = async (s: Settlement, op: "approve" | "pay" | "fail" | "reset") => {
    let memo = "";
    let failedReason = "";

    if (op === "pay") {
      const m = prompt(
        `[이체 완료 처리]\n\nCM: ${s.cm.cm_profile?.display_name ?? s.cm.name ?? s.cm.email}\n금액: ${s.amount.toLocaleString("ko-KR")}원\n계좌: ${s.cm.cm_profile?.bank_name ?? "?"} ${s.cm.cm_profile?.account_number ?? "?"} (${s.cm.cm_profile?.account_holder ?? "?"})\n\n이체 메모(선택):`,
        ""
      );
      if (m === null) return;
      memo = m;
    } else if (op === "fail") {
      const r = prompt("실패 사유:", "");
      if (r === null) return;
      failedReason = r;
    } else if (op === "approve") {
      if (!confirm("이 정산을 승인하시겠습니까? (이체 대기 상태로 전환)")) return;
    } else if (op === "reset") {
      if (!confirm("실패한 정산을 다시 이체 대기로 되돌리시겠습니까?")) return;
    }

    setBusyId(s.id);
    try {
      const res = await fetch(`/api/admin/cm-settlements/${s.id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({
          action: op,
          memo,
          failed_reason: failedReason,
          paid_method: "manual_transfer",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "처리 실패");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F3EB] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 text-center">
          <Lock className="mx-auto mb-4 h-10 w-10 text-[#B98768]" />
          <h1 className="text-xl font-bold text-[#3B342F]">관리자 로그인</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setLoginError(""); }}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                if (await adminLogin(password)) setPassword("");
                else setLoginError("비밀번호가 올바르지 않습니다.");
              }
            }}
            placeholder="관리자 비밀번호"
            className="mt-5 w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 focus:border-[#B98768] focus:outline-none"
          />
          {loginError && <p className="mt-2 text-xs text-red-500">{loginError}</p>}
          <button
            onClick={async () => {
              if (await adminLogin(password)) setPassword("");
              else setLoginError("비밀번호가 올바르지 않습니다.");
            }}
            className="mt-3 w-full rounded-xl bg-[#B98768] py-3 text-sm font-bold text-white hover:bg-[#a9785c]"
          >
            로그인
          </button>
        </div>
      </div>
    );
  }

  const totalAmount = Object.values(totals).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-10 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#3B342F]">CM 정산 관리</h1>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8CCBC] bg-white px-3 py-2 text-sm text-[#6f655d] hover:bg-[#EFE7DA]"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
        </div>

        {/* 합계 카드 */}
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          {(["PENDING", "APPROVED", "PAID", "FAILED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-xl border p-4 text-left transition-all ${
                filterStatus === s ? "border-[#B98768] bg-[#f5ede6]" : "border-[#D8CCBC] bg-white"
              }`}
            >
              <p className="text-xs text-[#9b9189] mb-1">{STATUS_LABEL[s]}</p>
              <p className="text-xl font-bold text-[#3B342F]">
                {(totals[s] ?? 0).toLocaleString("ko-KR")}원
              </p>
            </button>
          ))}
        </div>

        {/* 필터 */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(["all", "PENDING", "APPROVED", "PAID", "FAILED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                filterStatus === s ? "bg-[#B98768] text-white" : "border border-[#D8CCBC] bg-white text-[#6f655d]"
              }`}
            >
              {s === "all" ? "전체" : STATUS_LABEL[s]}
            </button>
          ))}
          <span className="ml-auto text-xs text-[#9b9189]">
            현재 표시 합계: {totalAmount.toLocaleString("ko-KR")}원 ({items.length}건)
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#B98768]" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D8CCBC] bg-white p-12 text-center text-sm text-[#9b9189]">
            해당 상태의 정산이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((s) => (
              <div key={s.id} className="rounded-2xl border border-[#D8CCBC] bg-white p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                        s.type === "oneday" ? "bg-[#B98768]/20 text-[#B98768]" : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {s.type === "oneday" ? "원데이" : "레슨"}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[s.status]}`}>
                        {STATUS_LABEL[s.status]}
                      </span>
                      <p className="font-semibold text-[#3B342F]">{s.enrollment.offering.title}</p>
                    </div>
                    <p className="text-xs text-[#6f655d]">
                      CM: {s.cm.cm_profile?.display_name ?? s.cm.name ?? s.cm.email ?? "?"}
                      {" · "}
                      수강자: {s.enrollment.user.name ?? s.enrollment.user.email ?? "?"}
                    </p>
                    <p className="text-xs text-[#9b9189] mt-0.5">
                      수업 완료: {s.enrollment.completed_at ? new Date(s.enrollment.completed_at).toLocaleString("ko-KR") : "-"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[#9b9189]">
                      {s.base_amount.toLocaleString("ko-KR")}원 × {s.ratio}%
                    </p>
                    <p className="text-xl font-bold text-[#B98768]">
                      {s.amount.toLocaleString("ko-KR")}원
                    </p>
                  </div>
                </div>

                {/* 계좌 정보 (수동 이체용) */}
                {(s.status === "APPROVED" || s.status === "FAILED") && (
                  <div className="rounded-lg bg-[#F7F3EB] p-3 text-xs mb-3">
                    <p className="font-semibold text-[#3B342F] mb-1">정산 계좌</p>
                    {s.cm.cm_profile?.bank_name && s.cm.cm_profile?.account_number ? (
                      <p className="text-[#6f655d]">
                        {s.cm.cm_profile.bank_name} {s.cm.cm_profile.account_number} ({s.cm.cm_profile.account_holder ?? "?"})
                      </p>
                    ) : (
                      <p className="text-red-600">계좌 미등록 — CM에게 마이페이지 등록 요청 필요</p>
                    )}
                  </div>
                )}

                {s.paid_at && (
                  <p className="text-xs text-emerald-700 mb-1">
                    이체 완료 {new Date(s.paid_at).toLocaleString("ko-KR")}
                    {s.paid_method && ` · ${s.paid_method === "manual_transfer" ? "수동 이체" : "자동이체"}`}
                  </p>
                )}
                {s.paid_memo && (
                  <p className="text-xs text-[#6f655d] mb-1">메모: {s.paid_memo}</p>
                )}
                {s.failed_reason && (
                  <p className="text-xs text-red-600 mb-1">실패 사유: {s.failed_reason}</p>
                )}

                {/* 액션 버튼 */}
                <div className="flex flex-wrap gap-2">
                  {s.status === "PENDING" && (
                    <button
                      disabled={busyId === s.id}
                      onClick={() => action(s, "approve")}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      승인 (이체 대기)
                    </button>
                  )}
                  {s.status === "APPROVED" && (
                    <>
                      <button
                        disabled={busyId === s.id || !s.cm.cm_profile?.account_number}
                        onClick={() => action(s, "pay")}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        title={!s.cm.cm_profile?.account_number ? "CM 계좌 미등록" : undefined}
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        이체 완료 처리
                      </button>
                      <button
                        disabled={busyId === s.id}
                        onClick={() => action(s, "fail")}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        실패 처리
                      </button>
                    </>
                  )}
                  {s.status === "FAILED" && (
                    <button
                      disabled={busyId === s.id}
                      onClick={() => action(s, "reset")}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      재시도
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-xs text-[#9b9189] leading-relaxed">
          현재는 수동 이체 기준입니다. 추후 지급대행 API/펌뱅킹 연동이 추가되면
          <code className="mx-1">paid_method=&quot;auto_api&quot;</code>로 분기되며, 본 화면의 수동 이체는
          예외/백업 처리용으로 유지됩니다.
        </p>
      </div>
    </div>
  );
}
