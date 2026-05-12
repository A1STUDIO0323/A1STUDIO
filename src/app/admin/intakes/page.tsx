"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ChevronRight, Download, Filter, RefreshCw, Search } from "lucide-react";
import { AdminGate } from "@/components/admin/AdminGate";
import { ADMIN_PASSWORD_SESSION_KEY, useAdmin } from "@/lib/admin-context";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "NEW", label: "신규", color: "bg-violet-100 text-violet-700" },
  { value: "CONSULTING", label: "상담중", color: "bg-amber-100 text-amber-700" },
  { value: "QUOTED", label: "견적발송", color: "bg-blue-100 text-blue-700" },
  { value: "CONTRACTED", label: "계약완료", color: "bg-cyan-100 text-cyan-700" },
  { value: "IN_PROGRESS", label: "진행중", color: "bg-emerald-100 text-emerald-700" },
  { value: "DONE", label: "완료", color: "bg-zinc-200 text-zinc-700" },
  { value: "REJECTED", label: "거절", color: "bg-red-100 text-red-700" },
] as const;

const TIER_LABEL: Record<string, string> = {
  "1": "1단계",
  "2": "2단계",
  "3": "3단계",
  "4": "4단계",
  "5": "5단계",
  unsure: "미정",
};

type Intake = {
  id: string;
  status: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  contact_role: string | null;
  preferred_channel: string | null;
  business_name: string | null;
  business_number: string | null;
  representative: string | null;
  business_address: string | null;
  business_phone: string | null;
  business_email: string | null;
  ecommerce_license: string | null;
  industry: string | null;
  goals: unknown;
  goal_summary: string | null;
  target_tier: string | null;
  brand_logo_status: string | null;
  brand_color_main: string | null;
  brand_color_sub: string | null;
  brand_color_avoid: string | null;
  tone_and_manner: unknown;
  reference_sites: unknown;
  menu_items: unknown;
  intro_text: string | null;
  products: unknown;
  photo_status: string | null;
  faqs: unknown;
  business_hours: string | null;
  closed_days: string | null;
  location: string | null;
  parking: string | null;
  social_links: unknown;
  domain_status: string | null;
  domain_candidates: unknown;
  member_required: string | null;
  signup_methods: unknown;
  signup_fields: unknown;
  member_tiers: string | null;
  booking_unit: string | null;
  booking_duration: string | null;
  booking_capacity: string | null;
  booking_targets: string | null;
  booking_window: string | null;
  booking_max_days: string | null;
  refund_policy: string | null;
  notification_prefs: unknown;
  pg_ready: unknown;
  payment_methods: unknown;
  refund_terms: string | null;
  guest_checkout: string | null;
  admin_operators: string | null;
  admin_features: unknown;
  desired_open_date: string | null;
  deadline: string | null;
  budget_range: string | null;
  payment_split: string | null;
  infra_payer: string | null;
  extra_requests: string | null;
  agreed: boolean;
  admin_memo: string | null;
  source_ip: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
};

function adminHeaders(): HeadersInit {
  const pw = typeof window !== "undefined" ? sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) ?? "" : "";
  return { "Content-Type": "application/json", "x-admin-password": pw };
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function statusMeta(s: string) {
  return STATUSES.find((x) => x.value === s) ?? { label: s, color: "bg-zinc-100 text-zinc-700" };
}

function tierLabel(t: string | null): string {
  if (!t) return "-";
  return TIER_LABEL[t] ?? t;
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "-";
  if (Array.isArray(v)) {
    if (v.length === 0) return "-";
    if (typeof v[0] === "object") return v.map((x) => JSON.stringify(x)).join("\n");
    return (v as unknown[]).join(", ");
  }
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
}

const SOCIAL_LABEL: Record<string, string> = {
  instagram: "인스타그램",
  facebook: "페이스북",
  youtube: "유튜브",
  blog: "네이버 블로그",
  kakao: "카카오톡 채널",
  naver_place: "네이버 플레이스",
  etc: "기타",
};

function asArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function ReferenceSitesView({ value }: { value: unknown }) {
  const sites = asArray<{ url?: string; note?: string }>(value);
  if (sites.length === 0) return <span className="text-[#b0a89e]">-</span>;
  return (
    <div className="space-y-1.5">
      {sites.map((s, i) => (
        <div key={i} className="flex flex-col">
          {s.url && (
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-violet-700 hover:underline break-all">
              🔗 {s.url}
            </a>
          )}
          {s.note && <span className="text-[#6f655d] text-[11px] pl-4">└ {s.note}</span>}
        </div>
      ))}
    </div>
  );
}

