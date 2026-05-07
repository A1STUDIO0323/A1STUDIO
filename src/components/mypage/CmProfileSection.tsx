"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Eye, EyeOff, Award } from "lucide-react";
import CmSettlementsView from "./CmSettlementsView";

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
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
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
          is_public: isPublic,
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

      {/* 공개 노출 토글 */}
      <div className="rounded-2xl border border-[#D8CCBC] bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-[#3B342F] flex items-center gap-2">
              {isPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              공개 노출
            </p>
            <p className="text-xs text-[#6f655d] mt-0.5">
              ON으로 두면 원데이클래스/개인레슨 페이지에 CM 카드가 자동 노출됩니다.
            </p>
          </div>
          <button
            onClick={() => setIsPublic((v) => !v)}
            className={`relative h-7 w-12 rounded-full transition-colors ${
              isPublic ? "bg-[#B98768]" : "bg-[#D8CCBC]"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${
                isPublic ? "translate-x-5" : "translate-x-0.5"
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

        <Field label="프로필 이미지 URL">
          <input
            type="url"
            value={profileImage}
            onChange={(e) => setProfileImage(e.target.value)}
            className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 focus:border-[#B98768] focus:outline-none"
            placeholder="https:// (선택)"
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
