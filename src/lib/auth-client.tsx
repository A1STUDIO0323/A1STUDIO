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
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    console.log("[signIn OAuth] post-callback path (sanitized)", next);
    console.log("[signIn OAuth] remember me:", rememberMe);
  }
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : "/auth/callback";

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });

  return error ? { ok: false, error: error.message } : { ok: true };
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
  const user = session?.user;
  
  if (!user?.birthdate) return null;
  
  // isAdult 함수 사용
  const birth = new Date(user.birthdate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const isBirthdayPassed =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  
  return age - (isBirthdayPassed ? 0 : 1) >= 19;
}
