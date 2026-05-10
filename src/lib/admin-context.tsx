"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const SESSION_KEY = "a1studio_admin";

/** 관리자 API(`x-admin-password`)용 — 로그인 시 세션에만 보관 */
export const ADMIN_PASSWORD_SESSION_KEY = "a1studio_admin_password";

export type AdminLoginResult =
  | { ok: true }
  | { ok: false; status?: number; error: string };

type AdminContextType = {
  isAdmin: boolean;
  adminLogin: (password: string) => Promise<AdminLoginResult>;
  adminLogout: () => void;
};

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  adminLogin: async () => ({ ok: false, error: "초기화되지 않았습니다" }),
  adminLogout: () => {},
});

function defaultErrorByStatus(status: number): string {
  switch (status) {
    case 401:
      return "비밀번호가 올바르지 않습니다.";
    case 403:
      return "관리자 권한이 없는 계정입니다. 권한을 가진 아이디로 다시 시도해주세요.";
    case 400:
      return "잘못된 요청입니다.";
    case 500:
      return "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    default:
      return "로그인에 실패했습니다.";
  }
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate admin flag from sessionStorage
      setIsAdmin(sessionStorage.getItem(SESSION_KEY) === "true");
    }
  }, []);

  const adminLogin = async (password: string): Promise<AdminLoginResult> => {
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setIsAdmin(true);
        sessionStorage.setItem(SESSION_KEY, "true");
        sessionStorage.setItem(ADMIN_PASSWORD_SESSION_KEY, password);
        return { ok: true };
      }

      // 서버가 보낸 에러 메시지 우선 사용, 없으면 status 기반 기본 메시지
      let serverError: string | undefined;
      try {
        const body = (await res.json()) as { error?: string };
        serverError = body?.error;
      } catch {
        // body 파싱 실패 무시
      }

      return {
        ok: false,
        status: res.status,
        error: serverError || defaultErrorByStatus(res.status),
      };
    } catch (err) {
      console.error("[admin:login] network_error", err);
      return {
        ok: false,
        error: "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      };
    }
  };

  const adminLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(ADMIN_PASSWORD_SESSION_KEY);
  };

  return (
    <AdminContext.Provider value={{ isAdmin, adminLogin, adminLogout }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  return useContext(AdminContext);
}
