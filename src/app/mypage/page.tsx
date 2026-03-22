"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Clock, XCircle, ReceiptText } from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";
import { cn, formatPrice } from "@/lib/utils";
import { clearMemberBannedLocal, clearMemberRoleLocal, deleteMemberProfileByEmail, markMemberDeletedLocal } from "@/lib/member-role";

type Status = "PAID" | "CANCELLED" | "EXPIRED";
const STATUS_LABEL: Record<Status, string> = {
  PAID: "결제 완료",
  CANCELLED: "취소됨",
  EXPIRED: "만료됨",
};
const STATUS_COLOR: Record<Status, string> = {
  PAID: "text-emerald-400 bg-emerald-50",
  CANCELLED: "text-red-400 bg-red-50",
  EXPIRED: "text-[#6f655d] bg-[#F7F3EB]",
};

const DUMMY_RESERVATIONS = [
  // 예약/결제 백엔드 재연결 전까지 임의 데이터는 노출하지 않습니다.
];

type SchoolStatus = "ENROLLED" | "GRADUATED" | "";
type ProfileResponse = {
  success?: boolean;
  profile?: {
    middleSchool?: string | null;
    middleSchoolStatus?: "ENROLLED" | "GRADUATED" | null;
    highSchool?: string | null;
    highSchoolStatus?: "ENROLLED" | "GRADUATED" | null;
    university?: string | null;
    universityStatus?: "ENROLLED" | "GRADUATED" | null;
    graduateSchool?: string | null;
    graduateSchoolStatus?: "ENROLLED" | "GRADUATED" | null;
  };
  error?: string;
};

