"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BoardWriteForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });

      const data = (await res.json()) as { error?: string; post?: { id: string } };

      if (!res.ok) {
        throw new Error(data.error || "글 작성에 실패했습니다.");
      }

      if (!data.post?.id) {
        throw new Error("글 작성에 실패했습니다.");
      }

      router.push(`/board/${data.post.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "글 작성에 실패했습니다.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
          제목
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목을 입력하세요"
          className="w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-[var(--color-text)] placeholder-[var(--color-text-subtle)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
          내용
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용을 입력하세요"
          rows={15}
          className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-[var(--color-text)] placeholder-[var(--color-text-subtle)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
          required
        />
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-full bg-[var(--color-accent)] px-6 py-3 font-semibold text-white transition-all hover:bg-[var(--color-accent-hover)] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "작성 중..." : "작성 완료"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="flex-1 rounded-full border-2 border-[var(--color-border)] px-6 py-3 font-semibold text-[var(--color-text)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
        >
          취소
        </button>
      </div>
    </form>
  );
}
