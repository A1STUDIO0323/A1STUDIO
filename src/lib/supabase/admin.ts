import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase 클라이언트 (RLS 우회) — 서버 전용.
 *
 * reservations / party_reservations 는 RLS SELECT 정책이 `user_id = auth.uid() OR is_admin()`
 * 이므로 일반 세션 클라이언트로는 "본인 예약"만 보인다.
 * 예약 충돌·가용성 검사는 **모든 사용자의 예약**을 봐야 정확하므로 service-role 로 조회한다.
 *
 * ⚠️ 절대 클라이언트(브라우저)로 노출 금지. 서버 라우트/서버 모듈에서만 사용.
 */
let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "service-role 클라이언트 생성 실패: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 미설정"
    );
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
