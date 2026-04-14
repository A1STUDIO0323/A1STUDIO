"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function OAuthCallbackHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    
    if (code) {
      // Supabase의 detectSessionInUrl이 code를 처리할 시간을 줍니다
      const timer = setTimeout(() => {
        // code 파라미터만 제거 (페이지 새로고침 없이)
        const url = new URL(window.location.href);
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.toString());
      }, 2000); // 2초 대기 (Supabase가 처리할 충분한 시간)
      
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return null;
}