function ProductsView({ value }: { value: unknown }) {
  const items = asArray<{ name?: string; description?: string; price?: string; note?: string }>(value);
  if (items.length === 0) return <span className="text-[#b0a89e]">-</span>;
  return (
    <div className="space-y-2">
      {items.map((p, i) => (
        <div key={i} className="rounded-md bg-white/60 border border-[#D8CCBC]/40 p-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-[#3B342F]">{p.name || "(이름 없음)"}</span>
            {p.price && <span className="text-[#B98768] font-medium text-xs whitespace-nowrap">{p.price}</span>}
          </div>
          {p.description && (
            <p className="text-[11px] text-[#6f655d] mt-1 whitespace-pre-wrap">{p.description}</p>
          )}
          {p.note && <p className="text-[10px] text-[#9b9189] mt-0.5">{p.note}</p>}
        </div>
      ))}
    </div>
  );
}

function FaqsView({ value }: { value: unknown }) {
  const faqs = asArray<{ q?: string; a?: string }>(value);
  if (faqs.length === 0) return <span className="text-[#b0a89e]">-</span>;
  return (
    <div className="space-y-2">
      {faqs.map((f, i) => (
        <div key={i} className="rounded-md bg-white/60 border border-[#D8CCBC]/40 p-2">
          {f.q && <p className="text-[#3B342F] font-medium">Q. {f.q}</p>}
          {f.a && <p className="text-[#6f655d] mt-1 whitespace-pre-wrap">A. {f.a}</p>}
        </div>
      ))}
    </div>
  );
}

