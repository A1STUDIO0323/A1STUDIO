import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getBoardPostDetailWithViewIncrement,
  getBoardPostMeta,
} from "@/lib/board-db";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const post = await getBoardPostMeta(id);
  if (!post) return {};
  return {
    title: `${post.title} | 자유게시판 | A1 STUDIO`,
    description: post.content.replace(/\s+/g, " ").slice(0, 160),
  };
}

export default async function BoardPostPage({ params }: Props) {
  const { id } = await params;

  const post = await getBoardPostDetailWithViewIncrement(id);

  if (!post) notFound();

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
            >
              홈
            </Link>
            <span className="text-[var(--color-text-subtle)]">/</span>
            <Link
              href="/board"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
            >
              자유게시판
            </Link>
            <span className="text-[var(--color-text-subtle)]">/</span>
            <span className="truncate text-[var(--color-text)]">{post.title}</span>
          </div>
        </div>
      </div>

      <article className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        <h1 className="mb-6 text-2xl font-bold text-[var(--color-text)] sm:text-3xl">
          {post.title}
        </h1>
        <div className="mb-8 flex flex-wrap gap-x-4 gap-y-1 border-b border-[var(--color-border)] pb-6 text-sm text-[var(--color-text-subtle)]">
          <span>{post.author.name || "익명"}</span>
          <span>·</span>
          <time dateTime={post.createdAt.toISOString()}>
            {new Date(post.createdAt).toLocaleString("ko-KR")}
          </time>
          <span>·</span>
          <span>조회 {post.viewCount}</span>
        </div>
        <div className="whitespace-pre-wrap break-words leading-relaxed text-[var(--color-text)]">
          {post.content}
        </div>
        <div className="mt-10">
          <Link
            href="/board"
            className="inline-flex rounded-full border-2 border-[var(--color-border)] px-6 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-all hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            목록으로
          </Link>
        </div>
      </article>
    </div>
  );
}
