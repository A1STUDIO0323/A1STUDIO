"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Eye,
  MessageSquare,
  Pin,
  Search,
  ThumbsUp,
} from "lucide-react";

interface Category {
  name: string;
  count: number;
  isOfficial: boolean;
}

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  categoryText: string | null;
  views: number;
  isNotice: boolean;
  isPinned: boolean;
  commentCount: number;
  likeCount: number;
  createdAt: string;
}

function BoardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedCategory = searchParams.get("category");

  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [threshold, setThreshold] = useState(10);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    fetch("/api/board/categories", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { success?: boolean; categories?: Category[]; threshold?: number }) => {
        if (data.success && data.categories) {
          setCategories(data.categories);
          if (typeof data.threshold === "number") setThreshold(data.threshold);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory]);

  useEffect(() => {
    setLoading(true);
    const url = selectedCategory
      ? `/api/board?category=${encodeURIComponent(selectedCategory)}&page=${page}`
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
  }, [selectedCategory, page]);

  const handleCategoryClick = (name: string | null) => {
    setPage(1);
    setSearchInput("");
    if (name) router.push(`/board?category=${encodeURIComponent(name)}`);
    else router.push("/board");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      handleCategoryClick(searchInput.trim());
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-20 pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-4xl font-bold text-[var(--color-text)]">
            자유게시판
          </h1>
          <p className="mb-2 text-[var(--color-text-muted)]">
            A1 STUDIO 회원들과 자유롭게 소통하세요
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/board/guide"
              className="text-sm text-[var(--color-accent)] hover:underline"
            >
              이용 안내 보기
            </Link>
            <Link
              href="/board/lost"
              className="text-sm text-[var(--color-accent)] hover:underline"
            >
              분실물 게시판
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">
              정식 카테고리 ({threshold}개 이상)
            </h2>
            <span className="text-sm text-[var(--color-text-muted)]">
              {categories.length}개
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleCategoryClick(null)}
              className={`rounded-xl px-4 py-2 transition-colors ${
                !selectedCategory
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-border)]"
              }`}
            >
              전체
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => handleCategoryClick(cat.name)}
                className={`rounded-xl px-4 py-2 transition-colors ${
                  selectedCategory === cat.name
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-border)]"
                }`}
              >
                {cat.name}
                <span className="ml-1 text-xs opacity-70">({cat.count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="카테고리 검색 (예: 보컬 팁, 댄스 후기)"
              className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              maxLength={20}
            />
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-6 py-3 text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              <Search className="h-5 w-5" aria-hidden />
              검색
            </button>
          </form>
        </div>

        <div className="mb-6 flex justify-end">
          <Link
            href="/board/write"
            className="rounded-xl bg-[var(--color-accent)] px-6 py-3 text-white transition-colors hover:bg-[var(--color-accent-hover)]"
          >
            글쓰기
          </Link>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[var(--color-text-muted)]">
            로딩 중...
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center text-[var(--color-text-muted)]">
            {selectedCategory
              ? `"${selectedCategory}" 카테고리에 게시글이 없습니다`
              : "게시글이 없습니다"}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-[var(--color-surface)] p-6 transition-shadow hover:shadow-lg"
              >
                <Link href={`/board/${post.id}`}>
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {post.isPinned && (
                          <Pin
                            className="h-4 w-4 text-[var(--color-accent)]"
                            aria-hidden
                          />
                        )}
                        {post.categoryText && (
                          <span className="rounded bg-[var(--color-bg)] px-2 py-1 text-xs text-[var(--color-text-muted)]">
                            {post.categoryText}
                          </span>
                        )}
                        {post.isNotice && (
                          <span className="rounded bg-[var(--color-accent)] px-2 py-1 text-xs text-white">
                            공지
                          </span>
                        )}
                      </div>
                      <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)] transition-colors hover:text-[var(--color-accent)]">
                        {post.title}
                      </h3>
                      <p className="line-clamp-2 text-sm text-[var(--color-text-muted)]">
                        {post.content}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-4 w-4" aria-hidden />
                      {post.views}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" aria-hidden />
                      {post.commentCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" aria-hidden />
                      {post.likeCount}
                    </span>
                    <span className="ml-auto">
                      {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`rounded-xl px-4 py-2 transition-colors ${
                  p === page
                    ? "bg-[var(--color-accent)] text-white"
                    : "bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-border)]"
                }`}
              >
                {p}
              </button>
            ))}
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
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] pt-24">
          <p className="text-[var(--color-text-muted)]">로딩 중...</p>
        </div>
      }
    >
      <BoardContent />
    </Suspense>
  );
}
