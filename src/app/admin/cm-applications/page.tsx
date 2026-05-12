"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { RefreshCw, CheckCircle2, XCircle, Pause, Loader2, User as UserIcon } from "lucide-react";
import { ADMIN_PASSWORD_SESSION_KEY, useAdmin } from "@/lib/admin-context";
import { AdminGate } from "@/components/admin/AdminGate";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "HOLD";

const STATUS_LABEL: Record<Status, string> = {
  PENDING: "검토 대기",
  APPROVED: "승인",
  REJECTED: "반려",
  HOLD: "보류",
};

const STATUS_COLOR: Record<Status, string> = {
  PENDING: "text-amber-600 bg-amber-50",
  APPROVED: "text-emerald-600 bg-emerald-50",
  REJECTED: "text-red-600 bg-red-50",
  HOLD: "text-blue-600 bg-blue-50",
};

const SUBJECT_LABELS: Record<string, string> = {
  vocal: "보컬",
  dance: "댄스",
  act: "연기",
  musical: "뮤지컬",
  etc: "기타",
};

type Application = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  field: string;
  intro: string;
  career: string;
  portfolio_url: string | null;
  profile_image: string | null;
  can_oneday: boolean;
  can_lesson: boolean;
  subjects: string[];
  status: Status;
  admin_memo: string | null;
  created_at: string;
  reviewed_at: string | null;
  user: { id: string; email: string | null; name: string | null };
};

function adminHeaders(): HeadersInit {
  const pw =
    typeof window !== "undefined"
      ? sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) ?? ""
      : "";
  return { "Content-Type": "application/json", "x-admin-password": pw };
}

