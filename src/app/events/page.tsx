"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Trash2, X } from "lucide-react";
import { useAdmin } from "@/lib/admin-context";
import { eventStore, type LocalEvent } from "@/lib/local-store";

const COLORS = [
  "from-[#B98768]/15 to-[#B98768]/15",
  "from-[#EFE7DA]/20 to-[#B98768]/15",
  "from-[#EFE7DA]/20 to-[#EFE7DA]/20",
  "from-[#EFE7DA]/20 to-[#EFE7DA]/20",
];

function AdminWriteModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ title: "", content: "", startsAt: "", endsAt: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    eventStore.create({
      title: form.title,
      content: form.content,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
    });
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3B342F]/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#3B342F]">이벤트 작성</h2>
          <button onClick={onClose} className="text-[#6f655d] hover:text-[#B98768]"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">제목 *</label>
            <input
              type="text" required value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none"
              placeholder="이벤트 제목"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">내용 *</label>
            <textarea
              required value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={5}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none resize-none"
              placeholder="이벤트 내용"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#6f655d] mb-1">시작일</label>
              <input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] focus:border-[#B98768] focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6f655d] mb-1">종료일</label>
              <input type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] focus:border-[#B98768] focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="rounded-full border border-[#D8CCBC] px-5 py-2.5 text-sm text-[#6f655d] hover:text-[#B98768]">취소</button>
            <button type="submit" className="rounded-full bg-[#B98768] px-6 py-2.5 text-sm font-bold text-[#F7F3EB] hover:bg-[#a9785c]">저장</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatPeriod(startsAt: string | null, endsAt: string | null) {
  if (!startsAt && !endsAt) return null;
  const fmt = (d: string) => new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "numeric", day: "numeric" });
  if (startsAt && endsAt) return `${fmt(startsAt)} – ${fmt(endsAt)}`;
  if (startsAt) return `${fmt(startsAt)} 시작`;
  return `${fmt(endsAt!)} 종료`;
}

export default function EventsPage() {
  const { isAdmin } = useAdmin();
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [showWriteModal, setShowWriteModal] = useState(false);

  const load = () => setEvents(eventStore.getAll());

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">Events</p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">이벤트</h1>
        </div>

        {isAdmin && (
          <div className="mb-5 flex justify-end">
            <button
              onClick={() => setShowWriteModal(true)}
              className="flex items-center gap-2 rounded-full bg-[#B98768] px-5 py-2.5 text-sm font-bold text-[#F7F3EB] shadow-lg hover:bg-[#a9785c] transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />이벤트 작성
            </button>
          </div>
        )}

        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D8CCBC] py-16 text-center text-[#9b9189]">
            등록된 이벤트가 없습니다.
          </div>
        ) : (
          <div className="space-y-6">
            {events.map((event, idx) => (
              <div key={event.id} className="overflow-hidden rounded-2xl border border-[#D8CCBC]">
                <div className={`h-36 bg-gradient-to-br ${COLORS[idx % COLORS.length]} flex items-center justify-center relative`}>
                  <Calendar className="h-12 w-12 text-[#3B342F]/30" />
                  {isAdmin && (
                    <button
                      onClick={() => { eventStore.delete(event.id); load(); }}
                      className="absolute top-3 right-3 rounded-lg bg-[#3B342F]/40 p-2 text-[#3B342F] hover:bg-red-50 hover:text-red-400 transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="bg-[#EFE7DA] p-6">
                  {formatPeriod(event.startsAt, event.endsAt) && (
                    <p className="text-xs text-[#9b9189]">{formatPeriod(event.startsAt, event.endsAt)}</p>
                  )}
                  <h2 className="mt-1 text-xl font-bold text-[#3B342F]">{event.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#6f655d] whitespace-pre-wrap">{event.content}</p>
                </div>
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
