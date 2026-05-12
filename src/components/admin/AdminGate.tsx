"use client";

/**
 * Admin 페이지 접근 가드 컴포넌트 (Phase B-5b)
 *
 * 사용:
 *   if (gate) return gate;
 *   const gate = <AdminGate />;
 *
 * 또는:
 *   const { gate } = useAdminGate();
 *   if (gate) return gate;
 *
 * 동작:
 *   - middleware가 이미 /admin을 ADMIN role로 차단하므로, 일반적인 경우 이 화면은 노출되지 않음
 *   - 새로고침 직후 또는 미들웨어 우회 케이스에 대한 방어적 화면
 *   - 로딩 중 → 스피너
 *   - 미로그인 → 로그인 안내 + /login 링크
 *   - ADMIN 아님 → 권한 안내 + 홈 링크
 */

import Link from "next/link";
import { Lock, Loader2 } from "lucide-react";
import { useAdmin } from "@/lib/admin-context";

export function AdminGate() {
  const { isAdmin, isLoading, adminUser } = useAdmin();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F3EB] px-4">
        <div className="flex items-center gap-2 text-[#6f655d]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">권한 확인 중...</span>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return null; // 통과
  }

  // 미로그인
  if (!adminUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F3EB] px-4">
        <div className="w-full max-w-sm rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 text-center">
          <Lock className="mx-auto mb-4 h-10 w-10 text-[#B98768]" />
          <h1 className="text-xl font-bold text-[#3B342F]">관리자 권한이 필요합니다</h1>
          <p className="mt-3 text-sm text-[#6f655d]">
            관리자 페이지에 접근하려면 먼저 로그인하세요.
          </p>
          <Link
            href="/login?next=/admin"
            className="mt-5 inline-block w-full rounded-xl bg-[#B98768] py-3 text-sm font-bold text-[#F7F3EB] hover:bg-[#a9785c] transition-all"
          >
            로그인 페이지로 이동
          </Link>
        </div>
      </div>
    );
  }

  // 로그인은 했지만 ADMIN 아님
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F3EB] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 text-center">
        <Lock className="mx-auto mb-4 h-10 w-10 text-red-400" />
        <h1 className="text-xl font-bold text-[#3B342F]">접근 권한이 없습니다</h1>
        <p className="mt-3 text-sm text-[#6f655d]">
          현재 계정은 <strong>{adminUser.role}</strong> 등급입니다.
          <br />
          관리자 페이지는 <strong>ADMIN</strong> 등급만 접근 가능합니다.
        </p>
        <p className="mt-3 text-xs text-[#9b9189]">
          {adminUser.email ?? "-"}
        </p>
        <Link
          href="/"
          className="mt-5 inline-block w-full rounded-xl border border-[#D8CCBC] py-3 text-sm font-bold text-[#6f655d] hover:text-[#B98768] transition-all"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
