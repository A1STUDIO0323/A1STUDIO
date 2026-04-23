import { redirect } from "next/navigation";
import Link from "next/link";
import { listBoardPosts } from "@/lib/board-db";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "자유게시판 | A1 STUDIO",
  description: "A1 STUDIO 회원들의 자유로운 소통 공간",
};

export default async function BoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/board");
  }

  const posts = await listBoardPosts();

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <section className="bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-bg)] py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-wider text-[var(--color-accent)]">
              Community
            </p>
            <h1 className="mb-4 text-4xl font-bold text-[var(--color-text)] md:text-5xl">
              자유게시판
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-[var(--color-text-muted)]">
              A1 STUDIO 회원들의 자유로운 소통 공간
            </p>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex items-center justify-between">
            <div className="text-sm text-[var(--color-text-muted)]">
              전체{" "}
              <span className="font-semibold text-[var(--color-accent)]">
                {posts.length}
              </span>
              개
            </div>
            <Link
              href="/board/write"
              className="rounded-full bg-[var(--color-accent)] px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-[var(--color-accent-hover)] hover:shadow-lg"
            >
              글쓰기
            </Link>
          </div>

          <div className="space-y-3">
            {posts.length === 0 ? (
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-20 text-center">
                <p className="text-[var(--color-text-muted)]">
                  첫 번째 글을 작성해보세요!
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/board/${post.id}`}
                  className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="mb-2 text-lg font-semibold text-[var(--color-text)] hover:text-[var(--color-accent)]">
                        {post.title}
                      </h3>
                      <div className="mb-3 line-clamp-2 text-sm text-[var(--color-text-muted)]">
                        {post.content.substring(0, 150)}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-subtle)]">
                        <span>{post.author.name || "익명"}</span>
                        <span>•</span>
                        <span>
                          {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                        </span>
                        <span>•</span>
                        <span>조회 {post.viewCount}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