export default function AdminCmApplicationsPage() {
  const { isAdmin } = useAdmin();
  const [filter, setFilter] = useState<Status | "ALL">("PENDING");
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === "ALL"
        ? "/api/admin/cm-applications"
        : `/api/admin/cm-applications?status=${filter}`;
      const res = await fetch(url, { headers: adminHeaders(), cache: "no-store" });
      const data = await res.json();
      if (res.ok) setItems(data.applications ?? []);
      else setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin, load]);

  const handleAction = async (id: string, status: "APPROVED" | "REJECTED" | "HOLD") => {
    if (status === "APPROVED" && !confirm("이 신청을 승인하시겠습니까?\n\n승인 시:\n- CM 권한이 부여됩니다\n- 비공개 상태로 cm_profiles가 자동 생성됩니다\n- 신청자가 마이페이지에서 공개 프로필을 완성할 수 있습니다")) {
      return;
    }
    if (status === "REJECTED" && !confirm("이 신청을 반려하시겠습니까?\n반려 사유는 메모에 작성됩니다.")) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/cm-applications/${id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ status, admin_memo: memo }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "처리 실패");
        return;
      }
      setOpenId(null);
      setMemo("");
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) return <AdminGate />;

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-10 px-4">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#3B342F]">CM 신청 관리</h1>
          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 text-sm text-[#6f655d] hover:text-[#B98768]"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          {(["PENDING", "HOLD", "APPROVED", "REJECTED", "ALL"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                filter === s
                  ? "bg-[#B98768] text-white"
                  : "border border-[#D8CCBC] bg-white text-[#6f655d]"
              }`}
            >
              {s === "ALL" ? "전체" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#B98768]" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D8CCBC] bg-white p-12 text-center text-sm text-[#9b9189]">
            해당 상태의 신청이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((app) => {
              const isOpen = openId === app.id;
              return (
              <div key={app.id} className="rounded-2xl border border-[#D8CCBC] bg-white p-5">
                {/* 컴팩트 헤더 (접힌 상태에서도 보임) */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold shrink-0 ${STATUS_COLOR[app.status]}`}>
                      {STATUS_LABEL[app.status]}
                    </span>
                    <span className="text-xs text-[#9b9189] shrink-0">
                      {new Date(app.created_at).toLocaleString("ko-KR")}
                    </span>
                    {!isOpen && (
                      <span className="truncate text-sm font-semibold text-[#3B342F]">
                        {app.name} · {app.field}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setOpenId(isOpen ? null : app.id);
                      setMemo(app.admin_memo ?? "");
                    }}
                    className="shrink-0 text-xs text-[#B98768] hover:underline"
                  >
                    {isOpen ? "접기" : "상세"}
                  </button>
                </div>

                {isOpen && (
                  <div className="space-y-5 rounded-xl bg-[#F7F3EB] p-5">
                    {/* === 상단: 프로필 사진 + 기본 정보 (이력서 스타일) === */}
                    <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-[#D8CCBC] bg-white">
                        {app.profile_image ? (
                          <a
                            href={app.profile_image}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block h-full w-full"
                            title="원본 보기"
                          >
                            <Image
                              src={app.profile_image}
                              alt={app.name}
                              fill
                              sizes="160px"
                              className="object-cover"
                            />
                          </a>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <UserIcon className="w-10 h-10 text-[#b0a89e]" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <ResumeRow label="이름">{app.name}</ResumeRow>
                        <ResumeRow label="연락처">{app.phone}</ResumeRow>
                        <ResumeRow label="이메일">{app.user.email ?? "-"}</ResumeRow>
                        <ResumeRow label="활동 분야">{app.field}</ResumeRow>
                      </div>
                    </div>

                    {/* === 가능 수업 유형 (강조 영역) === */}
                    <div className="border-y border-[#D8CCBC] -mx-5 px-5 py-4">
                      <p className="text-xs font-semibold text-[#9b9189] uppercase mb-2">가능한 수업 유형</p>
                      <div className="flex gap-2">
                        <Pill active={app.can_oneday}>원데이클래스</Pill>
                        <Pill active={app.can_lesson}>개인레슨</Pill>
                      </div>
                    </div>

                    {/* === 수업 분야 / 소개 / 경력 / 포트폴리오 === */}
                    <ResumeBlock label="수업 가능 분야">
                      {app.subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {app.subjects.map((s) => (
                            <span key={s} className="rounded-full bg-[#B98768]/15 px-2.5 py-0.5 text-xs font-semibold text-[#B98768]">
                              {SUBJECT_LABELS[s] ?? s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </ResumeBlock>

                    <ResumeBlock label="소개글">
                      <p className="whitespace-pre-line text-sm text-[#3B342F]">{app.intro}</p>
                    </ResumeBlock>

                    <ResumeBlock label="주요 경력">
                      <p className="whitespace-pre-line text-sm text-[#3B342F]">{app.career}</p>
                    </ResumeBlock>

                    {app.portfolio_url && (
                      <ResumeBlock label="포트폴리오">
                        <a
                          href={app.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#B98768] hover:underline break-all"
                        >
                          {app.portfolio_url}
                        </a>
                      </ResumeBlock>
                    )}

                    {app.reviewed_at && (
                      <ResumeBlock label="검토일">
                        <p className="text-sm text-[#3B342F]">
                          {new Date(app.reviewed_at).toLocaleString("ko-KR")}
                        </p>
                      </ResumeBlock>
                    )}

                    {app.admin_memo && app.status !== "PENDING" && (
                      <ResumeBlock label="저장된 메모">
                        <p className="whitespace-pre-line text-sm text-[#3B342F]">{app.admin_memo}</p>
                      </ResumeBlock>
                    )}

                    {(app.status === "PENDING" || app.status === "HOLD") && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-[#3B342F] mb-1">
                            관리자 메모 (반려/보류 사유)
                          </label>
                          <textarea
                            rows={2}
                            value={memo}
                            onChange={(e) => setMemo(e.target.value)}
                            className="w-full rounded-lg border border-[#D8CCBC] bg-white px-3 py-2 text-sm focus:border-[#B98768] focus:outline-none resize-none"
                            placeholder="신청자에게 안내될 내용 (선택)"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            disabled={submitting}
                            onClick={() => handleAction(app.id, "APPROVED")}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            승인
                          </button>
                          <button
                            disabled={submitting}
                            onClick={() => handleAction(app.id, "HOLD")}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            <Pause className="w-4 h-4" />
                            보류
                          </button>
                          <button
                            disabled={submitting}
                            onClick={() => handleAction(app.id, "REJECTED")}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            반려
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ResumeRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_1fr] items-baseline gap-3">
      <span className="text-xs font-semibold text-[#9b9189]">{label}</span>
      <span className="text-sm text-[#3B342F]">{children}</span>
    </div>
  );
}

function ResumeBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-[#9b9189] mb-1.5">{label}</p>
      <div className="text-sm text-[#3B342F]">{children}</div>
    </div>
  );
}

function Pill({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-xl px-4 py-2 text-sm font-semibold ${
        active
          ? "border-2 border-[#B98768] bg-[#f5ede6] text-[#B98768]"
          : "border-2 border-[#D8CCBC] bg-white text-[#9b9189] line-through opacity-60"
      }`}
    >
      {children}
    </span>
  );
}
