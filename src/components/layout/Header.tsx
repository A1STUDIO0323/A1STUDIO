"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Music2, LogIn, LogOut, User, ShieldCheck } from "lucide-react";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { NAV_LINKS, STUDIO_NAME } from "@/lib/constants";
import { useAdmin } from "@/lib/admin-context";
import { registerMemberProfile, useMemberRole } from "@/lib/member-role";

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
  const isPhoneVerified = !PHONE_OTP_ENABLED || Boolean(session?.user?.phoneConfirmedAt);

  const getGuardedHref = (href: string) => {
    if (!session?.user?.email) return href;
    if (isPhoneVerified) return href;
    if (href.startsWith("/onboarding/phone")) return href;
    return `/onboarding/phone?next=${encodeURIComponent(href)}`;
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
  }, [session?.user?.email, session?.user?.id, session?.user?.image, session?.user?.name, session?.user?.provider]);

  useEffect(() => {
    const email = session?.user?.email;
    if (!email) return;
    if (!isPhoneVerified && !pathname.startsWith("/onboarding/phone")) {
      router.replace(`/onboarding/phone?next=${encodeURIComponent(pathname)}`);
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
          router.push(`/onboarding/profile?next=${encodeURIComponent(pathname)}`);
        }
      } catch {
        setIsProfileComplete(false);
      }
    })();
  }, [isPhoneVerified, pathname, router, session?.user?.email]);

  return (
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

        {/* 데스크탑 네비게이션 */}
        <nav className="flex min-w-0 flex-1 items-center justify-start gap-0.5 overflow-visible px-1 sm:justify-center sm:px-4">
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
                    "flex items-center gap-1 rounded-md px-1.5 py-1.5 text-[11px] font-semibold whitespace-nowrap break-keep transition-colors sm:px-2.5 sm:py-2 sm:text-xs xl:px-3 xl:text-sm",
                    pathname.startsWith(link.href) && link.href !== "/"
                      ? "text-[#B98768]"
                      : "text-[#3B342F] hover:text-[#B98768]"
                  )}
                >
                  {link.label}
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
                  "rounded-md px-1.5 py-1.5 text-[11px] font-semibold whitespace-nowrap break-keep transition-colors sm:px-2.5 sm:py-2 sm:text-xs xl:px-3 xl:text-sm",
                  pathname === link.href
                    ? "text-[#B98768]"
                    : "text-[#3B342F] hover:text-[#B98768]"
                )}
              >
                {link.label}
              </Link>
            )
          )}
        </nav>

        {/* 관리자 로그인 팝오버 */}
        {showAdminLogin && (
          <div className="absolute right-4 top-16 z-50 w-72 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-4 shadow-2xl">
            <p className="mb-3 text-sm font-bold text-[#3B342F]">관리자 로그인</p>
            <input
              type="password"
              value={adminPw}
              onChange={(e) => { setAdminPw(e.target.value); setAdminError(""); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (adminLogin(adminPw)) {
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
                onClick={() => {
                  if (adminLogin(adminPw)) {
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

        {/* CTA 버튼 */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {status === "loading" ? (
            <div className="h-4 w-16 animate-pulse rounded bg-[#D8CCBC]" />
          ) : session ? (
            <>
              <div className="flex items-center gap-2">
                <Link
                  href={getFullyGuardedHref("/mypage")}
                  className="flex items-center gap-1.5 text-sm font-medium text-[#6f655d] transition-colors hover:text-[#B98768]"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden xl:inline">{session.user?.name?.split(" ")[0] ?? "마이페이지"}</span>
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
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-1.5 rounded-full border border-[#D8CCBC] px-3 py-2 text-sm font-medium text-[#6f655d] transition-all hover:border-[#D8CCBC] hover:text-[#B98768]"
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
                관리자
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
          {/* 예약 메뉴 임시 숨김 (코드 보관)
          <Link
            href="/booking"
            className="rounded-full bg-[#B98768] px-3 py-1.5 text-xs font-semibold text-[#F7F3EB] shadow-lg shadow-[#B98768]/10 transition-all hover:bg-[#a9785c] hover:shadow-[#B98768]/15 active:scale-95 sm:px-5 sm:py-2 sm:text-sm"
          >
            예약하기
          </Link>
          */}
        </div>
      </div>
    </header>
  );
}
