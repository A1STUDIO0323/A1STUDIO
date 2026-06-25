"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Loader2, Save, Eye, EyeOff, Award, Upload, X } from "lucide-react";
import CmSettlementsView from "./CmSettlementsView";

const LOG_PREFIX = "[CmProfileSection]";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const SUBJECTS = [
  { id: "vocal",   label: "보컬" },
  { id: "dance",   label: "댄스" },
  { id: "act",     label: "연기" },
  { id: "musical", label: "뮤지컬" },
  { id: "etc",     label: "기타" },
] as const;

type CmProfile = {
  id: string;
  display_name: string;
  bio: string | null;
  career: string | null;
  subjects: string[];
  profile_image: string | null;
  portfolio_url: string | null;
  is_public: boolean;
  show_in_section?: boolean | null;
  show_in_list?: boolean | null;
  is_active: boolean;
  bank_name: string | null;
  account_number: string | null;
  account_holder: string | null;
};

export default function CmProfileSection({ onLoaded }: { onLoaded?: (hasCm: boolean) => void }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CmProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [career, setCareer] = useState("");
  const [subjects, setSubjects] = useState<Set<string>>(new Set());
  const [profileImage, setProfileImage] = useState("");
  // 파일 업로드 진행/에러 상태 (DB 저장과 별개로 즉시 업로드)
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  // Phase 2 — 노출 위치 독립 토글 (본문 카드 / CM 목록 페이지)
  const [showInSection, setShowInSection] = useState(true);
  const [showInList, setShowInList] = useState(true);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");

  useEffect(() => {
    fetch("/api/cm/profile")
      .then(async (r) => {
        if (r.status === 404) {
          onLoaded?.(false);
          return null;
        }
        const data = await r.json();
        return data.profile as CmProfile;
      })
      .then((p) => {
        if (!p) return;
        setProfile(p);
        setDisplayName(p.display_name);
        setBio(p.bio ?? "");
        setCareer(p.career ?? "");
        setSubjects(new Set(p.subjects));
        setProfileImage(p.profile_image ?? "");
        setPortfolioUrl(p.portfolio_url ?? "");
        setIsPublic(p.is_public);
        // 마이그레이션 전(컬럼 미존재) — undefined 면 is_public 값으로 fallback
        setShowInSection(p.show_in_section ?? p.is_public);
        setShowInList(p.show_in_list ?? p.is_public);
        setBankName(p.bank_name ?? "");
        setAccountNumber(p.account_number ?? "");
        setAccountHolder(p.account_holder ?? "");
        onLoaded?.(true);
      })
      .catch(() => onLoaded?.(false))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSubject = (id: string) => {
    setSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 프로필 이미지 파일 업로드 — 선택 즉시 /api/cm/upload-profile-image 호출,
  // 응답 URL 을 profileImage state 에 채우고 미리보기. DB 저장은 "저장하기" 버튼에서 처리.
  const handleImageFile = async (file: File) => {
    setImageError(null);
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError("JPG / PNG / WEBP 형식만 업로드 가능합니다");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("파일 크기는 5MB 이하만 가능합니다");
      return;
    }
    setImageUploading(true);
    try {
      console.log(`${LOG_PREFIX} upload start name=${file.name} size=${file.size}`);
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/cm/upload-profile-image", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data?.url) {
        console.warn(`${LOG_PREFIX} upload failed`, data);
        setImageError(data?.error ?? "업로드에 실패했습니다");
        return;
      }
      console.log(`${LOG_PREFIX} upload success url=${data.url}`);
      setProfileImage(data.url);
    } catch (err) {
      console.error(`${LOG_PREFIX} upload exception`, err);
      setImageError("네트워크 오류로 업로드에 실패했습니다");
    } finally {
      setImageUploading(false);
      // 같은 파일을 다시 선택해도 onChange 가 발화하도록 초기화
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImageRemove = () => {
    setProfileImage("");
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 드래그앤드롭 핸들러 — 빈 상태 dropzone 과 미리보기 상태 모두에서 사용
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (imageUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    void handleImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!imageUploading) setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleSave = async () => {
    setError(null);
    if (!displayName.trim()) {
      setError("공개 프로필명을 입력해주세요");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/cm/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          bio,
          career,
          subjects: Array.from(subjects),
          profile_image: profileImage,
          portfolio_url: portfolioUrl,
          is_public: showInSection || showInList,
          show_in_section: showInSection,
          show_in_list: showInList,
          bank_name: bankName,
          account_number: accountNumber,
          account_holder: accountHolder,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "저장 실패");
        return;
      }
      setProfile(data.profile);
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-[#B98768]" />
      </div>
    );
  }

  if (!profile) {
    return null; // 부모 컴포넌트에서 탭 자체를 숨김
  }

  return (
    <div className="space-y-6">
      {/* 상단 안내 */}
      <div className="rounded-2xl border border-[#D8CCBC] bg-[#f5ede6] p-5">
        <div className="flex items-center gap-3">
          <Award className="w-6 h-6 text-[#B98768]" />
          <div>
            <p className="font-bold text-[#3B342F]">클래스마스터(CM) 프로필</p>
            <p className="text-xs text-[#6f655d] mt-0.5">
              아래 정보는 승인된 CM의 공개 카드에 자동으로 사용됩니다. 정산 정보는 비공개로 보호됩니다.
            </p>
          </div>
        </div>
        {!profile.is_active && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg p-2">
            현재 관리자에 의해 비활성 상태입니다. 카드는 노출되지 않습니다.
          </p>
        )}
      </div>

      {/* 공개 노출 토글 — 노출 위치별 독립 제어 (Phase 2) */}
      <div className="rounded-2xl border border-[#D8CCBC] bg-white p-5 space-y-4">
        <div>
          <p className="font-semibold text-[#3B342F] flex items-center gap-2">
            <Eye className="w-4 h-4" />
            공개 노출 설정
          </p>
          <p className="text-xs text-[#6f655d] mt-0.5">
            노출 위치를 개별 ON/OFF 할 수 있습니다. 둘 다 OFF 면 어디에도 노출되지 않습니다.
          </p>
        </div>

        {/* 토글 1: 본문 자동 카드 */}
        <div className="flex items-center justify-between rounded-xl border border-[#EFE7DA] bg-[#F7F3EB]/60 p-3">
          <div className="min-w-0 pr-3">
            <p className="text-sm font-semibold text-[#3B342F] flex items-center gap-2">
              {showInSection ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              원데이클래스/개인레슨 본문에 CM 카드 자동 노출
            </p>
            <p className="text-xs text-[#9b9189] mt-0.5">
              /one-day-class, /lessons 메인 페이지 하단의 CM 카드 섹션
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowInSection((v) => !v)}
            aria-label="본문 카드 노출 토글"
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              showInSection ? "bg-[#B98768]" : "bg-[#D8CCBC]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                showInSection ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* 토글 2: CM 목록 페이지 노출 */}
        <div className="flex items-center justify-between rounded-xl border border-[#EFE7DA] bg-[#F7F3EB]/60 p-3">
          <div className="min-w-0 pr-3">
            <p className="text-sm font-semibold text-[#3B342F] flex items-center gap-2">
              {showInList ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              CM 목록 페이지 공개 노출
            </p>
            <p className="text-xs text-[#9b9189] mt-0.5">
              /one-day-class/cm-list, /lessons/cm-list 페이지
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowInList((v) => !v)}
            aria-label="CM 목록 노출 토글"
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
              showInList ? "bg-[#B98768]" : "bg-[#D8CCBC]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                showInList ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* 공개 프로필 */}
      <Section title="공개 프로필 (CM 카드에 노출)">
        <Field label="공개 프로필명" required>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none"
          />
        </Field>

        <Field label="수업 분야 (복수 선택)">
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => {
              const active = subjects.has(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSubject(s.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-all ${
                    active
                      ? "bg-[#B98768] text-white"
                      : "bg-[#F7F3EB] text-[#6f655d] border border-[#D8CCBC]"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="공개 소개글">
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none resize-none"
            placeholder="수강생에게 보여드릴 소개글"
          />
        </Field>

        <Field label="주요 경력">
          <textarea
            rows={5}
            value={career}
            onChange={(e) => setCareer(e.target.value)}
            className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none resize-none"
            placeholder="작품·공연·수업 경력"
          />
        </Field>

        <Field label="프로필 이미지">
          <div className="space-y-3">
            {/* 미리보기 + 제거 버튼 — 미리보기 영역에도 드래그앤드롭으로 교체 가능 */}
            {profileImage ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`flex items-center gap-4 rounded-lg p-2 transition-colors ${
                  dragOver ? "bg-[#B98768]/10 ring-2 ring-[#B98768]" : ""
                }`}
              >
                <div className="relative h-20 w-20 overflow-hidden rounded-full border border-[#D8CCBC] bg-[#F7F3EB]">
                  {/* next/image 가 외부 도메인을 모를 수 있어 unoptimized 로 안전 처리 */}
                  <Image
                    src={profileImage}
                    alt="CM 프로필 미리보기"
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8CCBC] bg-white px-3 py-1.5 text-xs font-semibold text-[#3B342F] hover:border-[#B98768] disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    다른 이미지로 변경
                  </button>
                  <button
                    type="button"
                    onClick={handleImageRemove}
                    disabled={imageUploading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8CCBC] bg-white px-3 py-1.5 text-xs font-semibold text-red-500 hover:border-red-300 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    제거
                  </button>
                  <span className="text-[10px] text-[#9b9189]">또는 파일을 끌어놓아 교체</span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageUploading}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  dragOver
                    ? "border-[#B98768] bg-[#B98768]/10 text-[#B98768]"
                    : "border-[#D8CCBC] bg-[#F7F3EB] text-[#6f655d] hover:border-[#B98768] hover:text-[#B98768]"
                }`}
              >
                {imageUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    업로드 중...
                  </>
                ) : dragOver ? (
                  <>
                    <Upload className="w-4 h-4" />
                    여기에 놓으세요
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    이미지 선택 또는 끌어놓기 (JPG/PNG/WEBP · 5MB 이하)
                  </>
                )}
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImageFile(f);
              }}
            />

            {imageError && (
              <p className="text-xs text-red-600">{imageError}</p>
            )}

            {/* URL 직접 입력도 허용 — 외부 호스팅 사용 시 */}
            <details className="text-xs text-[#9b9189]">
              <summary className="cursor-pointer hover:text-[#B98768]">
                직접 URL 입력 (외부 호스팅 사용 시)
              </summary>
              <input
                type="url"
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                className="mt-2 w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 text-sm focus:border-[#B98768] focus:outline-none"
                placeholder="https://..."
              />
            </details>

            <p className="text-xs text-[#9b9189]">
              저장하기 버튼을 눌러야 공개 카드에 반영됩니다.
            </p>
          </div>
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
      </Section>

      {/* 정산 정보 (비공개) */}
      <Section title="정산 정보 (비공개)" muted>
        <p className="text-xs text-[#9b9189] mb-3">
          정산금 입금에만 사용되며 외부에 공개되지 않습니다.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="은행명">
            <input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none"
            />
          </Field>
          <Field label="계좌번호">
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none"
              placeholder="-없이 숫자만"
            />
          </Field>
          <Field label="예금주명">
            <input
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none"
            />
          </Field>
        </div>
      </Section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-[#9b9189]">
          {savedAt ? `${savedAt.toLocaleTimeString("ko-KR")} 저장됨` : ""}
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#B98768] px-6 py-3 text-sm font-bold text-white hover:bg-[#a9785c] disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "저장 중..." : "저장하기"}
        </button>
      </div>

      {/* 정산 내역 */}
      <div className="pt-2">
        <h3 className="font-bold text-[#3B342F] mb-3">정산 내역</h3>
        <CmSettlementsView />
      </div>
    </div>
  );
}

function Section({ title, children, muted = false }: { title: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <div className={`rounded-2xl border border-[#D8CCBC] p-5 space-y-4 ${muted ? "bg-[#F7F3EB]" : "bg-white"}`}>
      <h3 className="font-bold text-[#3B342F]">{title}</h3>
      {children}
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
