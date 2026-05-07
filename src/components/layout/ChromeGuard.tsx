"use client";

import { usePathname } from "next/navigation";
import { isLockedRoute } from "@/lib/locked-routes";

/**
 * 잠금 경로에서는 children(Header/Footer 등)을 렌더하지 않음.
 * 사용자가 다른 곳으로 이탈하는 걸 막아야 하는 페이지(/signup/error 등)에서 사용.
 */
export default function ChromeGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isLockedRoute(pathname)) return null;
  return <>{children}</>;
}