export default function MyPage() {
  const { data: session } = useSession();
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawMessage, setWithdrawMessage] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [middleSchool, setMiddleSchool] = useState("");
  const [middleSchoolStatus, setMiddleSchoolStatus] = useState<SchoolStatus>("");
  const [highSchool, setHighSchool] = useState("");
  const [highSchoolStatus, setHighSchoolStatus] = useState<SchoolStatus>("");
  const [university, setUniversity] = useState("");
  const [universityStatus, setUniversityStatus] = useState<SchoolStatus>("");
  const [graduateSchool, setGraduateSchool] = useState("");
  const [graduateSchoolStatus, setGraduateSchoolStatus] = useState<SchoolStatus>("");

  useEffect(() => {
    if (!session?.user?.email) return;
    void (async () => {
      try {
        setLoadingProfile(true);
        const res = await fetch("/api/members/profile", { cache: "no-store" });
        const data = (await res.json()) as ProfileResponse;
        if (!res.ok || !data.success || !data.profile) return;

        setMiddleSchool(data.profile.middleSchool ?? "");
        setMiddleSchoolStatus(data.profile.middleSchoolStatus ?? "");
        setHighSchool(data.profile.highSchool ?? "");
        setHighSchoolStatus(data.profile.highSchoolStatus ?? "");
        setUniversity(data.profile.university ?? "");
        setUniversityStatus(data.profile.universityStatus ?? "");
        setGraduateSchool(data.profile.graduateSchool ?? "");
        setGraduateSchoolStatus(data.profile.graduateSchoolStatus ?? "");
      } catch {
        // ignore
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, [session?.user?.email]);

  const handleSaveSchools = async () => {
    try {
      setSavingProfile(true);
      setProfileError("");
      setProfileMessage("");
      const res = await fetch("/api/members/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          middleSchool,
          middleSchoolStatus: middleSchoolStatus || undefined,
          highSchool,
          highSchoolStatus: highSchoolStatus || undefined,
          university,
          universityStatus: universityStatus || undefined,
          graduateSchool,
          graduateSchoolStatus: graduateSchoolStatus || undefined,
        }),
      });
      const data = (await res.json()) as ProfileResponse;
      if (!res.ok || !data.success) {
        setProfileError(data.error ?? "학력 정보 저장에 실패했습니다.");
        return;
      }
      setProfileMessage("학력 정보가 저장되었습니다.");
    } catch {
      setProfileError("학력 정보 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleWithdraw = async () => {
    if (!session?.user?.email) return;
    const ok = window.confirm("정말 회원탈퇴 하시겠습니까? 계정 정보가 삭제됩니다.");
    if (!ok) return;

    try {
      setWithdrawLoading(true);
      setWithdrawMessage("");
      const res = await fetch("/api/members/withdraw", {
        method: "POST",
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        deleteMemberProfileByEmail(session.user.email);
        clearMemberRoleLocal(session.user.email);
        clearMemberBannedLocal(session.user.email);
        markMemberDeletedLocal(session.user.email);
        setWithdrawMessage("DB 연결 문제로 로컬 탈퇴 처리 후 로그아웃합니다.");
        await signOut({ callbackUrl: "/" });
        return;
      }
      deleteMemberProfileByEmail(session.user.email);
      clearMemberRoleLocal(session.user.email);
      clearMemberBannedLocal(session.user.email);
      markMemberDeletedLocal(session.user.email);
      await signOut({ callbackUrl: "/" });
    } catch {
      setWithdrawMessage("회원탈퇴 처리 중 오류가 발생했습니다.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-[#3B342F]">마이페이지</h1>
          <p className="mt-2 text-[#6f655d]">내 정보와 예약 내역을 확인하세요</p>
        </div>

        {session?.user?.email && (
          <div className="mb-6 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-5">
            <h2 className="text-lg font-bold text-[#3B342F]">회원 정보</h2>
            <p className="mt-2 text-sm text-[#6f655d]">
              {session.user.name ?? "회원"} ({session.user.email})
            </p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-[#9b9189]">회원탈퇴 시 계정으로 다시 로그인해야 이용 가능합니다.</p>
              <button
                onClick={handleWithdraw}
                disabled={withdrawLoading}
                className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-60"
              >
                {withdrawLoading ? "처리 중..." : "회원탈퇴"}
              </button>
            </div>
            {withdrawMessage && <p className="mt-2 text-xs text-red-400">{withdrawMessage}</p>}
          </div>
        )}

        {session?.user?.email && (
          <div className="mb-6 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-5">
            <h2 className="text-lg font-bold text-[#3B342F]">학력 정보</h2>
            <p className="mt-1 text-xs text-[#9b9189]">
              중/고/대학교/대학원 정보를 재학 또는 졸업 상태로 저장할 수 있습니다.
            </p>

            <div className="mt-4 space-y-3">
              <SchoolRow
                label="중학교"
                school={middleSchool}
                setSchool={setMiddleSchool}
                status={middleSchoolStatus}
                setStatus={setMiddleSchoolStatus}
              />
              <SchoolRow
                label="고등학교"
                school={highSchool}
                setSchool={setHighSchool}
                status={highSchoolStatus}
                setStatus={setHighSchoolStatus}
              />
              <SchoolRow
                label="대학교"
                school={university}
                setSchool={setUniversity}
                status={universityStatus}
                setStatus={setUniversityStatus}
              />
              <SchoolRow
                label="대학원"
                school={graduateSchool}
                setSchool={setGraduateSchool}
                status={graduateSchoolStatus}
                setStatus={setGraduateSchoolStatus}
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs text-[#9b9189]">
                {loadingProfile ? "저장된 정보를 불러오는 중..." : "변경 후 저장 버튼을 눌러주세요."}
              </p>
              <button
                type="button"
                onClick={handleSaveSchools}
                disabled={savingProfile || loadingProfile}
                className="rounded-lg bg-[#B98768] px-3 py-2 text-xs font-semibold text-[#F7F3EB] hover:bg-[#a9785c] disabled:opacity-60"
              >
                {savingProfile ? "저장 중..." : "학력 정보 저장"}
              </button>
            </div>
            {profileMessage && <p className="mt-2 text-xs text-emerald-500">{profileMessage}</p>}
            {profileError && <p className="mt-2 text-xs text-red-400">{profileError}</p>}
          </div>
        )}

        <div>
          <h2 className="mb-5 text-xl font-bold text-[#3B342F]">내 예약 내역</h2>
          {DUMMY_RESERVATIONS.length === 0 ? (
            <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6 text-sm text-[#6f655d]">
              예약 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {DUMMY_RESERVATIONS.map((res) => (
                <div key={res.id} className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_COLOR[res.status])}>
                          {STATUS_LABEL[res.status]}
                        </span>
                        <span className="text-xs text-[#b0a89e]">{res.id}</span>
                      </div>
                      <p className="mt-2 font-semibold text-[#3B342F]">{res.roomName}</p>
                      <div className="mt-1 flex items-center gap-3 text-sm text-[#6f655d]">
                        <span className="flex items-center gap-1">
                          <CalendarCheck className="h-3.5 w-3.5" /> {res.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {res.startTime} – {res.endTime}
                        </span>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-[#3B342F]">{formatPrice(res.totalAmount)}</p>
                  </div>
                  {res.status === "PAID" && (
                    <div className="mt-4 flex gap-2">
                      <button className="flex items-center gap-1.5 rounded-lg border border-[#D8CCBC] px-3 py-2 text-xs text-[#6f655d] hover:border-[#D8CCBC] hover:text-[#B98768] transition-colors">
                        <ReceiptText className="h-3.5 w-3.5" /> 영수증
                      </button>
                      <button className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-400 hover:border-red-500/50 transition-colors">
                        <XCircle className="h-3.5 w-3.5" /> 취소 요청
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SchoolRow({
  label,
  school,
  setSchool,
  status,
  setStatus,
}: {
  label: string;
  school: string;
  setSchool: (value: string) => void;
  status: SchoolStatus;
  setStatus: (value: SchoolStatus) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px]">
      <input
        type="text"
        value={school}
        onChange={(e) => setSchool(e.target.value)}
        placeholder={`${label}명`}
        className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 text-sm text-[#3B342F] placeholder:text-[#b0a89e] focus:border-[#B98768] focus:outline-none"
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as SchoolStatus)}
        className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 text-sm text-[#3B342F] focus:border-[#B98768] focus:outline-none"
      >
        <option value="">선택 안함</option>
        <option value="ENROLLED">재학</option>
        <option value="GRADUATED">졸업</option>
      </select>
    </div>
  );
}
