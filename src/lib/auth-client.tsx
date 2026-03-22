"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

type AuthUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  provider?: string | null;
  phone?: string | null;
  phoneConfirmedAt?: string | null;
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
    },
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const supabase = createSupabaseClient();
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
  const supabase = createSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function signIn(
  provider?: "google" | "kakao",
  options?: { callbackUrl?: string; redirect?: boolean }
) {
  if (!provider) {
    if (typeof window !== "undefined") {
      const callbackUrl = options?.callbackUrl ?? window.location.pathname;
      window.location.href = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    }
    return { ok: true };
  }

  const supabase = createSupabaseClient();
  const callbackUrl =
    options?.callbackUrl ??
    (typeof window !== "undefined" ? window.location.pathname : "/");
  const next =
    callbackUrl.startsWith("/") ? callbackUrl : `/${callbackUrl}`;
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
  const supabase = createSupabaseClient();
  await supabase.auth.signOut();
  if (typeof window !== "undefined") {
    window.location.href = options?.callbackUrl ?? "/";
  }
  return { ok: true };
}
