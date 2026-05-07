"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Award, Loader2, CheckCircle2, AlertCircle, Clock, Upload, User as UserIcon, X } from "lucide-react";

const SUBJECTS = [
  { id: "vocal",   label: "보컬" },
  { id: "dance",   label: "댄스" },
  { id: "act",     label: "연기" },
  { id: "musical", label: "뮤지컬" },
  { id: "etc",     label: "기타" },
] as const;

type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED" | "HOLD";

type Application = {
  id: string;
  status: ApplicationStatus;
  admin_memo: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export default function ApplyCmPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<Application | null>(null);

  // form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [field, setField] = useState("");
  const [intro, setIntro] = useState("");
  const [career, setCareer] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [profileImage, setProfileImage] = useState("");
  // 정책: 가능한 수업 유형은 기본 미체크 → 사용자가 선택
  const [canOneday, setCanOneday] = useState(false);
  const [canLesson, setCanLesson] = useState(false);
  const [subjects, setSubjects] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 이미지 업로드 상태
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login?redirect=/one-day-class/apply-cm");
      } else {
        setAuthLoading(false);
      }
    });
  }, [router]);

  useEffect(() => {
    if (authLoading) return;
    fetch("/api/cm/applications/me")
      .then((r) => r.json())
      .then((data) => {
        setExisting(data.application ?? null);
      })
      .catch(() => setExisting(null))
      .finally(() => setStatusLoading(false));
  }, [authLoading]);

  const toggleSubject = (id: string) => {
    setSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(null);
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/cm/upload-profile-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error ?? "업로드 실패");
        return;
      }
      setProfileImage(data.url);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!canOneday && !canLesson) {
      setErrorMsg("[가능한 수업 유형] 원데이클래스 / 개인레슨 중 하나 이상 선택해주세요");
      return;
    }
    if (subjects.size === 0) {
      setErrorMsg("[수업 가능 분야] 보컬·댄스·연기·뮤지컬·기타 중 하나 이상 선택해주세요");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/cm/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          field,
          intro,
          career,
          portfolio_url: portfolioUrl,
          profile_image: profileImage,
          can_oneday: canOneday,
          can_lesson: canLesson,
          subjects: Array.from(subjects),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "신청에 실패했습니다");
        setSubmitting(false);
        return;
      }
      setExisting({
        id: data.application.id,
        status: data.application.status,
        admin_memo: null,
        created_at: data.application.created_at,
        reviewed_at: null,
      });
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || statusLoading) {
    return (
      <div className="min-h-screen bg-[#F7F3EB] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#B98768]" />
      </div>
    );
  }

  // 진행 중 신청이 있을 때 → 상태 안내 화면
  if (existing && existing.status !== "REJECTED") {
    return (
      <div className="min-h-screen bg-[#F7F3EB] py-20 px-4">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-[#D8CCBC] bg-white p-8 text-center">
            {existing.status === "PENDING" && (
              <>
                <Clock className="w-10 h-10 text-[#B98768] mx-auto mb-3" />
                <h1 className="text-xl font-bold text-[#3B342F] mb-2">검토 중입니다</h1>
                <p className="text-sm text-[#6f655d] mb-4">
                  신청을 접수했습니다. 관리자 검토 후 결과를 안내해드립니다.
                </p>
              </>
            )}
            {existing.status === "HOLD" && (
              <>
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <h1 className="text-xl font-bold text-[#3B342F] mb-2">보류 중입니다</h1>
                <p className="text-sm text-[#6f655d] mb-4">
                  추가 확인이 필요한 상태입니다. 관리자가 별도로 연락드릴 수 있습니다.
                </p>
              </>
            )}
            {existing.status === "APPROVED" && (
              <>
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <h1 className="text-xl font-bold text-[#3B342F] mb-2">승인되었습니다</h1>
                <p className="text-sm text-[#6f655d] mb-4">
                  마이페이지에서 공개 프로필과 정산 정보를 등록해주세요.
                </p>
                <Link
                  href="/mypage?tab=cm"
                  className="inline-block rounded-xl bg-[#B98768] px-6 py-3 text-sm font-bold text-white hover:bg-[#a9785c]"
                >
                  마이페이지로 이동
                </Link>
              </>
            )}
            <p className="mt-4 text-xs text-[#9b9189]">
              신청일: {new Date(existing.created_at).toLocaleString("ko-KR")}
            </p>
            {existing.admin_memo && (
              <div className="mt-4 rounded-lg bg-[#F7F3EB] p-4 text-sm text-[#6f655d] text-left">
                <p className="font-semibold text-[#3B342F] mb-1">관리자 안내</p>
                {existing.admin_memo}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20 px-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <Award className="w-10 h-10 text-[#B98768] mx-auto mb-3" />
          <h1 className="text-3xl font-extrabold text-[#3B342F]">CM 신청</h1>
          <p className="mt-3 text-sm text-[#6f655d]">
            A1 STUDIO의 클래스마스터로 함께하실 분의 신청을 받습니다.
          </p>
        </div>

        {existing?.status === "REJECTED" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold mb-1">이전 신청이 반려되었습니다.</p>
            {existing.admin_memo && <p>{existing.admin_memo}</p>}
            <p className="mt-1 text-xs">새로 신청하실 수 있습니다.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-[#D8CCBC] bg-white p-6">
          {/* === 상단: 프로필 사진 + 기본 정보 (면접서 형식) === */}
          <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
            {/* 프로필 사진 */}
            <div>
              <label className="block text-sm font-semibold text-[#3B342F] mb-2">
                프로필 사진
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={handlePickFile}
                  disabled={uploadingImage}
                  className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border-2 border-dashed border-[#D8CCBC] bg-[#F7F3EB] hover:border-[#B98768]/60 transition-colors disabled:opacity-60"
                >
                  {profileImage ? (
                    <Image
                      src={profileImage}
                      alt="프로필 미리보기"
                      fill
                      sizes="160px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3">
                      <UserIcon className="w-8 h-8 text-[#b0a89e]" />
                      <span className="text-[11px] text-[#9b9189] leading-snug">
                        클릭해서 사진 첨부<br />
                        <span className="text-[10px]">JPG/PNG/WEBP, 5MB</span>
                      </span>
                    </div>
                  )}
                  {uploadingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                      <Loader2 className="w-6 h-6 animate-spin text-[#B98768]" />
                    </div>
                  )}
                </button>

                {profileImage && !uploadingImage && (
                  <button
                    type="button"
                    onClick={() => setProfileImage("")}
                    className="absolute -top-2 -right-2 rounded-full bg-white shadow border border-[#D8CCBC] p-1 hover:bg-red-50"
                    title="제거"
                  >
                    <X className="w-3.5 h-3.5 text-red-500" />
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!profileImage && !uploadingImage && (
                  <button
                    type="button"
                    onClick={handlePickFile}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#B98768] hover:underline"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    사진 첨부
                  </button>
                )}

                {uploadError && (
                  <p className="mt-1 text-xs text-red-600">{uploadError}</p>
                )}
              </div>
            </div>

            {/* 기본 정보 */}
            <div className="space-y-4">
              <Field label="이름" required>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none"
                  placeholder="실명"
                />
              </Field>
              <Field label="연락처" required>
                <input
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none"
                  placeholder="010-0000-0000"
                />
              </Field>
              <Field label="활동 분야" required>
                <input
                  required
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none"
                  placeholder="예: 뮤지컬 배우 / 보컬 트레이너 / K-POP 안무가"
                />
              </Field>
            </div>
          </div>

          {/* === 가운데: 가능한 수업 유형 === */}
          <div className="border-y border-[#D8CCBC] -mx-6 px-6 py-5">
            <Field label="가능한 수업 유형" required>
              <p className="text-xs text-[#9b9189] mb-2 -mt-1">하나 이상 선택해주세요.</p>
              <div className="flex gap-3">
                <Toggle checked={canOneday} onChange={setCanOneday} label="원데이클래스" />
                <Toggle checked={canLesson} onChange={setCanLesson} label="개인레슨" />
              </div>
            </Field>
          </div>

          {/* === 하단: 분야·소개·경력·포트폴리오 === */}
          <div className="space-y-5">
            <Field label="수업 가능 분야 (복수 선택)" required>
              <p className="text-xs text-[#9b9189] mb-2 -mt-1">
                보컬·댄스·연기·뮤지컬·기타 중 해당하는 분야를 모두 선택해주세요.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((s) => {
                  const active = subjects.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSubject(s.id)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                        active
                          ? "bg-[#B98768] text-white shadow-sm scale-105"
                          : "bg-white text-[#9b9189] border-2 border-dashed border-[#D8CCBC] hover:border-[#B98768] hover:text-[#B98768]"
                      }`}
                    >
                      {active && "✓ "}
                      {s.label}
                    </button>
                  );
                })}
              </div>
              {subjects.size === 0 && (
                <p className="mt-2 text-xs text-[#9b9189]">
                  선택된 분야가 없습니다. 위 버튼을 눌러 선택해주세요.
                </p>
              )}
            </Field>

            <Field label="소개글" required>
              <textarea
                required
                rows={4}
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none resize-none"
                placeholder="자신을 소개해주세요. 수강생에게 보여드릴 공개 소개글로 사용될 수 있습니다."
              />
            </Field>

            <Field label="주요 경력" required>
              <textarea
                required
                rows={5}
                value={career}
                onChange={(e) => setCareer(e.target.value)}
                className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none resize-none"
                placeholder="작품·공연·수업 경력을 한 줄씩 적어주세요."
              />
            </Field>

            <Field label="포트폴리오 URL">
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none"
                placeholder="https:// (선택)"
              />
            </Field>
          </div>

          {errorMsg && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || uploadingImage}
            className="w-full rounded-xl bg-[#B98768] px-6 py-3 text-base font-bold text-white transition-all hover:bg-[#a9785c] disabled:opacity-50"
          >
            {submitting ? "제출 중..." : "신청하기"}
          </button>

          <p className="text-xs text-[#9b9189] text-center">
            * 입력하신 연락처·관리자 메모 등 비공개 정보는 공개 CM 카드에 노출되지 않습니다.
          </p>
        </form>
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

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
        checked
          ? "border-[#B98768] bg-[#f5ede6] text-[#B98768]"
          : "border-[#D8CCBC] bg-white text-[#6f655d] hover:bg-[#F7F3EB]"
      }`}
    >
      {label}
    </button>
  );
}
