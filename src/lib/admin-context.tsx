"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";

/**
 * 관리자 컨텍스트 (Phase B-5b)
 *
 * 변경:
 *  - sessionStorage 의존 제거
 *  - Supabase 세션 + users.role === 'ADMIN' 기반으로 판단
 *  - /api/admin/me 호출로 서버에서 검증
 *
 * 인터페이스 호환:
 *  - isAdmin, adminLogin, adminLogout 인터페이스 유지
 *  - 기존 9개 admin 페이지 + Header 코드 변경 최소화
 *
 * 레거시 호환:
 *  - ADMIN_PASSWORD_SESSION_KEY는 export 유지 (기존 클라 코드에서 헤더 전송용)
 *  - 빈 문자열 반환되도록 처리 — 서버는 세션 기반 통과
 */

const SESSION_KEY = "a1studio_admin";

/** @deprecated Phase B-6에서 제거 예정. 현재는 빈 문자열 반환. */
export const ADMIN_PASSWORD_SESSION_KEY = "a1studio_admin_password";

export type AdminLoginResult =
  | { ok: true }
  | { ok: false; status?: number; error: string };

type AdminContextType = {
  /** true: ADMIN 확인됨, false: 미인증 또는 권한 없음, null: 아직 확인 중 */
  isAdmin: boolean;
  /** 로딩 중인지 (초기 fetch 진행 중) */
  isLoading: boolean;
  /** 현재 사용자 정보 (ADMIN인 경우) */
  adminUser: { id: string; email: string | null; role: string } | null;
  /** @deprecated Phase B-6에서 시그니처 제거. 현재는 세션 확인 후 OK 반환. */
  adminLogin: (password: string) => Promise<AdminLoginResult>;
  /** 관리자 모드 종료 (Supabase 로그아웃과 별개) */
  adminLogout: () => void;
  /** 서버 상태 재확인 */
  refresh: () => Promise<void>;
};

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  isLoading: true,
  adminUser: null,
  adminLogin: async () => ({ ok: false, error: "초기화되지 않았습니다" }),
  adminLogout: () => {},
  refresh: async () => {},
});

const LOG_PREFIX = "[admin:context]";

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<AdminContextType["adminUser"]>(null);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      if (!res.ok) {
        // 401(미로그인) 또는 다른 오류
        setIsAdmin(false);
        setAdminUser(null);
        return;
      }
      const data = (await res.json()) as {
        user?: { id: string; email: string | null; role: string };
        isAdmin?: boolean;
      };
      if (data.isAdmin && data.user) {
        setIsAdmin(true);
        setAdminUser(data.user);
        // sessionStorage 플래그도 동기화 (레거시 호환)
        try {
          sessionStorage.setItem(SESSION_KEY, "true");
        } catch {
          // 사파리 프라이빗 등 sessionStorage 실패 시 무시
        }
      } else {
        setIsAdmin(false);
        setAdminUser(data.user ?? null);
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error(`${LOG_PREFIX} fetchMe failed`, err);
      setIsAdmin(false);
      setAdminUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await fetchMe();
      if (mounted) setIsLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [fetchMe]);

  /**
   * 레거시 호환 함수.
   * 신규 흐름에선 비밀번호 불필요 — Supabase 세션만 있으면 됨.
   * 현재 사용자가 ADMIN이면 즉시 OK, 아니면 안내 메시지.
   */
  const adminLogin = useCallback(
    async (_password: string): Promise<AdminLoginResult> => {
      await fetchMe();
      // 위에서 setIsAdmin 호출됨. 현재 상태로 결과 판단:
      // 단, fetchMe 후 state 업데이트는 비동기이므로 다시 한 번 fetch로 확인
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { isAdmin?: boolean };
          if (data.isAdmin) {
            console.log(`${LOG_PREFIX} login success via_session`);
            return { ok: true };
          }
          console.warn(`${LOG_PREFIX} login failed reason=not_admin`);
          return {
            ok: false,
            status: 403,
            error:
              "관리자 권한이 없는 계정입니다. 권한을 가진 아이디로 로그인 후 다시 시도해주세요.",
          };
        }
        if (res.status === 401) {
          return {
            ok: false,
            status: 401,
            error: "로그인이 필요합니다. 먼저 카카오/이메일로 로그인해주세요.",
          };
        }
        return { ok: false, status: res.status, error: "권한 확인에 실패했습니다." };
      } catch (err) {
        console.error(`${LOG_PREFIX} login network_error`, err);
        return { ok: false, error: "네트워크 오류가 발생했습니다." };
      }
    },
    [fetchMe]
  );

  const adminLogout = useCallback(() => {
    // 관리자 모드 표시만 해제 (Supabase 세션은 유지 — 일반 사이트는 계속 이용 가능)
    setIsAdmin(false);
    setAdminUser(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(ADMIN_PASSWORD_SESSION_KEY);
    } catch {
      // ignore
    }
    console.log(`${LOG_PREFIX} logout`);
  }, []);

  return (
    <AdminContext.Provider
      value={{ isAdmin, isLoading, adminUser, adminLogin, adminLogout, refresh: fetchMe }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
