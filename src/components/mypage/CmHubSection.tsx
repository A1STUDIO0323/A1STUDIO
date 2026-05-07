"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, Clock, AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import CmProfileSection from "./CmProfileSection";

type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED" | "HOLD";

type Application = {
  id: string;
  status: ApplicationStatus;
  admin_memo: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export default function CmHubSection({ onLoaded }: { onLoaded?: (loaded: boolean) => void }) {
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [application, setApplication] = useState<Application | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/cm/profile", { cache: "no-store" }).then(async (r) => {
        if (r.status === 404) return { hasProfile: false };
        if (!r.ok) return { hasProfile: false };
        return { hasProfile: true };
      }),
      fetch("/api/cm/applications/me", { cache: "no-store" }).then(async (r) => {
        if (!r.ok) return null;
        const d = await r.json();
        return d.application as Application | null;
      }),
    ])
      .then(([p, a]) => {
        setHasProfile(p.hasProfile);
        setApplication(a);
      })
      .finally(() => {
        setLoading(false);
        onLoaded?.(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-[#B98768]" />
      </div>
    );
  }

  // 승인 + 프로필 존재 → 기존 CmProfileSection (편집 + 정산)
  if (hasProfile) {
    return <CmProfileSection />;
  }

  // 신청 이력 없음
  if (!application) {
    return (
      <div className="rounded-2xl border border-[#D8CCBC] bg-white p-8 text-center">
        <Award className="w-10 h-10 text-[#B98768] mx-auto mb-3" />
        <h2 className="text-xl font-bold text-[#3B342F] mb-2">CM(클래스마스터) 신청</h2>
        <p className="text-sm text-[#6f655d] mb-6 max-w-md mx-auto">
          A1 STUDIO의 클래스마스터로 함께하실 분의 신청을 받습니다.
          승인되면 마이페이지에서 공개 프로필과 정산 정보를 관리할 수 있습니다.
        </p>
        <Link
          href="/one-day-class/apply-cm"
          className="inline-block rounded-xl bg-[#B98768] px-6 py-3 text-sm font-bold text-white hover:bg-[#a9785c]"
        >
          CM 신청하러 가기
        </Link>
      </div>
    );
  }

  // 신청 진행 상태에 따른 분기
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#D8CCBC] bg-white p-6">
        <div className="flex items-start gap-4">
          {application.status === "PENDING" && <Clock className="w-8 h-8 text-[#B98768] shrink-0" />}
          {application.status === "HOLD" && <AlertCircle className="w-8 h-8 text-amber-500 shrink-0" />}
          {application.status === "APPROVED" && <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />}
          {application.status === "REJECTED" && <XCircle className="w-8 h-8 text-red-500 shrink-0" />}

          <div className="flex-1 min-w-0">
            {application.status === "PENDING" && (
              <>
                <h2 className="text-lg font-bold text-[#3B342F] mb-1">CM 신청 검토 중입니다</h2>
                <p className="text-sm text-[#6f655d]">
                  신청을 접수했습니다. 관리자 검토 후 결과를 안내해드립니다.
                </p>
              </>
            )}
            {application.status === "HOLD" && (
              <>
                <h2 className="text-lg font-bold text-[#3B342F] mb-1">CM 신청 보류 중입니다</h2>
                <p className="text-sm text-[#6f655d]">
                  추가 확인이 필요한 상태입니다. 관리자가 별도로 연락드릴 수 있습니다.
                </p>
              </>
            )}
            {application.status === "APPROVED" && (
              <>
                <h2 className="text-lg font-bold text-[#3B342F] mb-1">CM 신청이 승인되었습니다</h2>
                <p className="text-sm text-[#6f655d] mb-3">
                  공개 프로필과 정산 정보를 등록해주세요.
                </p>
                <p className="text-xs text-[#9b9189]">
                  잠시 후 페이지를 새로고침하면 CM 프로필 편집 화면이 자동 노출됩니다.
                </p>
              </>
            )}
            {application.status === "REJECTED" && (
              <>
                <h2 className="text-lg font-bold text-[#3B342F] mb-1">CM 신청이 반려되었습니다</h2>
                <p className="text-sm text-[#6f655d]">
                  사유를 확인하시고 보완하여 재신청하실 수 있습니다.
                </p>
              </>
            )}

            <p className="mt-3 text-xs text-[#9b9189]">
              신청일: {new Date(application.created_at).toLocaleString("ko-KR")}
              {application.reviewed_at && (
                <> · 검토일: {new Date(application.reviewed_at).toLocaleString("ko-KR")}</>
              )}
            </p>

            {application.admin_memo && (
              <div className="mt-3 rounded-lg bg-[#F7F3EB] p-3 text-sm text-[#3B342F]">
                <p className="text-[10px] font-semibold uppercase text-[#9b9189] mb-1">관리자 안내</p>
                <p className="whitespace-pre-line">{application.admin_memo}</p>
              </div>
            )}

            {application.status === "REJECTED" && (
              <Link
                href="/one-day-class/apply-cm"
                className="mt-4 inline-block rounded-lg bg-[#B98768] px-4 py-2 text-xs font-bold text-white hover:bg-[#a9785c]"
              >
                재신청하기
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
