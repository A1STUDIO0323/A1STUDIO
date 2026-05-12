"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Trash2 } from "lucide-react";
import { useAdmin } from "@/lib/admin-context";
import { AdminGate } from "@/components/admin/AdminGate";
import { classRequestStore, type LocalClassRequest } from "@/lib/local-store";

export default function AdminClassRequestsPage() {
  const { isAdmin, adminLogout } = useAdmin();
  const [requests, setRequests] = useState<LocalClassRequest[]>([]);

  const load = () => {
    setRequests(classRequestStore.getAll());
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin]);

  if (!isAdmin) return <AdminGate />;

  return (
    <div className="min-h-screen bg-[#F7F3EB]">
      <div className="border-b border-[#D8CCBC] bg-[#EFE7DA] px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#3B342F]">클래스 요청 관리</h1>
            <Link
              href="/admin"
              className="rounded-lg border border-[#D8CCBC] px-2.5 py-1 text-xs text-[#6f655d] hover:text-[#B98768]"
            >
              관리자 홈
            </Link>
          </div>
          <button onClick={adminLogout} className="text-sm text-[#6f655d] transition-colors hover:text-[#B98768]">
            로그아웃
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-[#6f655d]">
            접수된 요청 <span className="font-semibold text-[#3B342F]">{requests.length}건</span>
          </p>
          <button
            onClick={load}
            className="inline-flex items-center gap-1 rounded-lg border border-[#D8CCBC] px-3 py-1.5 text-xs text-[#6f655d] hover:text-[#B98768]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            새로고침
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] px-4 py-10 text-center text-sm text-[#9b9189]">
            접수된 원데이클래스 요청이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="rounded-xl border border-[#D8CCBC] bg-[#EFE7DA] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                        {req.genre}
                      </span>
                      <span className="text-xs text-[#9b9189]">
                        {new Date(req.createdAt).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-[#6f655d] sm:grid-cols-2">
                      <span>
                        <span className="text-[#9b9189]">요청자</span> {req.userName}
                      </span>
                      <span className="truncate">
                        <span className="text-[#9b9189]">이메일</span> {req.userEmail || "-"}
                      </span>
                      <span>
                        <span className="text-[#9b9189]">시간</span> {req.preferredTime}
                      </span>
                      <span>
                        <span className="text-[#9b9189]">요일</span> {req.preferredDays.join(", ") || "-"}
                      </span>
                      <span className="sm:col-span-2">
                        <span className="text-[#9b9189]">날짜</span> {req.preferredDates || "-"}
                      </span>
                    </div>
                    {req.message && (
                      <p className="mt-2 rounded-lg bg-[#F7F3EB]/70 px-3 py-2 text-xs text-[#6f655d]">{req.message}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      classRequestStore.delete(req.id);
                      load();
                    }}
                    className="shrink-0 rounded-lg p-1.5 text-[#9b9189] transition-colors hover:bg-red-50 hover:text-red-500"
                    title="요청 삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
