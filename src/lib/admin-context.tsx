"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "admin1234";
const SESSION_KEY = "a1studio_admin";

type AdminContextType = {
  isAdmin: boolean;
  adminLogin: (password: string) => boolean;
  adminLogout: () => void;
};

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  adminLogin: () => false,
  adminLogout: () => {},
});

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsAdmin(sessionStorage.getItem(SESSION_KEY) === "true");
    }
  }, []);

  const adminLogin = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      sessionStorage.setItem(SESSION_KEY, "true");
      return true;
    }
    return false;
  };

  const adminLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem(SESSION_KEY);
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