function SocialLinksView({ value }: { value: unknown }) {
  const links = asArray<{ kind?: string; url?: string }>(value);
  if (links.length === 0) return <span className="text-[#b0a89e]">-</span>;
  return (
    <div className="space-y-1">
      {links.map((s, i) => {
        const label = SOCIAL_LABEL[s.kind ?? ""] ?? s.kind ?? "기타";
        const href = s.url ?? "";
        const isUrl = /^https?:\/\//.test(href);
        return (
          <div key={i} className="flex items-baseline gap-2">
            <span className="text-[#9b9189] text-[11px] w-20 shrink-0">{label}</span>
            {isUrl ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-700 hover:underline break-all">
                {href}
              </a>
            ) : (
              <span className="text-[#3B342F] break-all">{href || "-"}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminIntakesPage() {
  const { isAdmin, adminLogout } = useAdmin();

  const [items, setItems] = useState<Intake[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [memoDraft, setMemoDraft] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/intakes", { cache: "no-store", headers: adminHeaders() });
      const data = (await res.json()) as { items?: Intake[]; error?: string };
      if (!res.ok) {
        console.error("[admin:intakes:client] load_failed", data);
        setError(data.error || "조회 실패");
        return;
      }
      setItems(data.items ?? []);
    } catch (e) {
      console.error("[admin:intakes:client] network_error", e);
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAdmin) return;
    void load();
  }, [isAdmin]);

  async function updateItem(id: string, patch: { status?: string; admin_memo?: string | null }) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/intakes/${id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        console.error("[admin:intakes:client] update_failed", data);
        alert(data.error || "수정 실패");
        return;
      }
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    } catch (e) {
      console.error("[admin:intakes:client] update_error", e);
      alert("수정 중 오류가 발생했습니다");
    } finally {
      setSavingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (filterStatus !== "ALL" && it.status !== filterStatus) return false;
      if (!q) return true;
      return (
        it.contact_name.toLowerCase().includes(q) ||
        it.contact_phone.toLowerCase().includes(q) ||
        it.contact_email.toLowerCase().includes(q) ||
        (it.business_name ?? "").toLowerCase().includes(q) ||
        it.id.toLowerCase().includes(q)
      );
    });
  }, [items, filterStatus, search]);

  const counts = useMemo(() => {
    const out: Record<string, number> = { ALL: items.length };
    for (const s of STATUSES) out[s.value] = 0;
    for (const it of items) out[it.status] = (out[it.status] ?? 0) + 1;
    return out;
  }, [items]);

  function exportCsv() {
    if (filtered.length === 0) {
      alert("내보낼 항목이 없습니다");
      return;
    }
    const headers = [
      "id", "status", "created_at", "contact_name", "contact_phone", "contact_email",
      "business_name", "target_tier", "budget_range", "desired_open_date", "goal_summary", "admin_memo",
    ];
    const escape = (s: unknown) => {
      const str = s === null || s === undefined ? "" : String(s);
      if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };
    const rows = filtered.map((it) =>
      headers.map((h) => escape((it as unknown as Record<string, unknown>)[h])).join(",")
    );
    const csv = "﻿" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intakes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!isAdmin) return <AdminGate />;

  return (
    <div className="min-h-screen bg-[#F7F3EB]">
      <div className="border-b border-[#D8CCBC] bg-[#EFE7DA] px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-[#6f655d] hover:text-[#B98768]">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold text-[#3B342F]">홈페이지 제작 의뢰서</h1>
          </div>
          <button onClick={adminLogout} className="text-sm text-[#6f655d] hover:text-[#B98768]">
            로그아웃
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 필터 */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-[#6f655d]" />
          <button
            onClick={() => setFilterStatus("ALL")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition",
              filterStatus === "ALL" ? "bg-[#B98768] text-[#F7F3EB]" : "border border-[#D8CCBC] text-[#6f655d]"
            )}
          >
            전체 ({counts.ALL ?? 0})
          </button>
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilterStatus(s.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                filterStatus === s.value ? "bg-[#B98768] text-[#F7F3EB]" : "border border-[#D8CCBC] text-[#6f655d]"
              )}
            >
              {s.label} ({counts[s.value] ?? 0})
            </button>
          ))}
        </div>

        {/* 검색 + 액션 */}
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b9189]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름·연락처·이메일·상호 검색"
              className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] py-2 pl-9 pr-3 text-sm text-[#3B342F] placeholder:text-[#b0a89e] focus:border-[#B98768] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void load()}
              className="inline-flex items-center gap-1 rounded-lg border border-[#D8CCBC] bg-[#EFE7DA] px-3 py-2 text-xs text-[#6f655d] hover:text-[#B98768]"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              새로고침
            </button>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1 rounded-lg bg-[#B98768] px-3 py-2 text-xs font-bold text-[#F7F3EB] hover:bg-[#a9785c]"
            >
              <Download className="h-3.5 w-3.5" />
              CSV 내보내기
            </button>
          </div>
        </div>

        {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

        {/* 목록 */}
        <div className="overflow-hidden rounded-2xl border border-[#D8CCBC]">
          <table className="w-full text-sm">
            <thead className="border-b border-[#D8CCBC] bg-[#EFE7DA]">
              <tr>
                <th className="w-8 px-2 py-3"></th>
                <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">접수일시</th>
                <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">상호 / 담당자</th>
                <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">연락처</th>
                <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">단계</th>
                <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">예산</th>
                <th className="px-4 py-3 text-center font-semibold text-[#3B342F]">상태</th>
              </tr>
            </thead>
            <tbody className="bg-[#F7F3EB]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[#9b9189]">
                    {loading ? "불러오는 중..." : "의뢰 데이터가 없습니다."}
                  </td>
                </tr>
              ) : (
                filtered.map((it) => {
                  const open = openId === it.id;
                  const meta = statusMeta(it.status);
                  return (
                    <Fragment key={it.id}>
                      <tr
                        className="cursor-pointer border-t border-[#D8CCBC]/60 hover:bg-[#EFE7DA]/40"
                        onClick={() => {
                          setOpenId(open ? null : it.id);
                          if (!open) setMemoDraft((d) => ({ ...d, [it.id]: it.admin_memo ?? "" }));
                        }}
                      >
                        <td className="w-8 px-2 py-3 text-[#9b9189]">
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </td>
                        <td className="px-4 py-3 text-[#6f655d] whitespace-nowrap">{formatDateTime(it.created_at)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#3B342F]">{it.business_name || "-"}</p>
                          <p className="text-xs text-[#9b9189]">{it.contact_name}</p>
                        </td>
                        <td className="px-4 py-3 text-[#6f655d] text-xs">
                          {it.contact_phone}
                          <br />
                          {it.contact_email}
                        </td>
                        <td className="px-4 py-3 text-[#6f655d]">{tierLabel(it.target_tier)}</td>
                        <td className="px-4 py-3 text-[#6f655d] text-xs">{it.budget_range || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", meta.color)}>
                            {meta.label}
                          </span>
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-t border-[#D8CCBC]/40 bg-[#EFE7DA]/30">
                          <td colSpan={7} className="px-6 py-5">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              {/* 상태 + 메모 */}
                              <div className="lg:col-span-1 space-y-3">
                                <div>
                                  <label className="block text-xs font-semibold text-[#6f655d] mb-1">상태 변경</label>
                                  <select
                                    value={it.status}
                                    disabled={savingId === it.id}
                                    onChange={(e) => void updateItem(it.id, { status: e.target.value })}
                                    className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 text-sm text-[#3B342F]"
                                  >
                                    {STATUSES.map((s) => (
                                      <option key={s.value} value={s.value}>
                                        {s.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-[#6f655d] mb-1">관리자 메모</label>
                                  <textarea
                                    value={memoDraft[it.id] ?? it.admin_memo ?? ""}
                                    onChange={(e) =>
                                      setMemoDraft((d) => ({ ...d, [it.id]: e.target.value }))
                                    }
                                    rows={5}
                                    className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 text-sm text-[#3B342F]"
                                    placeholder="상담 내용·다음 액션 등"
                                  />
                                  <button
                                    onClick={() => void updateItem(it.id, { admin_memo: memoDraft[it.id] ?? "" })}
                                    disabled={savingId === it.id}
                                    className="mt-2 w-full rounded-lg bg-[#B98768] py-2 text-xs font-bold text-[#F7F3EB] hover:bg-[#a9785c] disabled:opacity-50"
                                  >
                                    {savingId === it.id ? "저장 중..." : "메모 저장"}
                                  </button>
                                </div>
                                <div className="text-[10px] text-[#b0a89e] pt-2 border-t border-[#D8CCBC]/50">
                                  ID: {it.id}
                                  <br />
                                  IP: {it.source_ip ?? "-"}
                                </div>
                              </div>

                              {/* 의뢰 내용 */}
                              <div className="lg:col-span-2 space-y-3 text-sm">
                                <DetailSection title="담당자">
                                  <DetailRow k="이름" v={it.contact_name} />
                                  <DetailRow k="연락처" v={it.contact_phone} />
                                  <DetailRow k="이메일" v={it.contact_email} />
                                  <DetailRow k="직책" v={it.contact_role} />
                                  <DetailRow k="선호 채널" v={it.preferred_channel} />
                                </DetailSection>

                                <DetailSection title="사업자">
                                  <DetailRow k="상호" v={it.business_name} />
                                  <DetailRow k="사업자번호" v={it.business_number} />
                                  <DetailRow k="대표자" v={it.representative} />
                                  <DetailRow k="주소" v={it.business_address} />
                                  <DetailRow k="대표 전화" v={it.business_phone} />
                                  <DetailRow k="대표 이메일" v={it.business_email} />
                                  <DetailRow k="통신판매업" v={it.ecommerce_license} />
                                  <DetailRow k="업종" v={it.industry} />
                                </DetailSection>

                                <DetailSection title="의뢰 내용">
                                  <DetailRow k="목적" v={fmtVal(it.goals)} />
                                  <DetailRow k="한 줄 요약" v={it.goal_summary} />
                                  <DetailRow k="희망 단계" v={tierLabel(it.target_tier)} />
                                </DetailSection>

                                <DetailSection title="브랜드">
                                  <DetailRow k="로고" v={it.brand_logo_status} />
                                  <DetailRow k="대표 컬러" v={it.brand_color_main} />
                                  <DetailRow k="보조 컬러" v={it.brand_color_sub} />
                                  <DetailRow k="피하는 색" v={it.brand_color_avoid} />
                                  <DetailRow k="톤앤매너" v={fmtVal(it.tone_and_manner)} />
                                  <DetailRow k="참고 사이트">
                                    <ReferenceSitesView value={it.reference_sites} />
                                  </DetailRow>
                                </DetailSection>

                                <DetailSection title="콘텐츠 / 운영">
                                  <DetailRow k="메뉴 구성" v={fmtVal(it.menu_items)} />
                                  <DetailRow k="회사 소개글" v={it.intro_text} />
                                  <DetailRow k="상품·서비스">
                                    <ProductsView value={it.products} />
                                  </DetailRow>
                                  <DetailRow k="사진" v={it.photo_status} />
                                  <DetailRow k="FAQ">
                                    <FaqsView value={it.faqs} />
                                  </DetailRow>
                                  <DetailRow k="영업시간" v={it.business_hours} />
                                  <DetailRow k="휴무일" v={it.closed_days} />
                                  <DetailRow k="위치" v={it.location} />
                                  <DetailRow k="주차" v={it.parking} />
                                  <DetailRow k="SNS">
                                    <SocialLinksView value={it.social_links} />
                                  </DetailRow>
                                  <DetailRow k="도메인" v={it.domain_status} />
                                  <DetailRow k="도메인 후보" v={fmtVal(it.domain_candidates)} />
                                </DetailSection>

                                {(it.target_tier === "2" || it.target_tier === "3" || it.target_tier === "4" || it.target_tier === "5") && (
                                  <DetailSection title="회원">
                                    <DetailRow k="회원가입" v={it.member_required} />
                                    <DetailRow k="가입 방식" v={fmtVal(it.signup_methods)} />
                                    <DetailRow k="가입 필드" v={fmtVal(it.signup_fields)} />
                                    <DetailRow k="등급" v={it.member_tiers} />
                                  </DetailSection>
                                )}

                                {(it.target_tier === "3" || it.target_tier === "4" || it.target_tier === "5") && (
                                  <DetailSection title="예약">
                                    <DetailRow k="예약 단위" v={it.booking_unit} />
                                    <DetailRow k="1회 시간" v={it.booking_duration} />
                                    <DetailRow k="수용 인원" v={it.booking_capacity} />
                                    <DetailRow k="예약 항목" v={it.booking_targets} />
                                    <DetailRow k="예약 시작" v={it.booking_window} />
                                    <DetailRow k="최대 가능일" v={it.booking_max_days} />
                                    <DetailRow k="환불 정책" v={it.refund_policy} />
                                    <DetailRow k="알림" v={fmtVal(it.notification_prefs)} />
                                  </DetailSection>
                                )}

                                {(it.target_tier === "4" || it.target_tier === "5") && (
                                  <DetailSection title="결제">
                                    <DetailRow k="사전 준비" v={fmtVal(it.pg_ready)} />
                                    <DetailRow k="결제 수단" v={fmtVal(it.payment_methods)} />
                                    <DetailRow k="환불 규정" v={it.refund_terms} />
                                    <DetailRow k="비회원 결제" v={it.guest_checkout} />
                                  </DetailSection>
                                )}

                                <DetailSection title="관리자 / 일정">
                                  <DetailRow k="운영자" v={it.admin_operators} />
                                  <DetailRow k="관리 기능" v={fmtVal(it.admin_features)} />
                                  <DetailRow k="희망 오픈일" v={it.desired_open_date} />
                                  <DetailRow k="마감" v={it.deadline} />
                                  <DetailRow k="예산" v={it.budget_range} />
                                  <DetailRow k="분할 결제" v={it.payment_split} />
                                  <DetailRow k="인프라 비용" v={it.infra_payer} />
                                </DetailSection>

                                {it.extra_requests && (
                                  <DetailSection title="추가 요청">
                                    <p className="whitespace-pre-wrap text-[#3B342F] text-sm">{it.extra_requests}</p>
                                  </DetailSection>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-[#F7F3EB] border border-[#D8CCBC]/60 p-3">
      <h4 className="text-xs font-bold text-[#B98768] mb-2">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function DetailRow({ k, v, children }: { k: string; v?: string | null; children?: React.ReactNode }) {
  if (children !== undefined) {
    return (
      <div className="flex gap-2 text-xs">
        <span className="text-[#9b9189] w-24 shrink-0 pt-0.5">{k}</span>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    );
  }
  if (!v || v === "-") {
    return (
      <div className="flex gap-2 text-xs">
        <span className="text-[#9b9189] w-24 shrink-0">{k}</span>
        <span className="text-[#b0a89e]">-</span>
      </div>
    );
  }
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-[#9b9189] w-24 shrink-0">{k}</span>
      <span className="text-[#3B342F] whitespace-pre-wrap break-words flex-1">{v}</span>
    </div>
  );
}
