"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "@/lib/auth-client";
import {
  Users, Calendar, ChevronRight, CheckCircle, X, Plus, Trash2,
  UserCircle2, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdmin } from "@/lib/admin-context";
import { oneDayClassStore, type LocalOneDayClass, type LocalApplication } from "@/lib/local-store";
import { registerMemberProfile, setMemberRoleByEmail, useMemberDirectory, useMemberRole } from "@/lib/member-role";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  OPEN: { label: "모집 중", color: "text-emerald-400 bg-emerald-50 border-emerald-200" },
  CONFIRMED: { label: "인원 충족 · 확정", color: "text-[#B98768] bg-[#B98768]/10 border-[#B98768]/35" },
  CANCELLED: { label: "취소됨", color: "text-[#6f655d] bg-[#F7F3EB] border-[#D8CCBC]" },
};

const GENDER_LABELS: Record<string, string> = { M: "남", F: "여", "": "-" };

function formatDate(iso: string) {
  if (!iso) return "";
  return iso.replace(/-/g, "/");
}

function formatBirth(iso: string) {
  if (!iso) return "-";
  return iso.replace(/-/g, ".");
}

// ── 이미지 압축 후 Base64 변환 (최대 400px, JPEG 품질 0.7) ──────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const MAX = 400;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ── 관리자 공고 등록 모달 ──────────────────────────────────────
function AdminCreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    title: "", cmName: "", cmProfile: "", cmImage: "",
    genre: "", description: "",
    dateStart: "", dateEnd: "",
    durationMinutes: 120, minHeadcount: 8, maxHeadcount: 15, pricePerPerson: 0,
  });
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setForm({ ...form, cmImage: b64 });
    setImagePreview(b64);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.dateStart > form.dateEnd) {
      alert("시작일이 종료일보다 늦을 수 없습니다.");
      return;
    }
    oneDayClassStore.create(form);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#3B342F]/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#B98768] uppercase">관리자 전용</p>
            <h2 className="text-lg font-bold text-[#3B342F]">클래스 공고 등록</h2>
          </div>
          <button onClick={onClose} className="text-[#6f655d] hover:text-[#B98768]"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 클래스 제목 */}
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">클래스 제목 *</label>
            <input type="text" required value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none"
              placeholder="예: 발라드 보컬 집중 원데이" />
          </div>

          {/* 장르 (자유 입력) */}
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">장르 *</label>
            <input type="text" required value={form.genre}
              onChange={(e) => setForm({ ...form, genre: e.target.value })}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none"
              placeholder="예: 보컬, 댄스, 연기, 뮤지컬 등" />
          </div>

          {/* 날짜 범위 */}
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">
              희망 날짜 범위 * <span className="text-[#b0a89e] font-normal">(YYYY/MM/DD ~ YYYY/MM/DD)</span>
            </label>
            <div className="flex items-center gap-2">
              <input type="date" required value={form.dateStart}
                onChange={(e) => setForm({ ...form, dateStart: e.target.value })}
                className="flex-1 rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] focus:border-[#B98768] focus:outline-none" />
              <span className="text-[#9b9189] text-sm shrink-0">~</span>
              <input type="date" required value={form.dateEnd}
                onChange={(e) => setForm({ ...form, dateEnd: e.target.value })}
                className="flex-1 rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] focus:border-[#B98768] focus:outline-none" />
            </div>
            {form.dateStart && form.dateEnd && (
              <p className="mt-1 text-xs text-[#B98768]">
                {formatDate(form.dateStart)} ~ {formatDate(form.dateEnd)}
              </p>
            )}
          </div>

          {/* CM 사진 */}
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">클래스마스터(CM) 사진</label>
            <div className="flex items-center gap-3">
              {imagePreview ? (
                <img src={imagePreview} alt="CM 사진" className="h-16 w-16 rounded-xl object-cover border border-[#D8CCBC]" />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-[#F7F3EB] border border-[#D8CCBC] flex items-center justify-center">
                  <UserCircle2 className="h-8 w-8 text-[#b0a89e]" />
                </div>
              )}
              <div>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="rounded-lg border border-[#D8CCBC] px-4 py-2 text-xs text-[#3B342F] hover:text-[#B98768] transition-colors">
                  사진 선택
                </button>
                {imagePreview && (
                  <button type="button" onClick={() => { setImagePreview(""); setForm({ ...form, cmImage: "" }); }}
                    className="ml-2 text-xs text-[#9b9189] hover:text-red-400">
                    삭제
                  </button>
                )}
                <p className="mt-1 text-xs text-[#b0a89e]">JPG, PNG (선택사항)</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </div>
          </div>

          {/* CM 이름 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#6f655d] mb-1">클래스마스터(CM) *</label>
              <input type="text" required value={form.cmName}
                onChange={(e) => setForm({ ...form, cmName: e.target.value })}
                className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none"
                placeholder="CM 이름" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6f655d] mb-1">진행 시간 (분)</label>
              <input type="number" min={30} step={30} value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] focus:border-[#B98768] focus:outline-none" />
            </div>
          </div>

          {/* CM 소개 */}
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">CM 소개 *</label>
            <textarea required value={form.cmProfile}
              onChange={(e) => setForm({ ...form, cmProfile: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none resize-none"
              placeholder="경력, 소개 등" />
          </div>

          {/* 클래스 설명 */}
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">클래스 설명 *</label>
            <textarea required value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none resize-none"
              placeholder="클래스 내용, 준비물 등" />
          </div>

          {/* 인원 / 금액 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#6f655d] mb-1">최소 인원</label>
              <input type="number" min={1} value={form.minHeadcount}
                onChange={(e) => setForm({ ...form, minHeadcount: Number(e.target.value) })}
                className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] focus:border-[#B98768] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6f655d] mb-1">최대 인원</label>
              <input type="number" min={1} value={form.maxHeadcount}
                onChange={(e) => setForm({ ...form, maxHeadcount: Number(e.target.value) })}
                className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] focus:border-[#B98768] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6f655d] mb-1">1인당 금액</label>
              <input type="number" min={0} step={1000} value={form.pricePerPerson}
                onChange={(e) => setForm({ ...form, pricePerPerson: Number(e.target.value) })}
                className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] focus:border-[#B98768] focus:outline-none" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="rounded-full border border-[#D8CCBC] px-5 py-2.5 text-sm text-[#6f655d] hover:text-[#B98768]">
              취소
            </button>
            <button type="submit"
              className="rounded-full bg-[#B98768] px-6 py-2.5 text-sm font-bold text-[#F7F3EB] hover:bg-[#a9785c]">
              공고 등록
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 신청 모달 ──────────────────────────────────────────────────
function ApplyModal({ cls, onClose, onSuccess }: {
  cls: LocalOneDayClass; onClose: () => void; onSuccess: () => void;
}) {
  const { data: session } = useSession();
  const [form, setForm] = useState({
    guestName: session?.user?.name ?? "",
    guestGender: "" as "M" | "F" | "",
    guestBirthDate: "",
    guestPhone: "",
    guestEmail: session?.user?.email ?? "",
    selectedDate: cls.dateStart,
    headcount: 1,
    message: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.guestGender) { setError("성별을 선택해주세요."); return; }
    if (!form.guestBirthDate) { setError("생년월일을 입력해주세요."); return; }
    const result = oneDayClassStore.apply(cls.id, form);
    if (!result.success) {
      setError(result.error ?? "오류가 발생했습니다.");
    } else {
      if (form.guestEmail) {
        registerMemberProfile({
          email: form.guestEmail,
          name: form.guestName,
          phone: form.guestPhone,
        });
      }
      onSuccess();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3B342F]/50 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6 shadow-2xl my-8">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#B98768] uppercase">{cls.genre} 원데이클래스 신청</p>
            <h2 className="mt-1 text-lg font-bold text-[#3B342F]">{cls.title}</h2>
          </div>
          <button onClick={onClose} className="text-[#6f655d] hover:text-[#B98768] transition-colors shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 날짜 선택 */}
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">
              참가 날짜 * <span className="text-[#b0a89e] font-normal">({formatDate(cls.dateStart)} ~ {formatDate(cls.dateEnd)})</span>
            </label>
            <input type="date" required
              min={cls.dateStart} max={cls.dateEnd}
              value={form.selectedDate}
              onChange={(e) => setForm({ ...form, selectedDate: e.target.value })}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] focus:border-[#B98768] focus:outline-none" />
          </div>

          {/* 이름 */}
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">이름 *</label>
            <input type="text" required value={form.guestName}
              onChange={(e) => setForm({ ...form, guestName: e.target.value })}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none"
              placeholder="홍길동" />
          </div>

          {/* 성별 */}
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">성별 *</label>
            <div className="flex gap-3">
              {([["M", "남성"], ["F", "여성"]] as const).map(([val, label]) => (
                <button key={val} type="button"
                  onClick={() => setForm({ ...form, guestGender: val })}
                  className={cn(
                    "flex-1 rounded-lg border py-2.5 text-sm font-semibold transition-all",
                    form.guestGender === val
                      ? "border-[#B98768] bg-[#B98768] text-[#F7F3EB]"
                      : "border-[#D8CCBC] bg-[#F7F3EB] text-[#6f655d] hover:text-[#B98768]"
                  )}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 생년월일 */}
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">생년월일 *</label>
            <input type="date" required value={form.guestBirthDate}
              onChange={(e) => setForm({ ...form, guestBirthDate: e.target.value })}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] focus:border-[#B98768] focus:outline-none" />
          </div>

          {/* 연락처 */}
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">전화번호 *</label>
            <input type="tel" required value={form.guestPhone}
              onChange={(e) => setForm({ ...form, guestPhone: e.target.value })}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none"
              placeholder="010-0000-0000" />
          </div>

          {/* 이메일 */}
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">이메일 <span className="text-[#b0a89e]">(선택)</span></label>
            <input type="email" value={form.guestEmail}
              onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none"
              placeholder="선택 사항" />
          </div>

          {/* 하고 싶은 말 */}
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">메모 <span className="text-[#b0a89e]">(선택)</span></label>
            <textarea value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              maxLength={300} rows={2}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none resize-none"
              placeholder="궁금한 점, 요청사항 등" />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-400">{error}</p>
          )}
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-[#9b9189]">1인당 <span className="text-[#3B342F] font-semibold">{cls.pricePerPerson.toLocaleString()}원</span></p>
            <button type="submit"
              className="flex items-center gap-2 rounded-full bg-[#B98768] px-6 py-2.5 text-sm font-bold text-[#F7F3EB] hover:bg-[#a9785c] active:scale-95">
              신청하기 <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 신청자 목록 모달 (관리자) ──────────────────────────────────
function ApplicantsModal({ cls, onClose }: { cls: LocalOneDayClass; onClose: () => void }) {
  const sorted = [...cls.applications].sort((a, b) => a.selectedDate.localeCompare(b.selectedDate));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-[#3B342F]/50 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#B98768] uppercase">관리자 전용</p>
            <h2 className="text-lg font-bold text-[#3B342F]">{cls.title} · 신청자 목록</h2>
            <p className="text-xs text-[#9b9189] mt-0.5">총 {cls.applications.length}명 신청</p>
          </div>
          <button onClick={onClose} className="text-[#6f655d] hover:text-[#B98768]"><X className="h-5 w-5" /></button>
        </div>

        {cls.applications.length === 0 ? (
          <p className="text-center py-10 text-[#9b9189]">아직 신청자가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#D8CCBC] text-xs text-[#9b9189]">
                  <th className="text-left py-2.5 pr-4 font-semibold">선택 날짜</th>
                  <th className="text-left py-2.5 pr-4 font-semibold">이름</th>
                  <th className="text-left py-2.5 pr-4 font-semibold">성별</th>
                  <th className="text-left py-2.5 pr-4 font-semibold">생년월일</th>
                  <th className="text-left py-2.5 font-semibold">전화번호</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((app, idx) => (
                  <tr key={app.id} className={cn("border-b border-[#D8CCBC]/50 hover:bg-[#3B342F]/5 transition-colors", idx % 2 === 0 ? "" : "bg-[#F7F3EB]/[0.02]")}>
                    <td className="py-3 pr-4 text-[#B98768] font-medium">{formatDate(app.selectedDate)}</td>
                    <td className="py-3 pr-4 text-[#3B342F] font-semibold">{app.guestName}</td>
                    <td className="py-3 pr-4 text-[#3B342F]">{GENDER_LABELS[app.guestGender]}</td>
                    <td className="py-3 pr-4 text-[#3B342F]">{formatBirth(app.guestBirthDate)}</td>
                    <td className="py-3 text-[#3B342F]">{app.guestPhone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button onClick={onClose}
            className="rounded-full border border-[#D8CCBC] px-5 py-2.5 text-sm text-[#6f655d] hover:text-[#B98768]">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 성공 모달 ──────────────────────────────────────────────────
function SuccessModal({ minHeadcount, onClose }: { minHeadcount: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3B342F]/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 text-center shadow-2xl">
        <CheckCircle className="mx-auto h-14 w-14 text-emerald-400" />
        <h2 className="mt-4 text-xl font-bold text-[#3B342F]">신청 완료!</h2>
        <p className="mt-2 text-sm text-[#6f655d]">
          원데이클래스 신청이 완료되었습니다.<br />
          최소 인원({minHeadcount}명) 충족 시 확정 안내를 드립니다.
        </p>
        <button onClick={onClose}
          className="mt-6 w-full rounded-full bg-[#B98768] py-3 text-sm font-bold text-[#F7F3EB] hover:bg-[#a9785c] transition-colors">
          확인
        </button>
      </div>
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────
export default function AnnouncementsPage() {
  const { data: session } = useSession();
  const { isAdmin } = useAdmin();
  const { role, isCM } = useMemberRole(session?.user?.email);
  const { members } = useMemberDirectory();
  const canCreateAnnouncement = isAdmin || isCM;
  const [classes, setClasses] = useState<LocalOneDayClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<LocalOneDayClass | null>(null);
  const [viewApplicants, setViewApplicants] = useState<LocalOneDayClass | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMin, setSuccessMin] = useState(8);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterGenre, setFilterGenre] = useState("ALL");
  const [memberSearch, setMemberSearch] = useState("");
  const [promoteMessage, setPromoteMessage] = useState("");

  const load = () => setClasses(oneDayClassStore.getAll());

  useEffect(() => { load(); }, []);

  const genres = ["ALL", ...Array.from(new Set(classes.map((c) => c.genre))).filter(Boolean)];
  const filtered = filterGenre === "ALL" ? classes : classes.filter((c) => c.genre === filterGenre);
  const filteredMembers = members.filter((member) => {
    if (!memberSearch.trim()) return true;
    const keyword = memberSearch.trim().toLowerCase();
    return (
      member.email.toLowerCase().includes(keyword) ||
      member.phone.toLowerCase().includes(keyword) ||
      member.name.toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">One-Day Class</p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">클래스 공고 등록</h1>
          <p className="mt-4 text-base text-[#6f655d] max-w-xl mx-auto">
            원하는 날짜를 선택해 신청하면, 최소 인원 충족 시 확정됩니다.
          </p>
          {session && (
            <p className="mt-3 text-xs text-[#9b9189]">
              현재 회원등급:{" "}
              <span className="font-semibold text-[#3B342F]">
                {role === "CM" ? "CM(클래스마스터)" : "일반회원"}
              </span>
            </p>
          )}
        </div>

        {/* 안내 배너 */}
        <div className="mb-10 rounded-xl border border-[#B98768]/40 bg-[#B98768]/8 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { step: "01", title: "클래스 선택", desc: "원하는 장르와 CM을 선택하세요." },
              { step: "02", title: "날짜 선택 후 신청", desc: "원하는 날짜를 고르고 이름·전화번호를 입력합니다." },
              { step: "03", title: "인원 충족 확정", desc: "최소 인원이 모이면 문자로 확정 안내드립니다." },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <span className="text-3xl font-black text-[#D8CCBC]">{item.step}</span>
                <div>
                  <p className="font-semibold text-[#3B342F] text-sm">{item.title}</p>
                  <p className="text-xs text-[#6f655d] mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {!canCreateAnnouncement && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            클래스 공고 등록은 <span className="font-semibold">CM(클래스마스터)</span> 권한이 필요합니다.
            관리자에게 CM 승격을 요청해주세요.
          </div>
        )}

        {/* 관리자: CM 승격 */}
        {isAdmin && (
          <div className="mb-6 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-4">
            <p className="text-xs font-bold tracking-widest text-[#B98768] uppercase">관리자 전용</p>
            <h2 className="mt-1 text-base font-bold text-[#3B342F]">회원등급 관리 (CM 승격)</h2>
            <p className="mt-1 text-xs text-[#9b9189]">
              가입 회원 목록에서 이메일/전화번호로 검색해 CM 권한을 변경할 수 있습니다.
            </p>

            <div className="mt-3">
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => {
                  setMemberSearch(e.target.value);
                  setPromoteMessage("");
                }}
                placeholder="이메일 또는 전화번호 검색"
                className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 text-sm text-[#3B342F] focus:border-[#B98768] focus:outline-none"
              />
            </div>

            <div className="mt-3 rounded-xl border border-[#D8CCBC] bg-[#F7F3EB]">
              <div className="flex items-center justify-between border-b border-[#D8CCBC] px-3 py-2">
                <p className="text-xs font-semibold text-[#6f655d]">가입 회원 목록</p>
                <p className="text-xs text-[#9b9189]">{filteredMembers.length}명</p>
              </div>
              {filteredMembers.length === 0 ? (
                <p className="px-3 py-3 text-xs text-[#9b9189]">
                  검색 결과가 없습니다. (로그인한 회원만 목록에 표시됩니다)
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto">
                  {filteredMembers.map((member) => (
                    <div key={member.email} className="flex items-center gap-2 border-b border-[#D8CCBC]/60 px-3 py-2 last:border-b-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#3B342F]">{member.email}</p>
                        <p className="text-xs text-[#9b9189]">
                          {member.phone || "전화번호 없음"} · {member.name}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
                          member.role === "CM"
                            ? "border-[#B98768]/40 bg-[#B98768]/10 text-[#B98768]"
                            : "border-[#D8CCBC] bg-[#F7F3EB] text-[#6f655d]"
                        )}
                      >
                        {member.role === "CM" ? "CM" : "일반회원"}
                      </span>
                      <button
                        onClick={async () => {
                          const ok = await setMemberRoleByEmail(member.email, "CM");
                          setPromoteMessage(ok ? `${member.email} 계정을 CM으로 승격했습니다.` : "회원등급 변경에 실패했습니다.");
                        }}
                        className="rounded-lg bg-[#B98768] px-2.5 py-1.5 text-[11px] font-bold text-[#F7F3EB] hover:bg-[#a9785c]"
                      >
                        CM
                      </button>
                      <button
                        onClick={async () => {
                          const ok = await setMemberRoleByEmail(member.email, "MEMBER");
                          setPromoteMessage(ok ? `${member.email} 계정을 일반회원으로 변경했습니다.` : "회원등급 변경에 실패했습니다.");
                        }}
                        className="rounded-lg border border-[#D8CCBC] px-2.5 py-1.5 text-[11px] font-semibold text-[#6f655d] hover:text-[#B98768]"
                      >
                        일반
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {promoteMessage && <p className="mt-2 text-xs text-[#6f655d]">{promoteMessage}</p>}
          </div>
        )}

        {/* 공고 등록 버튼 */}
        {canCreateAnnouncement && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-full bg-[#B98768] px-5 py-2.5 text-sm font-bold text-[#F7F3EB] shadow-lg hover:bg-[#a9785c] transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />공고 등록
            </button>
          </div>
        )}

        {/* 장르 필터 탭 (동적) */}
        {genres.length > 1 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {genres.map((g) => (
              <button key={g} onClick={() => setFilterGenre(g)}
                className={cn("rounded-full px-4 py-1.5 text-sm font-semibold border transition-all",
                  filterGenre === g ? "bg-[#B98768] border-[#B98768] text-[#F7F3EB]" : "border-[#D8CCBC] text-[#6f655d] hover:border-[#D8CCBC] hover:text-[#B98768]"
                )}>
                {g === "ALL" ? "전체" : g}
              </button>
            ))}
          </div>
        )}

        {/* 클래스 목록 */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-[#9b9189]">현재 모집 중인 원데이클래스가 없습니다.</p>
            <p className="mt-2 text-sm text-[#b0a89e]">곧 새로운 클래스가 열릴 예정입니다.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {filtered.map((cls) => {
              const statusInfo = STATUS_MAP[cls.status] ?? STATUS_MAP.OPEN;
              const currentCount = cls.applications.length;
              const progressPct = Math.min((currentCount / cls.minHeadcount) * 100, 100);
              const isCancelled = cls.status === "CANCELLED";

              return (
                <div key={cls.id} className="group rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6 transition-all hover:border-[#B98768]/40 flex flex-col">
                  {/* 상태 + 삭제 */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wide text-[#B98768] border-[#B98768]/40 bg-[#B98768]/10">
                        {cls.genre}
                      </span>
                      <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", statusInfo.color)}>
                        {statusInfo.label}
                      </span>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewApplicants(cls)}
                          className="rounded-lg px-2.5 py-1.5 text-xs text-[#6f655d] hover:bg-[#B98768]/10 hover:text-[#B98768] transition-colors flex items-center gap-1"
                        >
                          <Users className="h-3.5 w-3.5" />신청자
                        </button>
                        <button
                          onClick={() => { oneDayClassStore.delete(cls.id); load(); }}
                          className="rounded-lg p-1.5 text-[#9b9189] hover:bg-red-50 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-[#3B342F] text-lg mb-3 leading-tight">{cls.title}</h3>

                  {/* CM 정보 */}
                  <div className="mb-4 rounded-xl bg-[#F7F3EB]/60 px-4 py-3 flex items-center gap-3">
                    {cls.cmImage ? (
                      <img src={cls.cmImage} alt={cls.cmName}
                        className="h-11 w-11 rounded-full object-cover border border-[#D8CCBC] shrink-0" />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-[#D8CCBC] flex items-center justify-center shrink-0">
                        <UserCircle2 className="h-6 w-6 text-[#9b9189]" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-[#9b9189] mb-0.5">클래스마스터 (CM)</p>
                      <p className="text-sm font-semibold text-[#3B342F]">{cls.cmName}</p>
                      <p className="text-xs text-[#6f655d] truncate">{cls.cmProfile}</p>
                    </div>
                  </div>

                  <p className="mb-4 text-sm text-[#6f655d] line-clamp-2 flex-1">{cls.description}</p>

                  {/* 날짜 범위 */}
                  <div className="flex flex-wrap gap-3 mb-4 text-xs text-[#6f655d]">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[#B98768]" />
                      {formatDate(cls.dateStart)} ~ {formatDate(cls.dateEnd)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-[#B98768]" />
                      {currentCount}명 / 최소 {cls.minHeadcount}명
                    </span>
                  </div>

                  {/* 진행 바 */}
                  <div className="mb-4">
                    <div className="h-1.5 w-full rounded-full bg-[#D8CCBC]">
                      <div
                        className={cn("h-1.5 rounded-full transition-all", progressPct >= 100 ? "bg-emerald-400" : "bg-[#B98768]")}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-right text-xs text-[#9b9189]">
                      {progressPct >= 100 ? "인원 충족!" : `${cls.minHeadcount - currentCount}명 더 필요`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <p className="text-sm text-[#6f655d]">
                      1인당 <span className="text-base font-bold text-[#3B342F]">{cls.pricePerPerson.toLocaleString()}원</span>
                    </p>
                    <button
                      onClick={() => !isCancelled && setSelectedClass(cls)}
                      disabled={isCancelled}
                      className={cn("flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-bold transition-all active:scale-95",
                        isCancelled ? "bg-[#D8CCBC] text-[#9b9189] cursor-not-allowed" : "bg-[#B98768] text-[#F7F3EB] hover:bg-[#a9785c]"
                      )}>
                      {isCancelled ? "취소됨" : "신청하기"}
                      {!isCancelled && <ChevronRight className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedClass && !showSuccess && (
        <ApplyModal
          cls={selectedClass}
          onClose={() => setSelectedClass(null)}
          onSuccess={() => {
            setSuccessMin(selectedClass.minHeadcount);
            setSelectedClass(null);
            setShowSuccess(true);
            load();
          }}
        />
      )}

      {showSuccess && <SuccessModal minHeadcount={successMin} onClose={() => setShowSuccess(false)} />}
      {showCreateModal && <AdminCreateModal onClose={() => setShowCreateModal(false)} onSaved={load} />}
      {viewApplicants && <ApplicantsModal cls={viewApplicants} onClose={() => setViewApplicants(null)} />}
    </div>
  );
}
