/**
 * 사이트 헤더·푸터·플로팅 CTA를 모두 숨겨야 하는 경로 목록.
 * 사용자가 이 페이지에서 다른 곳으로 이동하지 못하도록 화면 내 CTA만 사용하게 함.
 */
export const LOCKED_ROUTES: ReadonlyArray<string> = [
  "/signup/error",
];

export function isLockedRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return LOCKED_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
