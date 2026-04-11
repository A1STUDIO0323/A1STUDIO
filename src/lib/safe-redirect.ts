/**
 * 로그인/온보딩/콜백 URL이 next·callbackUrl 체인으로 서로를 가리키며
 * 무한 리디렉션되는 것을 막기 위한 공용 정리 함수.
 * (외부 URL·인증 전용 경로는 최종 목적지로 허용하지 않음)
 */

const AUTH_LOOP_PREFIXES = [
  "/login",
  "/onboarding/phone",
  "/auth/callback",
  "/api/auth",
] as const;

/** 휴대폰 온보딩 강제 리디렉션에서 제외 (로그인·OAuth 콜백 등) */
const AUTH_FLOW_EXEMPT_PREFIXES = [
  "/login",
  "/auth/callback",
  "/signup",
  "/forgot-password",
  "/reset-password",
] as const;

export function isAuthFlowPath(pathname: string): boolean {
  return AUTH_FLOW_EXEMPT_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

/** pathname만 검사 (쿼리 제외) */
export function isAuthLoopPath(pathname: string): boolean {
  const path = pathname.split("?")[0] || pathname;
  if (!path.startsWith("/")) return true;
  return AUTH_LOOP_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

function decodeRepeatedly(value: string, max = 3): string {
  let s = value;
  for (let i = 0; i < max; i++) {
    try {
      const next = decodeURIComponent(s);
      if (next === s) break;
      s = next;
    } catch {
      break;
    }
  }
  return s;
}

/**
 * 로그인 후·온보딩 후 이동할 단일 내부 경로로 정규화.
 * - 비어 있으면 /
 * - http(s) 또는 // 로 시작하면 /
 * - 인증 루프 경로면 중첩된 next/callbackUrl을 따라가며 재검사, 없으면 /
 * - 쿼리의 next·callbackUrl 값이 루프면 제거 또는 /
 */
export function sanitizePostAuthRedirect(
  raw: string | null | undefined
): string {
  if (raw == null || typeof raw !== "string") return "/";
  let s = decodeRepeatedly(raw.trim());
  if (!s) return "/";
  if (/^https?:\/\//i.test(s) || s.startsWith("//")) return "/";
  if (!s.startsWith("/")) s = `/${s}`;

  let parsed: URL;
  try {
    parsed = new URL(s, "http://redirect.sanitizer.local");
  } catch {
    return "/";
  }

  const path = parsed.pathname;

  if (isAuthLoopPath(path)) {
    const innerRaw =
      parsed.searchParams.get("next") ??
      parsed.searchParams.get("callbackUrl") ??
      null;
    if (innerRaw) {
      return sanitizePostAuthRedirect(decodeRepeatedly(innerRaw));
    }
    return "/";
  }

  const nextParam = parsed.searchParams.get("next");
  if (nextParam != null && nextParam !== "") {
    const innerSafe = sanitizePostAuthRedirect(decodeRepeatedly(nextParam));
    if (
      innerSafe === "/" &&
      nextParam !== "/" &&
      nextParam !== "%2F" &&
      nextParam !== "%2f"
    ) {
      return path || "/";
    }
    const sp = new URLSearchParams(parsed.search);
    sp.set("next", innerSafe);
    const q = sp.toString();
    return q ? `${path}?${q}` : path;
  }

  const cbParam = parsed.searchParams.get("callbackUrl");
  if (cbParam != null && cbParam !== "") {
    const innerSafe = sanitizePostAuthRedirect(decodeRepeatedly(cbParam));
    const sp = new URLSearchParams(parsed.search);
    if (innerSafe === "/") {
      sp.delete("callbackUrl");
    } else {
      sp.set("callbackUrl", innerSafe);
    }
    const q = sp.toString();
    return q ? `${path}?${q}` : path;
  }

  return `${parsed.pathname}${parsed.search || ""}`;
}
