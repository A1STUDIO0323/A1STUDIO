"use client";

import { useState, useEffect } from "react";
import { Pin, Plus, Trash2, X, PinOff } from "lucide-react";
import { useAdmin } from "@/lib/admin-context";
import { noticeStore, type LocalNotice } from "@/lib/local-store";
import { cn } from "@/lib/utils";

function AdminWriteModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: "", content: "", isPinned: false });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    noticeStore.create(form);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3B342F]/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#3B342F]">공지사항 작성</h2>
          <button onClick={onClose} className="text-[#6f655d] hover:text-[#B98768]"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">제목 *</label>
            <input
              type="text" required value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none"
              placeholder="공지 제목"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">내용 *</label>
            <textarea
              required value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={6}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none resize-none"
              placeholder="공지 내용"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} className="h-4 w-4 accent-[#B98768]" />
            <span className="text-sm text-[#3B342F]">상단 고정</span>
          </label>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="rounded-full border border-[#D8CCBC] px-5 py-2.5 text-sm text-[#6f655d] hover:text-[#B98768]">취소</button>
            <button type="submit" className="rounded-full bg-[#B98768] px-6 py-2.5 text-sm font-bold text-[#F7F3EB] hover:bg-[#a9785c]">저장</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NoticesPage() {
  const { isAdmin } = useAdmin();
  const [notices, setNotices] = useState<LocalNotice[]>([]);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = () => setNotices(noticeStore.getAll());

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">Notices</p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">공지사항</h1>
        </div>

        {isAdmin && (
          <div className="mb-5 flex justify-end">
            <button
              onClick={() => setShowWriteModal(true)}
              className="flex items-center gap-2 rounded-full bg-[#B98768] px-5 py-2.5 text-sm font-bold text-[#F7F3EB] shadow-lg hover:bg-[#a9785c] transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />공지 작성
            </button>
          </div>
        )}

        {notices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D8CCBC] py-16 text-center text-[#9b9189]">
            등록된 공지사항이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-white/5 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] overflow-hidden">
            {notices.map((notice) => (
              <div key={notice.id}>
                <div
                  className={cn("flex items-start justify-between gap-4 px-6 py-5 cursor-pointer hover:bg-[#3B342F]/5 transition-colors", expandedId === notice.id && "bg-[#F7F3EB]/5")}
                  onClick={() => setExpandedId(expandedId === notice.id ? null : notice.id)}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {notice.isPinned && <Pin className="mt-0.5 h-4 w-4 shrink-0 text-[#B98768]" />}
                    <p className={cn("text-sm font-medium truncate", notice.isPinned ? "text-[#3B342F]" : "text-[#3B342F]")}>
                      {notice.title}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-[#b0a89e]">
                      {new Date(notice.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                    {isAdmin && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => { noticeStore.togglePin(notice.id); load(); }}
                          className={cn("rounded-lg p-1.5 transition-colors", notice.isPinned ? "text-[#B98768] hover:bg-[#B98768]/10" : "text-[#9b9189] hover:bg-[#EFE7DA] hover:text-[#F7F3EB]")}
                          title={notice.isPinned ? "고정 해제" : "상단 고정"}
                        >
                          {notice.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => { noticeStore.delete(notice.id); load(); }}
                          className="rounded-lg p-1.5 text-[#9b9189] hover:bg-red-50 hover:text-red-400 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {expandedId === notice.id && (
                  <div className="px-6 pb-5 border-t border-[#D8CCBC]/50">
                    <p className="mt-4 text-sm leading-relaxed text-[#6f655d] whitespace-pre-wrap">{notice.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showWriteModal && (
        <AdminWriteModal onClose={() => setShowWriteModal(false)} onSaved={load} />
      )}
    </div>
  );
}
