import { createBrowserClient } from "@supabase/ssr";

export function createClient(useLocalStorage: boolean = true) {
  // Supabase SSR의 기본 쿠키 storage 사용 (storage 옵션 제거)
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      }
    }
  );
}
