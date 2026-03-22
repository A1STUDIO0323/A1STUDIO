"use client";

import { AuthProvider } from "@/lib/auth-client";
import { AdminProvider } from "@/lib/admin-context";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminProvider>{children}</AdminProvider>
    </AuthProvider>
  );
}
