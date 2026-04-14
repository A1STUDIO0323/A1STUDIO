import { createBrowserClient } from "@supabase/ssr";

export function createClient(useLocalStorage: boolean = true) {
  // 로그인 상태 유지 여부에 따라 storage 선택
  // true: localStorage (영구 저장, 브라우저 닫아도 유지)
  // false: sessionStorage (브라우저 닫으면 로그아웃)
  
  const storage = useLocalStorage ? window.localStorage : window.sessionStorage;
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storage: storage,
        storageKey: 'supabase.auth.token',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      }
    }
  );
}
