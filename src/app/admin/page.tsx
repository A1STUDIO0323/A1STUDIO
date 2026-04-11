"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Users, DollarSign, AlertCircle, Filter, CheckCircle2, XCircle, Lock } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { useAdmin } from "@/lib/admin-context";

type Status = "HOLD" | "PAID" | "CANCELLED" | "EXPIRED";
const STATUS_LABEL: Record<Status, string> = { HOLD: "홀드", PAID: "결제완료", CANCELLED: "취소", EXPIRED: "만료" };
const STATUS_COLOR: Record<Status, string> = {
  HOLD: "text-amber-500 bg-yellow-950/40",
  PAID: "text-emerald-400 bg-emerald-50",
  CANCELLED: "text-red-400 bg-red-50",
  EXPIRED: "text-[#6f655d] bg-[#F7F3EB]",
};

type AdminReservation = {
  id: string;
  guestName: string;
  guestPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  roomId: string;
  totalAmount: number;
  status: Status;
};

type DashboardStats = {
  monthReservationCount: number;
  totalPaidAmount: number;
  holdCount: number;
  uniqueGuestCount: number;
};

const TABS = ["예약 관리", "시간 블록", "요금 관리", "후기 관리", "공지 관리"];

export default function AdminPage() {
  const { isAdmin, adminLogin, adminLogout } = useAdmin();
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [filterStatus, setFilterStatus] = useState<Status | "ALL">("ALL");
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    monthReservationCount: 0,
    totalPaidAmount: 0,
    holdCount: 0,
    uniqueGuestCount: 0,
  });
  const [reservations, setReservations] = useState<AdminReservation[]>([]);

  const loadDashboard = async () => {
    try {
      setDashboardLoading(true);
      const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
      const data = (await res.json()) as {
        stats?: DashboardStats;
        reservations?: AdminReservation[];
      };
      setStats(data.stats ?? {
        monthReservationCount: 0,
        totalPaidAmount: 0,
        holdCount: 0,
        uniqueGuestCount: 0,
      });
      setReservations(data.reservations ?? []);
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void loadDashboard();
  }, [isAdmin]);
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F3EB] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 text-center">
          <Lock className="mx-auto mb-4 h-10 w-10 text-[#B98768]" />
          <h1 className="text-xl font-bold text-[#3B342F]">관리자 로그인</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setLoginError("");
            }}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                if (await adminLogin(password)) {
                  setPassword("");
                  setLoginError("");
                } else {
                  setLoginError("비밀번호가 올바르지 않습니다.");
                }
              }
            }}
            placeholder="관리자 비밀번호 입력"
            className="mt-5 w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] placeholder:text-[#b0a89e] focus:border-[#B98768] focus:outline-none"
          />
          {loginError && <p className="mt-2 text-xs text-red-400">{loginError}</p>}
          <button
            onClick={async () => {
              if (await adminLogin(password)) {
                setPassword("");
                setLoginError("");
              } else {
                setLoginError("비밀번호가 올바르지 않습니다.");
              }
            }}
            className="mt-3 w-full rounded-xl bg-[#B98768] py-3 text-sm font-bold text-[#F7F3EB] hover:bg-[#a9785c] transition-all"
          >
            로그인
          </button>
        </div>
      </div>
    );
  }

  const filtered = filterStatus === "ALL"
    ? reservations
    : reservations.filter((r) => r.status === filterStatus);

  const statsCards = [
    { label: "이번 달 예약", value: `${stats.monthReservationCount}건`, icon: CalendarCheck, color: "text-[#B98768]" },
    { label: "총 매출", value: formatPrice(stats.totalPaidAmount), icon: DollarSign, color: "text-emerald-400" },
    { label: "대기 중 홀드", value: `${stats.holdCount}건`, icon: AlertCircle, color: "text-amber-500" },
    { label: "총 고객", value: `${stats.uniqueGuestCount}명`, icon: Users, color: "text-blue-400" },
  ];

  return (
    <div className="min-h-screen bg-[#F7F3EB]">
      {/* 관리자 헤더 */}
      <div className="border-b border-[#D8CCBC] bg-[#EFE7DA] px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-xl font-bold text-[#3B342F]">관리자 대시보드</h1>
          <button onClick={adminLogout} className="text-sm text-[#6f655d] hover:text-[#B98768] transition-colors">
            로그아웃
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 통계 카드 */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          {statsCards.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-[#D8CCBC] bg-[#EFE7DA] p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#6f655d]">{stat.label}</p>
                <stat.icon className={cn("h-5 w-5", stat.color)} />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[#3B342F]">
                {dashboardLoading ? "..." : stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-[#D8CCBC] bg-[#EFE7DA] p-1">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={cn(
                "shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                activeTab === i ? "bg-[#B98768] text-[#F7F3EB]" : "text-[#6f655d] hover:text-[#B98768]"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 예약 관리 탭 */}
        {activeTab === 0 && (
          <div>
            {/* 필터 */}
            <div className="mb-4 flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#6f655d]" />
              {(["ALL", "PAID", "HOLD", "CANCELLED", "EXPIRED"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-all",
                    filterStatus === s ? "bg-[#B98768] text-[#F7F3EB]" : "border border-[#D8CCBC] text-[#6f655d] hover:border-[#D8CCBC]"
                  )}
                >
                  {s === "ALL" ? "전체" : STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            <div className="mb-3 flex justify-end">
              <button onClick={() => void loadDashboard()} className="text-xs text-[#9b9189] hover:text-[#3B342F]">
                새로고침
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#D8CCBC]">
              <table className="w-full text-sm">
                <thead className="border-b border-[#D8CCBC] bg-[#EFE7DA]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">예약번호</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">예약자</th>
                    <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">날짜/시간</th>
                    <th className="px-4 py-3 text-right font-semibold text-[#3B342F]">금액</th>
                    <th className="px-4 py-3 text-center font-semibold text-[#3B342F]">상태</th>
                    <th className="px-4 py-3 text-center font-semibold text-[#3B342F]">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-[#F7F3EB]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-[#9b9189]">
                        예약 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : filtered.map((res) => (
                    <tr key={res.id} className="hover:bg-[#EFE7DA]/2 transition-colors">
                      <td className="px-4 py-3 text-xs text-[#9b9189]">{res.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#3B342F]">{res.guestName}</p>
                        <p className="text-xs text-[#9b9189]">{res.guestPhone}</p>
                      </td>
                      <td className="px-4 py-3 text-[#6f655d]">
                        {res.date}
                        <br />
                        <span className="text-xs">{res.startTime} – {res.endTime}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-[#3B342F]">
                        {formatPrice(res.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_COLOR[res.status])}>
                          {STATUS_LABEL[res.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {res.status === "PAID" && (
                            <button className="rounded-lg bg-red-50 p-1.5 text-red-400 hover:bg-red-100 transition-colors" title="취소/환불">
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          {res.status === "HOLD" && (
                            <button className="rounded-lg bg-emerald-50 p-1.5 text-emerald-400 hover:bg-emerald-100 transition-colors" title="승인">
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 다른 탭들 (플레이스홀더) */}
        {activeTab !== 0 && (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-[#D8CCBC] text-[#b0a89e]">
            {TABS[activeTab]} 기능 구현 예정
          </div>
        )}
      </div>
    </div>
  );
}
