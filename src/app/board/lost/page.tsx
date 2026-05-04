"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ImageIcon, Plus, Trash2, X, Upload } from "lucide-react";
import { useAdmin, ADMIN_PASSWORD_SESSION_KEY } from "@/lib/admin-context";
import { createClient } from "@/lib/supabase/client";

interface LostItem {
  id: string;
  title: string;
  content: string;
  images: string[];
  createdAt: string;
}

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function getAdminPassword(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) ?? "";
}

function AdminWriteModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ title: "", content: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files];
    for (const f of Array.from(incoming)) {
      if (next.length >= MAX_IMAGES) break;
      if (!f.type.startsWith("image/")) {
        setError("이미지 파일만 업로드 가능합니다.");
        continue;
      }
      if (f.size > MAX_IMAGE_SIZE) {
        setError("이미지는 5MB 이하만 업로드 가능합니다.");
        continue;
      }
      next.push(f);
    }
    setFiles(next);
  };

  const removeFile = (idx: number) => {
    setFiles(files.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.title.trim() || !form.content.trim()) {
      setError("제목과 내용을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const adminPassword = getAdminPassword();
      const imageUrls: string[] = [];

      if (files.length > 0) {
        const supabase = createClient();
        for (const file of files) {
          const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
          const filename = `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("lost-item-images")
            .upload(filename, file, {
              contentType: file.type,
              upsert: false,
            });
          if (upErr) {
            setError("이미지 업로드에 실패했습니다.");
            setSubmitting(false);
            return;
          }
          const { data } = supabase.storage
            .from("lost-item-images")
            .getPublicUrl(filename);
          imageUrls.push(data.publicUrl);
        }
      }

      const res = await fetch("/api/lost-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminPassword,
          title: form.title.trim(),
          content: form.content.trim(),
          images: imageUrls,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "등록에 실패했습니다.");
        setSubmitting(false);
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("등록 중 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#3B342F]/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#3B342F]">분실물 등록</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#6f655d] hover:text-[#B98768]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">
              제목 *
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] focus:border-[#B98768] focus:outline-none"
              placeholder="예: 1번 룸에서 검정 무선이어폰 발견"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">
              내용 (특징·발견 위치·시간 등) *
            </label>
            <textarea
              required
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={6}
              className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2.5 text-sm text-[#3B342F] focus:border-[#B98768] focus:outline-none resize-none"
              placeholder="고가품의 경우 사칭 방지를 위해 사진보다 글로 자세한 특징을 먼저 적어주세요."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6f655d] mb-1">
              사진 (선택, 최대 {MAX_IMAGES}장 · 각 5MB 이하)
            </label>
            <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#D8CCBC] bg-[#F7F3EB] px-3 py-4 text-sm text-[#6f655d] cursor-pointer hover:border-[#B98768]">
              <Upload className="h-4 w-4" />
              사진 선택
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleAddFiles(e.target.files)}
              />
            </label>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between rounded-md bg-[#F7F3EB] px-2 py-1 text-xs text-[#3B342F]"
                  >
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-[#9b9189] hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#D8CCBC] px-5 py-2.5 text-sm text-[#6f655d] hover:text-[#B98768]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-[#B98768] px-6 py-2.5 text-sm font-bold text-[#F7F3EB] hover:bg-[#a9785c] disabled:opacity-50"
            >
              {submitting ? "등록 중..." : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LostBoardPage() {
  const { isAdmin } = useAdmin();
  const [items, setItems] = useState<LostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWrite, setShowWrite] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lost-items", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const normalized: LostItem[] = (Array.isArray(data) ? data : []).map(
          (it: {
            id: string;
            title: string;
            content: string;
            images: unknown;
            createdAt: string;
          }) => ({
            id: it.id,
            title: it.title,
            content: it.content,
            images: Array.isArray(it.images) ? (it.images as string[]) : [],
            createdAt: it.createdAt,
          })
        );
        setItems(normalized);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const adminPassword = getAdminPassword();
    const res = await fetch("/api/lost-items", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminPassword, id }),
    });
    if (res.ok) void load();
    else alert("삭제에 실패했습니다.");
  };

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
            Lost &amp; Found
          </p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">
            분실물
          </h1>
          <p className="mt-3 text-sm text-[#6f655d]">
            분실물은 글로 먼저 자세히 확인 후, 사진은 본인 확인을 위한 보조
            자료로만 활용해 주세요.
          </p>
          <div className="mt-3">
            <Link
              href="/board"
              className="text-xs text-[#B98768] hover:underline"
            >
              ← 게시판으로 돌아가기
            </Link>
          </div>
        </div>

        {isAdmin && (
          <div className="mb-5 flex justify-end">
            <button
              type="button"
              onClick={() => setShowWrite(true)}
              className="flex items-center gap-2 rounded-full bg-[#B98768] px-5 py-2.5 text-sm font-bold text-[#F7F3EB] shadow-lg hover:bg-[#a9785c] transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              분실물 등록
            </button>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-dashed border-[#D8CCBC] py-16 text-center text-[#9b9189]">
            로딩 중...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D8CCBC] py-16 text-center text-[#9b9189]">
            등록된 분실물이 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-[#D8CCBC]/60 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] overflow-hidden">
            {items.map((item) => {
              const expanded = expandedId === item.id;
              return (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(expanded ? null : item.id)
                    }
                    className="w-full text-left flex items-start justify-between gap-4 px-6 py-5 hover:bg-[#3B342F]/5 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#3B342F] truncate">
                          {item.title}
                        </p>
                        {!expanded && (
                          <p className="mt-1 text-xs text-[#6f655d] line-clamp-1">
                            {item.content}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.images.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-[#9b9189]">
                          <ImageIcon className="h-3.5 w-3.5" />
                          {item.images.length}
                        </span>
                      )}
                      <span className="text-xs text-[#b0a89e]">
                        {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                      </span>
                      {isAdmin && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(item.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              void handleDelete(item.id);
                            }
                          }}
                          className="rounded-lg p-1.5 text-[#9b9189] hover:bg-red-50 hover:text-red-400 transition-colors cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                  </button>
                  {expanded && (
                    <div className="px-6 pb-6 border-t border-[#D8CCBC]/50">
                      <p className="mt-4 text-sm leading-relaxed text-[#3B342F] whitespace-pre-wrap">
                        {item.content}
                      </p>
                      {item.images.length > 0 && (
                        <div className="mt-5">
                          <p className="mb-2 text-xs font-semibold text-[#6f655d]">
                            첨부 사진 (본인 확인 보조용)
                          </p>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {item.images.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block aspect-square overflow-hidden rounded-lg bg-[#F7F3EB]"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`${item.title} 사진 ${idx + 1}`}
                                  className="h-full w-full object-cover"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showWrite && (
        <AdminWriteModal
          onClose={() => setShowWrite(false)}
          onSaved={() => void load()}
        />
      )}
    </div>
  );
}
