import { createClient } from "@supabase/supabase-js";

type SupabaseAuthEnv = {
  url: string;
  anonKey: string;
};

function getSupabaseAuthEnv(): SupabaseAuthEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    "";

  if (!url || !anonKey) {
    throw new Error(
      "Supabase Auth env is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return { url, anonKey };
}

export function createSupabaseAuthClient() {
  const { url, anonKey } = getSupabaseAuthEnv();
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
