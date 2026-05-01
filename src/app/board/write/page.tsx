"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function BoardWritePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/board/categories", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { success?: boolean; categories?: Category[] }) => {
        if (data.success && data.categories) setCategories(data.categories);
      })
      .catch(() => {});
  }, []);

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
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          categorySlug: categorySlug || null,
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
    <div className="min-h-screen bg-[var(--color-bg)] py-12 sm:py-16">
      <div className="mx-auto max-w-3xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href="/board"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
          >
            ← 목록
          </Link>
          <h1 className="mt-4 font-serif text-3xl font-bold text-[var(--color-text)] md:text-4xl">
            글쓰기
          </h1>
        </motion.div>

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8"
        >
          <div className="space-y-6">
            <div>
              <label
                htmlFor="board-category"
                className="mb-2 block text-sm font-medium text-[var(--color-text-muted)]"
              >
                카테고리 (선택)
              </label>
              <select
                id="board-category"
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              >
                <option value="">카테고리 없음 (전체 게시판)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="board-title"
                className="mb-2 block text-sm font-medium text-[var(--color-text-muted)]"
              >
                제목 *
              </label>
              <input
                id="board-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                maxLength={200}
              />
            </div>

            <div>
              <label
                htmlFor="board-content"
                className="mb-2 block text-sm font-medium text-[var(--color-text-muted)]"
              >
                내용 *
              </label>
              <textarea
                id="board-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용을 입력하세요"
                rows={15}
                className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-3 text-[var(--color-text)] transition-colors hover:bg-[var(--color-border)] sm:flex-none sm:min-w-[120px]"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-[var(--color-accent)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-60 sm:flex-none sm:min-w-[160px]"
              >
                {submitting ? "작성 중..." : "작성 완료"}
              </button>
            </div>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
