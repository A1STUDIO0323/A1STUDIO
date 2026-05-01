"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

export default function BoardWritePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryText, setCategoryText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/board/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          categoryText: categoryText.trim() || null,
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        post?: { id: string };
      };

      if (data.success && data.post?.id) {
        alert("게시글이 작성되었습니다");
        router.push(`/board/${data.post.id}`);
      } else {
        alert(data.error || "게시글 작성 실패");
      }
    } catch {
      alert("오류가 발생했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-20 pt-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[var(--color-surface)] p-8"
        >
          <h1 className="mb-8 text-3xl font-bold text-[var(--color-text)]">
            글쓰기
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                카테고리 (선택, 직접 입력)
              </label>
              <input
                type="text"
                value={categoryText}
                onChange={(e) => setCategoryText(e.target.value)}
                placeholder="예: 보컬 팁, 댄스 후기, 연습실 꿀팁 (20자 이내)"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                maxLength={20}
              />
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                같은 카테고리가 10개 이상 모이면 정식 카테고리로 승격됩니다
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                제목 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                maxLength={200}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                내용 *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용을 입력하세요"
                rows={15}
                className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 rounded-xl bg-[var(--color-bg)] px-6 py-3 text-[var(--color-text)] transition-colors hover:bg-[var(--color-border)]"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-[var(--color-accent)] px-6 py-3 text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
              >
                {submitting ? "작성 중..." : "작성 완료"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
