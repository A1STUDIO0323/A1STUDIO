"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Eye,
  MessageSquare,
  Pin,
  CheckCircle2,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount?: number;
  isOfficial: boolean;
}

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  category: { name: string; slug: string } | null;
  views: number;
  isNotice: boolean;
  isPinned: boolean;
  commentCount: number;
  likeCount: number;
  createdAt: string;
}

function BoardListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categorySlug = searchParams.get("category");

  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetch("/api/board/categories", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { success?: boolean; categories?: Category[] }) => {
        if (data.success && data.categories) setCategories(data.categories);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [categorySlug]);

  useEffect(() => {
    setLoading(true);
    const url = categorySlug
      ? `/api/board?categorySlug=${encodeURIComponent(categorySlug)}&page=${page}`
      : `/api/board?page=${page}`;

    fetch(url, { cache: "no-store" })
      .then((res) => res.json())
      .then(
        (data: {
          success?: boolean;
          posts?: Post[];
          pagination?: { totalPages: number };
        }) => {
          if (data.success && data.posts) {
            setPosts(data.posts);
            setTotalPages(data.pagination?.totalPages ?? 1);
          } else {
            setPosts([]);
            setTotalPages(1);
          }
          setLoading(false);
        }
      )
      .catch(() => {
        setPosts([]);
        setLoading(false);
      });
  }, [categorySlug, page]);

  const handleCategoryClick = (slug: string | null) => {
    setPage(1);
    if (slug) router.push(`/board?category=${encodeURIComponent(slug)}`);
    else router.push("/board");
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="border-b border-[var(--color-border)] bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-bg)] py-14 sm:py-20"
      >
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
            Community
          </p>
          <h1 className="font-serif text-4xl font-bold tracking-tight text-[var(--color-text)] md:text-5xl">
            자유게시판
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[var(--color-text-muted)]">
            A1 STUDIO 회원들과 자유롭게 소통하세요.
          </p>
        </div>
      </motion.section>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleCategoryClick(null)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                !categorySlug
                  ? "bg-[var(--color-accent)] text-white shadow-sm"
                  : "bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-border)]"
              }`}
            >
              전체
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.slug)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  categorySlug === cat.slug
                    ? "bg-[var(--color-accent)] text-white shadow-sm"
                    : "bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-border)]"
                }`}
              >
                {cat.name}
                {cat.isOfficial && (
                  <CheckCircle2
                    className="h-3.5 w-3.5 opacity-90"
                    aria-hidden
                  />
                )}
              </button>
            ))}
          </div>
          <Link
            href="/board/write"
            className="rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] hover:shadow-md"
          >
            글쓰기
          </Link>
        </div>

        {loading ? (
          <p className="py-24 text-center text-[var(--color-text-muted)]">
            로딩 중...
          </p>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] py-24 text-center text-[var(--color-text-muted)]">
            게시글이 없습니다.
          </div>
        ) : (
          <ul className="space-y-3">
            {posts.map((post, i) => (
              <motion.li
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.35) }}
              >
                <Link
                  href={`/board/${post.id}`}
                  className="block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-all hover:border-[var(--color-accent)] hover:shadow-lg"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-muted)]">
                        {post.isPinned && (
                          <Pin
                            className="h-3.5 w-3.5 text-[var(--color-accent)]"
                            aria-hidden
                          />
                        )}
                        {post.category && (
                          <span className="rounded-lg bg-[var(--color-bg)] px-2 py-0.5 font-medium">
                            {post.category.name}
                          </span>
                        )}
                        {post.isNotice && (
                          <span className="rounded-lg bg-[var(--color-accent)]/15 px-2 py-0.5 font-semibold text-[var(--color-accent)]">
                            공지
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg font-semibold text-[var(--color-text)]">
                        {post.title}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-muted)]">
                        {post.content}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[var(--color-border)]/60 pt-3 text-xs text-[var(--color-text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {post.views}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {post.commentCount}
                    </span>
                    <span>
                      좋아요 {post.likeCount}
                    </span>
                    <span>
                      {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                </Link>
              </motion.li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
              (p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`min-w-[40px] rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    p === page
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-border)]"
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BoardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] text-[var(--color-text-muted)]">
          로딩 중...
        </div>
      }
    >
      <BoardListContent />
    </Suspense>
  );
}
