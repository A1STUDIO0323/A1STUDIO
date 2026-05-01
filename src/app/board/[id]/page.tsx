"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Eye,
  MessageSquare,
  ThumbsUp,
  Trash2,
} from "lucide-react";

interface Reply {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
}

interface Comment {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  replies?: Reply[];
}

interface PostDetail {
  id: string;
  title: string;
  content: string;
  authorId: string;
  category: { name: string; slug: string } | null;
  views: number;
  likeCount: number;
  comments: Comment[];
  createdAt: string;
}

export default function BoardDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const router = useRouter();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadPost = useCallback(() => {
    if (!id) return Promise.resolve();
    return fetch(`/api/board/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { success?: boolean; post?: PostDetail }) => {
        if (data.success && data.post) setPost(data.post);
        else setPost(null);
      })
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setPost(null);
    void loadPost();
  }, [loadPost]);

  useEffect(() => {
    fetch("/api/members/profile", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((data: { success?: boolean; profile?: { id?: string } | null }) => {
        if (data.success && data.profile?.id) setCurrentUserId(data.profile.id);
        else setCurrentUserId(null);
      })
      .catch(() => setCurrentUserId(null));
  }, []);

  const isAuthor = useMemo(
    () => Boolean(post && currentUserId && post.authorId === currentUserId),
    [post, currentUserId]
  );

  const handleLike = async () => {
    if (!id || !post) return;
    const res = await fetch(`/api/board/${encodeURIComponent(id)}/like`, {
      method: "POST",
      credentials: "include",
    });
    const data = (await res.json()) as {
      success?: boolean;
      liked?: boolean;
    };
    if (data.success && typeof data.liked === "boolean") {
      const delta = data.liked ? 1 : -1;
      setPost({
        ...post,
        likeCount: Math.max(0, post.likeCount + delta),
      });
    }
  };

  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !id) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/board/${encodeURIComponent(id)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: commentContent.trim() }),
      });

      const data = (await res.json()) as { success?: boolean };
      if (data.success) {
        setCommentContent("");
        window.location.reload();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm("정말 삭제하시겠습니까?")) return;

    const res = await fetch(`/api/board/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = (await res.json()) as {
      success?: boolean;
      error?: string;
    };
    if (data.success) {
      alert("삭제되었습니다");
      router.push("/board");
    } else {
      alert(data.error || "삭제 실패");
    }
  };

  if (!id && !loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] p-8 text-[var(--color-text-muted)]">
        잘못된 게시글 경로입니다.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] text-[var(--color-text-muted)]">
        로딩 중...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-bg)] p-8">
        <p className="text-[var(--color-text-muted)]">게시글을 찾을 수 없습니다.</p>
        <Link
          href="/board"
          className="rounded-full border border-[var(--color-border)] px-6 py-2 text-sm font-semibold text-[var(--color-text)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <article className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:pt-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-8 inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-accent)]"
          >
            <ArrowLeft className="h-4 w-4" />
            목록으로
          </button>

          {post.category && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
              {post.category.name}
            </p>
          )}

          <h1 className="font-serif text-2xl font-bold text-[var(--color-text)] sm:text-4xl md:text-[2.75rem]">
            {post.title}
          </h1>

          <div className="mt-6 flex flex-wrap gap-4 border-b border-[var(--color-border)] pb-6 text-sm text-[var(--color-text-muted)]">
            <span className="inline-flex items-center gap-1">
              <Eye className="h-4 w-4" aria-hidden />조회 {post.views}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-4 w-4" aria-hidden />
              댓글 {post.comments.length}
            </span>
            <span>{new Date(post.createdAt).toLocaleString("ko-KR")}</span>
          </div>

          <div className="mt-10 max-w-none whitespace-pre-wrap break-words text-base leading-relaxed text-[var(--color-text)]">
            {post.content}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleLike()}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <ThumbsUp className="h-4 w-4" />
              좋아요 {post.likeCount}
            </button>
            {isAuthor && (
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
                삭제
              </button>
            )}
          </div>

          <section className="mt-14 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
            <h2 className="text-lg font-bold text-[var(--color-text)]">
              댓글{" "}
              <span className="text-[var(--color-accent)]">
                {post.comments.length}
              </span>
            </h2>

            <form onSubmit={(e) => void handleCommentSubmit(e)} className="mt-6">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="로그인 후 댓글을 작성할 수 있습니다."
                rows={4}
                className="mb-3 w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
              />
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
              >
                {submitting ? "작성 중..." : "댓글 작성"}
              </button>
            </form>

            <ul className="mt-8 space-y-6 divide-y divide-[var(--color-border)]/80">
              {post.comments.map((comment) => (
                <li key={comment.id} className="pt-6 first:pt-0">
                  <p className="text-[var(--color-text)]">{comment.content}</p>
                  <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                    {new Date(comment.createdAt).toLocaleString("ko-KR")}
                  </p>
                  {(comment.replies?.length ?? 0) > 0 && (
                    <ul className="mt-4 space-y-3 border-l-2 border-[var(--color-border)] pl-4">
                      {comment.replies?.map((r) => (
                        <li key={r.id}>
                          <p className="text-sm text-[var(--color-text-muted)]">
                            {r.content}
                          </p>
                          <p className="mt-1 text-[10px] text-[var(--color-text-muted)] opacity-90">
                            {new Date(r.createdAt).toLocaleString("ko-KR")}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </motion.div>
      </article>
    </div>
  );
}
