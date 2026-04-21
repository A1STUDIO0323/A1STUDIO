"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { sanitizePostAuthRedirect } from "@/lib/safe-redirect";

type AuthUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  provider?: string | null;
  phone?: string | null;
  phoneConfirmedAt?: string | null;
  birthdate?: string | null;
};

type AuthSession = {
  user: AuthUser;
};

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  session: AuthSession | null;
};

const AuthContext = createContext<AuthContextValue>({
  status: "loading",
  session: null,
});

function mapSession(session: Session | null): AuthSession | null {
  if (!session?.user) return null;
  const user = session.user;
  const meta = user.user_metadata ?? {};
  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      name:
        typeof meta.name === "string"
          ? meta.name
          : typeof meta.full_name === "string"
            ? meta.full_name
            : null,
      image:
        typeof meta.avatar_url === "string"
          ? meta.avatar_url
          : typeof meta.picture === "string"
            ? meta.picture
            : null,
      provider:
        typeof user.app_metadata?.provider === "string"
          ? user.app_metadata.provider
          : null,
      phone: user.phone ?? null,
      phoneConfirmedAt: user.phone_confirmed_at ?? null,
      birthdate: typeof meta.birthdate === "string" ? meta.birthdate : null,
    },
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    // remember me 설정 확인 (기본값: true)
    const rememberMe = localStorage.getItem('rememberMe') !== 'false';
    const supabase = createSupabaseClient(rememberMe);
    let active = true;

    void (async () => {
      // 세션 확인
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const mapped = mapSession(data.session ?? null);
      setSession(mapped);
      setStatus(mapped ? "authenticated" : "unauthenticated");
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
      const mapped = mapSession(supabaseSession);
      setSession(mapped);
      setStatus(mapped ? "authenticated" : "unauthenticated");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ status, session }), [status, session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession() {
  const ctx = useContext(AuthContext);
  return {
    data: ctx.session,
    status: ctx.status,
  };
}

export async function getAccessToken() {
  const rememberMe = typeof window !== 'undefined' 
    ? localStorage.getItem('rememberMe') !== 'false' 
    : true;
  const supabase = createSupabaseClient(rememberMe);
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signIn(
  provider?: "google" | "kakao",
  options?: { callbackUrl?: string; redirect?: boolean }
) {
  if (!provider) {
    if (typeof window !== "undefined") {
      const callbackUrl = sanitizePostAuthRedirect(
        options?.callbackUrl ?? window.location.pathname
      );
      window.location.href = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    }
    return { ok: true };
  }

  // remember me 설정에 따라 적절한 storage 사용
  const rememberMe = typeof window !== 'undefined' 
    ? localStorage.getItem('rememberMe') !== 'false' 
    : true;
  const supabase = createSupabaseClient(rememberMe);
  const raw =
    options?.callbackUrl ??
    (typeof window !== "undefined" ? window.location.pathname : "/");
  const next = sanitizePostAuthRedirect(raw);
  
  // window.location.origin 우선 사용 (실제 접속 환경 기준)
  const siteUrl = typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  if (typeof window !== "undefined") {
    console.log("[signIn OAuth] Provider:", provider);
    console.log("[signIn OAuth] Redirect URL:", redirectTo);
    console.log("[signIn OAuth] Post-callback path:", next);
    console.log("[signIn OAuth] Remember me:", rememberMe);
    console.log("[signIn OAuth] Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("[signIn OAuth] Supabase Key configured:", !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  }

  // 카카오 로그인 시 필수 동의 항목 설정 (GoTrue/OAuth는 공백 구분 scope 문자열 사용)
  const scopes = provider === "kakao"
    ? "name birthyear phone_number"
    : undefined;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { 
      redirectTo,
      ...(scopes && { scopes }),
    },
  });

  if (error) {
    if (typeof window !== "undefined") {
      console.error("[signIn OAuth] Error:", error);
    }
    return { ok: false, error: error.message };
  }

  if (typeof window !== "undefined") {
    console.log("[signIn OAuth] Response data:", data);
    console.log("%c[signIn OAuth] 카카오 로그인 페이지로 리다이렉트 중...", "color: green; font-weight: bold");
  }

  return { ok: true };
}

export async function signOut(options?: { callbackUrl?: string }) {
  const rememberMe = typeof window !== 'undefined' 
    ? localStorage.getItem('rememberMe') !== 'false' 
    : true;
  const supabase = createSupabaseClient(rememberMe);
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    window.location.href = options?.callbackUrl ?? "/";
  }
  return { ok: true };
}

/**
 * 현재 로그인 유저의 성인 여부 반환
 * @returns true: 만 19세 이상 / false: 미성년 / null: 생년월일 정보 없음
 */
export function useIsAdult(): boolean | null {
  const { data: session } = useSession();
  const [isAdult, setIsAdult] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // URL에서 refresh 파라미터 확인
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const refresh = urlParams.get('refresh');
      if (refresh) {
        setRefreshKey(Date.now());
      }
    }
  }, []);
  
  useEffect(() => {
    if (!session?.user?.email) {
      setIsAdult(null);
      return;
    }
    
    // 프로필에서 생년월일 가져오기
    fetch("/api/members/profile", {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success || !data.profile?.birthDate) {
          setIsAdult(null);
          return;
        }
        
        // 나이 계산
        const birth = new Date(data.profile.birthDate);
        const today = new Date();
        const age = today.getFullYear() - birth.getFullYear();
        const isBirthdayPassed =
          today.getMonth() > birth.getMonth() ||
          (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
        
        setIsAdult(age - (isBirthdayPassed ? 0 : 1) >= 19);
      })
      .catch(() => {
        setIsAdult(null);
      });
  }, [session?.user?.email, refreshKey]);
  
  return isAdult;
}
