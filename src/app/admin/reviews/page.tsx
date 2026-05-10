"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, Star, Eye, EyeOff, Trash2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { ADMIN_PASSWORD_SESSION_KEY, useAdmin } from "@/lib/admin-context";

type Review = {
  id: string;
  rating: number;
  content: string;
  authorName: string;
  isVisible: boolean;
  createdAt: string;
  reservationId: string | null;
};

function adminFetchHeaders(): HeadersInit {
  const pw =
    typeof window !== "undefined"
      ? sessionStorage.getItem(ADMIN_PASSWORD_SESSION_KEY) ?? ""
      : "";
  return {
    "Content-Type": "application/json",
    "x-admin-password": pw,
  };
}

export default function AdminReviewsPage() {
  const { isAdmin, adminLogin, adminLogout } = useAdmin();
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/reviews", {
        cache: "no-store",
        headers: adminFetchHeaders(),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.reviews)) {
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error("후기 목록 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVisibility = async (id: string, currentVisibility: boolean) => {
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: adminFetchHeaders(),
        body: JSON.stringify({ id, isVisible: !currentVisibility }),
      });
      const data = await res.json();
      if (data.success) {
        await loadReviews();
      } else {
        alert("공개/비공개 처리에 실패했습니다.");
      }
    } catch (error) {
      console.error("후기 토글 실패:", error);
      alert("오류가 발생했습니다.");
    }
  };

  const deleteReview = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reviews?id=${id}`, {
        method: "DELETE",
        headers: adminFetchHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setDeleteConfirm(null);
        await loadReviews();
      } else {
        alert("후기 삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("후기 삭제 실패:", error);
      alert("오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void loadReviews();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F3EB] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 text-center">
          <Lock className="mx-auto mb-4 h-10 w-10 text-[#B98768]" />
          <h1 className="text-xl font-bold text-[#3B342F]">관리자 로그인</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setLoginError("");
            }}
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                const result = await adminLogin(password);
                if (result.ok) {
                  setPassword("");
                  setLoginError("");
                } else {
                  setLoginError(result.error);
                }
              }
            }}
            placeholder="관리자 비밀번호 입력"
            className="mt-5 w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] placeholder:text-[#b0a89e] focus:border-[#B98768] focus:outline-none"
          />
          {loginError && <p className="mt-2 text-xs text-red-400">{loginError}</p>}
          <button
            onClick={async () => {
              const result = await adminLogin(password);
              if (result.ok) {
                setPassword("");
                setLoginError("");
              } else {
                setLoginError(result.error);
              }
            }}
            className="mt-3 w-full rounded-xl bg-[#B98768] py-3 text-sm font-bold text-[#F7F3EB] hover:bg-[#a9785c] transition-all"
          >
            로그인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F3EB]">
      {/* 헤더 */}
      <div className="border-b border-[#D8CCBC] bg-[#EFE7DA] px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#3B342F]">후기 관리</h1>
            <Link
              href="/admin"
              className="rounded-lg border border-[#D8CCBC] px-2.5 py-1 text-xs text-[#6f655d] hover:text-[#B98768]"
            >
              관리자 홈
            </Link>
          </div>
          <button onClick={adminLogout} className="text-sm text-[#6f655d] hover:text-[#B98768] transition-colors">
            로그아웃
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 액션 바 */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-[#6f655d]">
            전체 <span className="font-bold text-[#3B342F]">{reviews.length}</span>건
          </p>
          <button
            onClick={() => void loadReviews()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-[#D8CCBC] px-3 py-1.5 text-xs text-[#6f655d] hover:text-[#B98768] disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            새로고침
          </button>
        </div>

        {/* 후기 테이블 */}
        <div className="overflow-hidden rounded-2xl border border-[#D8CCBC]">
          <table className="w-full text-sm">
            <thead className="border-b border-[#D8CCBC] bg-[#EFE7DA]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">번호</th>
                <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">닉네임</th>
                <th className="px-4 py-3 text-center font-semibold text-[#3B342F]">별점</th>
                <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">내용</th>
                <th className="px-4 py-3 text-center font-semibold text-[#3B342F]">공개여부</th>
                <th className="px-4 py-3 text-left font-semibold text-[#3B342F]">작성일</th>
                <th className="px-4 py-3 text-center font-semibold text-[#3B342F]">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8CCBC]/50 bg-[#F7F3EB]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[#9b9189]">
                    로딩 중...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[#9b9189]">
                    후기가 없습니다.
                  </td>
                </tr>
              ) : (
                reviews.map((review, index) => (
                  <tr key={review.id} className="hover:bg-[#EFE7DA]/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-[#9b9189]">{reviews.length - index}</td>
                    <td className="px-4 py-3 font-medium text-[#3B342F]">
                      {review.authorName || "익명"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-3.5 w-3.5",
                              i < review.rating
                                ? "fill-[#B98768] text-[#B98768]"
                                : "text-[#D8CCBC]"
                            )}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate text-[#6f655d]">
                        {review.content.length > 50
                          ? `${review.content.slice(0, 50)}...`
                          : review.content}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          review.isVisible
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-[#D8CCBC]/50 text-[#6f655d]"
                        )}
                      >
                        {review.isVisible ? (
                          <>
                            <Eye className="h-3 w-3" />
                            공개
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3" />
                            비공개
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#9b9189]">
                      {new Date(review.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => toggleVisibility(review.id, review.isVisible)}
                          className={cn(
                            "rounded-lg p-1.5 transition-colors",
                            review.isVisible
                              ? "bg-[#D8CCBC]/50 text-[#6f655d] hover:bg-[#D8CCBC]"
                              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          )}
                          title={review.isVisible ? "비공개 전환" : "공개 전환"}
                        >
                          {review.isVisible ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(review.id)}
                          className="rounded-lg bg-red-50 p-1.5 text-red-400 hover:bg-red-100 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="fixed left-1/2 top-1/2 z-[60] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#3B342F]">후기 삭제</h3>
            <p className="mt-2 text-sm text-[#6f655d]">
              이 후기를 삭제하시겠습니까?
              <br />
              삭제된 후기는 복구할 수 없습니다.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-lg border border-[#D8CCBC] py-2.5 text-sm font-medium text-[#6f655d] hover:text-[#B98768] transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => deleteReview(deleteConfirm)}
                className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
