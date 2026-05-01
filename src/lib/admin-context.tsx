"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const SESSION_KEY = "a1studio_admin";

/** 관리자 API(`x-admin-password`)용 — 로그인 시 세션에만 보관 */
export const ADMIN_PASSWORD_SESSION_KEY = "a1studio_admin_password";

type AdminContextType = {
  isAdmin: boolean;
  adminLogin: (password: string) => Promise<boolean>;
  adminLogout: () => void;
};

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  adminLogin: async () => false,
  adminLogout: () => {},
});

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate admin flag from sessionStorage
      setIsAdmin(sessionStorage.getItem(SESSION_KEY) === "true");
    }
  }, []);

  const adminLogin = async (password: string): Promise<boolean> => {
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
        return true;
      }
    } catch {
      // 네트워크 오류
    }
    return false;
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
