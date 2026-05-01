"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Eye,
  EyeOff,
  Lock,
  MessageSquare,
  Pin,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { ADMIN_PASSWORD_SESSION_KEY, useAdmin } from "@/lib/admin-context";

function adminBoardHeaders(): HeadersInit {
  const pw =
    typeof window !== "undefined"
      ? sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) ?? ""
      : "";
  return {
    "Content-Type": "application/json",
    "x-admin-password": pw,
  };
}

interface PostRow {
  id: string;
  title: string;
  categoryText: string | null;
  authorId: string;
  views: number;
  isNotice: boolean;
  isPinned: boolean;
  isHidden: boolean;
  commentCount: number;
  likeCount: number;
  createdAt: string;
}

export default function AdminBoardPage() {
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/board?page=${page}`, {
        cache: "no-store",
        credentials: "include",
        headers: adminBoardHeaders(),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        posts?: PostRow[];
        pagination?: { totalPages: number; total?: number };
      };

      if (data.success && data.posts) {
        setPosts(data.posts);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setTotalCount(data.pagination?.total ?? data.posts.length);
      } else {
        alert(data.error || "게시글 조회 실패");
        if (res.status === 401 || res.status === 403) {
          router.push("/admin");
        }
      }
    } catch {
      alert("오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }, [page, router]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadPosts();
  }, [isAdmin, loadPosts]);

  const toggleSelectAll = () => {
    if (posts.length === 0) return;
    if (selectedIds.size === posts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(posts.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      alert("삭제할 게시글을 선택해주세요");
      return;
    }

    if (!confirm(`선택한 ${selectedIds.size}개 게시글을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const res = await fetch("/api/admin/board", {
        method: "DELETE",
        headers: adminBoardHeaders(),
        credentials: "include",
        body: JSON.stringify({
          postIds: Array.from(selectedIds),
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        deletedCount?: number;
        error?: string;
      };

      if (data.success && typeof data.deletedCount === "number") {
        alert(`${data.deletedCount}개 게시글이 삭제되었습니다`);
        setSelectedIds(new Set());
        await loadPosts();
      } else {
        alert(data.error || "삭제 실패");
      }
    } catch {
      alert("오류가 발생했습니다");
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--color-bg)] px-4 pt-24">
        <Lock className="h-12 w-12 text-[var(--color-accent)]" aria-hidden />
        <p className="text-center text-[var(--color-text-muted)]">
          관리자 로그인이 필요합니다.
        </p>
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="rounded-xl bg-[var(--color-accent)] px-8 py-3 font-semibold text-white hover:bg-[var(--color-accent-hover)]"
        >
          관리자 로그인으로 이동
        </button>
      </div>
    );
  }

  const allOnPageSelected =
    posts.length > 0 && selectedIds.size === posts.length;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-20 pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-2">
          <Link
            href="/admin"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
          >
            ← 관리자 대시보드
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-[var(--color-text)]">
            게시판 관리
          </h1>
          <p className="text-[var(--color-text-muted)]">
            전체 게시글: {totalCount}건 (이 페이지 {posts.length}건)
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-4 rounded-xl bg-[var(--color-surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={allOnPageSelected}
              onChange={toggleSelectAll}
              className="h-5 w-5 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
            />
            <span className="text-sm text-[var(--color-text)]">
              전체 선택 ({selectedIds.size}/{posts.length})
            </span>
          </label>
          <button
            type="button"
            onClick={() => void handleDeleteSelected()}
            disabled={selectedIds.size === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            선택 삭제 ({selectedIds.size})
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-[var(--color-text-muted)]">
            로딩 중...
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center text-[var(--color-text-muted)]">
            게시글이 없습니다
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead className="bg-[var(--color-bg)]">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleSelectAll}
                        className="h-5 w-5"
                        aria-label="현재 페이지 전체 선택"
                      />
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
                      제목
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-[var(--color-text)]">
                      카테고리
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-[var(--color-text)]">
                      조회
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-[var(--color-text)]">
                      댓글
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-[var(--color-text)]">
                      좋아요
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-[var(--color-text)]">
                      상태
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-[var(--color-text)]">
                      작성일
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {posts.map((post) => (
                    <tr
                      key={post.id}
                      className={
                        selectedIds.has(post.id)
                          ? "bg-blue-50/80 transition-colors hover:bg-[var(--color-bg)]"
                          : "transition-colors hover:bg-[var(--color-bg)]"
                      }
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(post.id)}
                          onChange={() => toggleSelect(post.id)}
                          className="h-5 w-5"
                          aria-label={`선택 ${post.title}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {post.isPinned && (
                            <Pin
                              className="h-4 w-4 shrink-0 text-[var(--color-accent)]"
                              aria-hidden
                            />
                          )}
                          {post.isNotice && (
                            <span className="rounded bg-[var(--color-accent)] px-2 py-0.5 text-xs text-white">
                              공지
                            </span>
                          )}
                          <Link
                            href={`/board/${post.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-[var(--color-text)] hover:text-[var(--color-accent)]"
                          >
                            {post.title}
                          </Link>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {post.categoryText ? (
                          <span className="rounded bg-[var(--color-bg)] px-2 py-1 text-xs text-[var(--color-text-muted)]">
                            {post.categoryText}
                          </span>
                        ) : (
                          <span className="text-sm text-[var(--color-text-muted)]">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-[var(--color-text-muted)]">
                        <span className="inline-flex items-center justify-center gap-1">
                          <Eye className="h-4 w-4" aria-hidden />
                          {post.views}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-[var(--color-text-muted)]">
                        <span className="inline-flex items-center justify-center gap-1">
                          <MessageSquare className="h-4 w-4" aria-hidden />
                          {post.commentCount}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-[var(--color-text-muted)]">
                        <span className="inline-flex items-center justify-center gap-1">
                          <ThumbsUp className="h-4 w-4" aria-hidden />
                          {post.likeCount}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-sm">
                        {post.isHidden ? (
                          <span className="inline-flex items-center justify-center gap-1 text-red-600">
                            <EyeOff className="h-4 w-4" aria-hidden />
                            숨김
                          </span>
                        ) : (
                          <span className="text-emerald-600">공개</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-[var(--color-text-muted)]">
                        {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPage(p);
                  setSelectedIds(new Set());
                }}
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
