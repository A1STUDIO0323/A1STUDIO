"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Music2, LogIn, LogOut, User, ShieldCheck, Menu, X, Wallet } from "lucide-react";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { NAV_LINKS, STUDIO_NAME } from "@/lib/constants";
import { useAdmin } from "@/lib/admin-context";
import { registerMemberProfile, useMemberRole } from "@/lib/member-role";
import { isAuthFlowPath, sanitizePostAuthRedirect } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/client";

const PHONE_OTP_ENABLED = process.env.NEXT_PUBLIC_PHONE_OTP_ENABLED === "true";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: session, status } = useSession();
  const { isAdmin, adminLogin, adminLogout } = useAdmin();
  const { role } = useMemberRole(session?.user?.email);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [adminError, setAdminError] = useState("");
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const isPhoneVerified = !PHONE_OTP_ENABLED || Boolean(session?.user?.phoneConfirmedAt);
  const [userPoints, setUserPoints] = useState<number | null>(null);

  // 페이지 이동 시 드로어 닫기
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // 드로어 열릴 때 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const getGuardedHref = (href: string) => {
    if (!session?.user?.email) return href;
    if (isPhoneVerified) return href;
    if (href.startsWith("/onboarding/phone")) return href;
    const safe = sanitizePostAuthRedirect(href);
    return `/onboarding/phone?next=${encodeURIComponent(safe)}`;
  };

  const getFullyGuardedHref = (href: string) => {
    const phoneGuarded = getGuardedHref(href);
    if (phoneGuarded !== href) return phoneGuarded;
    if (!session?.user?.email) return href;
    if (isProfileComplete !== false) return href;
    if (href.startsWith("/onboarding/profile")) return href;
    return `/onboarding/profile?next=${encodeURIComponent(href)}`;
  };

  useEffect(() => {
    if (!session?.user?.email) return;
    registerMemberProfile({
      email: session.user.email,
      name: session.user.name,
    });
    void fetch("/api/members/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: session.user.id,
        email: session.user.email ?? null,
        name: session.user.name ?? null,
        avatarUrl: session.user.image ?? null,
        provider: session.user.provider ?? null,
      }),
    });

    // 포인트 잔액 조회
    const supabase = createClient();
    supabase
      .from("user_points")
      .select("balance")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.warn('[Header] 포인트 조회 실패:', error);
          setUserPoints(0);
          return;
        }
        setUserPoints(data?.balance || 0);
      })
      .catch((err) => {
        console.error('[Header] 포인트 조회 예외:', err);
        setUserPoints(0);
      });
  }, [session?.user?.email, session?.user?.id, session?.user?.image, session?.user?.name, session?.user?.provider]);

  useEffect(() => {
    const email = session?.user?.email;
    if (!email) return;
    // /login 등 인증 흐름 경로에서는 next=/login 루프를 만들지 않도록 제외
    if (
      !isPhoneVerified &&
      !pathname.startsWith("/onboarding/phone") &&
      !isAuthFlowPath(pathname)
    ) {
      const safe = sanitizePostAuthRedirect(pathname);
      router.replace(`/onboarding/phone?next=${encodeURIComponent(safe)}`);
      if (process.env.NODE_ENV === "development") {
        console.log("[Header] phone required redirect", { safe });
      }
      return;
    }
    if (pathname.startsWith("/onboarding/profile") || pathname.startsWith("/onboarding/phone")) {
      return;
    }

    void (async () => {
      try {
        const res = await fetch("/api/members/profile", {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          success?: boolean;
          profile?: { isComplete?: boolean };
        };
        if (!res.ok || !data.success) {
          setIsProfileComplete(false);
          return;
        }
        const complete = Boolean(data.profile?.isComplete);
        setIsProfileComplete(complete);
        if (!complete) {
          const safe = sanitizePostAuthRedirect(pathname);
          router.push(`/onboarding/profile?next=${encodeURIComponent(safe)}`);
        }
      } catch {
        setIsProfileComplete(false);
      }
    })();
  }, [isPhoneVerified, pathname, router, session?.user?.email]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-[#D8CCBC] bg-[#F7F3EB]/95 backdrop-blur supports-[backdrop-filter]:bg-[#F7F3EB]/80">
        <div className="relative mx-auto flex h-14 max-w-[1440px] items-center gap-2 px-3 sm:h-16 sm:px-6 lg:px-8">

          {/* 로고 */}
          <Link
            href={getFullyGuardedHref("/")}
            className="flex items-center gap-2 text-[#3B342F] transition-opacity hover:opacity-80"
          >
            <Music2 className="h-6 w-6 text-[#B98768]" />
            <span className="text-lg font-bold tracking-tight">{STUDIO_NAME}</span>
          </Link>

          {/* 데스크탑 네비게이션 (lg 이상) */}
          <nav className="hidden lg:flex min-w-0 flex-1 items-center justify-center gap-0.5 overflow-visible px-4">
            {NAV_LINKS.map((link) =>
              link.children ? (
                <div
                  key={link.href}
                  className="relative"
                  onMouseEnter={() => {
                    if (closeTimer.current) clearTimeout(closeTimer.current);
                    setOpenDropdown(link.href);
                  }}
                  onMouseLeave={() => {
                    closeTimer.current = setTimeout(() => setOpenDropdown(null), 200);
                  }}
                >
                  <button
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2.5 py-2 text-xs font-semibold whitespace-nowrap break-keep transition-colors xl:px-3 xl:text-sm",
                      pathname.startsWith(link.href) && link.href !== "/"
                        ? "text-[#B98768]"
                        : "text-[#3B342F] hover:text-[#B98768]"
                    )}
                  >
                    {link.label}
                    {(link as any).isNew && (
                      <span className="ml-1.5 rounded-full bg-[#B98768] px-1.5 py-0.5 text-[10px] font-bold text-white">
                        NEW
                      </span>
                    )}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {openDropdown === link.href && (
                    <div
                      className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border border-[#D8CCBC] bg-[#EFE7DA] py-1 shadow-xl"
                      onMouseEnter={() => { if (closeTimer.current) clearTimeout(closeTimer.current); }}
                      onMouseLeave={() => { closeTimer.current = setTimeout(() => setOpenDropdown(null), 200); }}
                    >
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={getFullyGuardedHref(child.href)}
                          className="block px-4 py-2 text-sm text-[#3B342F] hover:bg-[#3B342F]/5 hover:text-[#B98768]"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={getFullyGuardedHref(link.href)}
                  className={cn(
                    "rounded-md px-2.5 py-2 text-xs font-semibold whitespace-nowrap break-keep transition-colors xl:px-3 xl:text-sm",
                    pathname === link.href
                      ? "text-[#B98768]"
                      : "text-[#3B342F] hover:text-[#B98768]"
                  )}
                >
                  {link.label}
                  {(link as any).isNew && (
                    <span className="ml-1.5 rounded-full bg-[#B98768] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      NEW
                    </span>
                  )}
                </Link>
              )
            )}
          </nav>

          {/* 오른쪽 액션 영역 */}
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            {/* 관리자 로그인 팝오버 */}
            {showAdminLogin && (
              <div className="absolute right-4 top-16 z-50 w-72 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-4 shadow-2xl">
                <p className="mb-3 text-sm font-bold text-[#3B342F]">관리자 로그인</p>
                <input
                  type="password"
                  value={adminPw}
                  onChange={(e) => { setAdminPw(e.target.value); setAdminError(""); }}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      if (await adminLogin(adminPw)) {
                        setShowAdminLogin(false);
                        setAdminPw("");
                      } else {
                        setAdminError("비밀번호가 틀렸습니다.");
                      }
                    }
                  }}
                  placeholder="관리자 비밀번호"
                  className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 text-sm text-[#3B342F] placeholder-[#9b9189] focus:border-[#B98768] focus:outline-none"
                />
                {adminError && <p className="mt-1.5 text-xs text-red-400">{adminError}</p>}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={async () => {
                      if (await adminLogin(adminPw)) {
                        setShowAdminLogin(false);
                        setAdminPw("");
                      } else {
                        setAdminError("비밀번호가 틀렸습니다.");
                      }
                    }}
                    className="flex-1 rounded-lg bg-[#B98768] py-2 text-xs font-bold text-[#F7F3EB] hover:bg-[#a9785c]"
                  >
                    로그인
                  </button>
                  <button
                    onClick={() => { setShowAdminLogin(false); setAdminPw(""); setAdminError(""); }}
                    className="flex-1 rounded-lg border border-[#D8CCBC] py-2 text-xs text-[#6f655d] hover:text-[#B98768]"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* 로그인/유저 영역 */}
            {status === "loading" ? (
              <div className="h-4 w-16 animate-pulse rounded bg-[#D8CCBC]" />
            ) : session ? (
              <>
                {/* 포인트 잔액 */}
                <Link
                  href={getFullyGuardedHref("/charge")}
                  className="hidden lg:flex items-center gap-1.5 rounded-full border border-[#D8CCBC] bg-[#EFE7DA] px-3 py-1.5 text-sm font-semibold text-[#B98768] transition-all hover:border-[#B98768] hover:bg-[#B98768]/10"
                  title="포인트 충전"
                >
                  <Wallet className="h-4 w-4" />
                  <span>{userPoints !== null ? userPoints.toLocaleString("ko-KR") : "..."}</span>
                  <span className="text-xs">P</span>
                </Link>
                
                <Link
                  href={getFullyGuardedHref("/mypage")}
                  className="flex items-center gap-1.5 text-sm font-medium text-[#6f655d] transition-colors hover:text-[#B98768]"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden xl:inline">마이페이지</span>
                </Link>
                <span
                  className={cn(
                    "hidden xl:inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
                    role === "CM"
                      ? "border-[#B98768]/40 bg-[#B98768]/10 text-[#B98768]"
                      : "border-[#D8CCBC] bg-[#F7F3EB] text-[#6f655d]"
                  )}
                >
                  {role === "CM" ? "CM" : "회원"}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="hidden lg:flex items-center gap-1.5 rounded-full border border-[#D8CCBC] px-3 py-2 text-sm font-medium text-[#6f655d] transition-all hover:border-[#D8CCBC] hover:text-[#B98768]"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden xl:inline">로그아웃</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn()}
                className="flex items-center gap-1 text-xs font-medium text-[#6f655d] transition-colors hover:text-[#B98768] sm:gap-1.5 sm:text-sm"
              >
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">로그인</span>
              </button>
            )}

            {/* 관리자 모드 버튼 */}
            {isAdmin ? (
              <div className="relative">
                <button
                  onClick={() => setShowAdminMenu((prev) => !prev)}
                  className="flex items-center gap-1.5 rounded-full border border-[#B98768]/50 bg-violet-900/20 px-3 py-2 text-xs font-semibold text-[#B98768] transition-all hover:bg-[#B98768]/10"
                  title="관리자 메뉴"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">관리자</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {showAdminMenu && (
                  <div className="absolute right-0 top-11 z-50 w-44 rounded-xl border border-[#D8CCBC] bg-[#EFE7DA] py-1.5 shadow-xl">
                    <Link
                      href={getFullyGuardedHref("/admin")}
                      onClick={() => setShowAdminMenu(false)}
                      className="block px-3 py-2 text-xs font-medium text-[#3B342F] hover:bg-[#3B342F]/5 hover:text-[#B98768]"
                    >
                      관리자 대시보드
                    </Link>
                    <Link
                      href={getFullyGuardedHref("/admin/members")}
                      onClick={() => setShowAdminMenu(false)}
                      className="block px-3 py-2 text-xs font-medium text-[#3B342F] hover:bg-[#3B342F]/5 hover:text-[#B98768]"
                    >
                      회원관리
                    </Link>
                    <Link
                      href={getFullyGuardedHref("/admin/class-requests")}
                      onClick={() => setShowAdminMenu(false)}
                      className="block px-3 py-2 text-xs font-medium text-[#3B342F] hover:bg-[#3B342F]/5 hover:text-[#B98768]"
                    >
                      클래스요청관리
                    </Link>
                    <button
                      onClick={() => {
                        setShowAdminMenu(false);
                        adminLogout();
                      }}
                      className="block w-full px-3 py-2 text-left text-xs font-medium text-[#6f655d] hover:bg-[#3B342F]/5 hover:text-[#B98768]"
                    >
                      관리자 해제
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowAdminLogin(!showAdminLogin)}
                className="flex items-center gap-1 text-xs text-[#b0a89e] transition-colors hover:text-[#6f655d]"
                title="관리자 로그인"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
              </button>
            )}

            {/* 모바일 햄버거 버튼 (lg 미만) */}
            <button
              className="ml-1 flex items-center justify-center rounded-lg p-2 text-[#3B342F] transition-colors hover:bg-[#D8CCBC]/40 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="메뉴 열기"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 드로어 오버레이 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 모바일 사이드 드로어 */}
      <div
        className={cn(
          "fixed right-0 top-0 z-[70] flex h-full w-72 flex-col bg-[#F7F3EB] shadow-2xl transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* 드로어 헤더 */}
        <div className="flex items-center justify-between border-b border-[#D8CCBC] px-5 py-4">
          <div className="flex items-center gap-2">
            <Music2 className="h-5 w-5 text-[#B98768]" />
            <span className="font-bold text-[#3B342F]">{STUDIO_NAME}</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-[#6f655d] transition-colors hover:bg-[#D8CCBC]/40"
            aria-label="메뉴 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 유저 정보 영역 */}
        {session && (
          <div className="border-b border-[#D8CCBC] px-5 py-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-[#3B342F]">
                  {session.user?.name ?? session.user?.email}
                </p>
                <span
                  className={cn(
                    "mt-0.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    role === "CM"
                      ? "border-[#B98768]/40 bg-[#B98768]/10 text-[#B98768]"
                      : "border-[#D8CCBC] bg-[#EFE7DA] text-[#6f655d]"
                  )}
                >
                  {role === "CM" ? "CM" : "회원"}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-1 rounded-lg border border-[#D8CCBC] px-3 py-1.5 text-xs text-[#6f655d] hover:text-[#B98768]"
              >
                <LogOut className="h-3.5 w-3.5" />
                로그아웃
              </button>
            </div>
            
            {/* 포인트 잔액 */}
            <Link
              href={getFullyGuardedHref("/charge")}
              className="flex items-center justify-between rounded-lg border border-[#D8CCBC] bg-[#EFE7DA] px-4 py-2"
            >
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-[#B98768]" />
                <span className="text-xs text-[#9b9189]">보유 포인트</span>
              </div>
              <span className="text-base font-bold text-[#B98768]">
                {userPoints !== null ? userPoints.toLocaleString("ko-KR") : "..."}P
              </span>
            </Link>
          </div>
        )}

        {/* 네비게이션 목록 */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {NAV_LINKS.map((link) =>
            link.children ? (
              <div key={link.href}>
                <button
                  onClick={() =>
                    setMobileExpanded((prev) =>
                      prev === link.href ? null : link.href
                    )
                  }
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold transition-colors",
                    pathname.startsWith(link.href) && link.href !== "/"
                      ? "text-[#B98768]"
                      : "text-[#3B342F] hover:bg-[#EFE7DA]"
                  )}
                >
                  {link.label}
                  {(link as any).isNew && (
                    <span className="ml-1.5 rounded-full bg-[#B98768] px-1.5 py-0.5 text-[10px] font-bold text-white">
                      NEW
                    </span>
                  )}
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-transform text-[#9b9189]",
                      mobileExpanded === link.href && "rotate-90"
                    )}
                  />
                </button>
                {mobileExpanded === link.href && (
                  <div className="mb-1 ml-3 space-y-0.5 border-l-2 border-[#D8CCBC] pl-3">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={getFullyGuardedHref(child.href)}
                        className={cn(
                          "block rounded-lg px-3 py-2.5 text-sm transition-colors",
                          pathname === child.href
                            ? "font-semibold text-[#B98768]"
                            : "text-[#6f655d] hover:bg-[#EFE7DA] hover:text-[#3B342F]"
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={link.href}
                href={getFullyGuardedHref(link.href)}
                className={cn(
                  "block rounded-xl px-3 py-3 text-sm font-semibold transition-colors",
                  pathname === link.href
                    ? "text-[#B98768]"
                    : "text-[#3B342F] hover:bg-[#EFE7DA]"
                )}
              >
                {link.label}
                {(link as any).isNew && (
                  <span className="ml-1.5 rounded-full bg-[#B98768] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    NEW
                  </span>
                )}
              </Link>
            )
          )}
        </nav>

        {/* 드로어 하단 */}
        <div className="border-t border-[#D8CCBC] px-5 py-4">
          {!session ? (
            <button
              onClick={() => signIn()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#B98768] py-3 text-sm font-bold text-[#F7F3EB] transition-all hover:bg-[#a9785c] active:scale-95"
            >
              <LogIn className="h-4 w-4" />
              로그인하기
            </button>
          ) : (
            <Link
              href={getFullyGuardedHref("/mypage")}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#D8CCBC] py-3 text-sm font-semibold text-[#3B342F] transition-all hover:border-[#B98768] hover:text-[#B98768]"
            >
              <User className="h-4 w-4" />
              마이페이지
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
