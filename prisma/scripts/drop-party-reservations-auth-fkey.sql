-- Prisma Migrate가 `schemas = ["public"]`만 사용할 때,
-- `public.party_reservations.user_id` → `auth.users` FK 때문에 인트로스펙션 오류(P4002)가 납니다.
-- Supabase SQL Editor에서 한 번 실행한 뒤 `npx prisma migrate dev`를 다시 시도하세요.
--
-- 참고: FK 제거 후에도 애플리케이션은 Supabase Auth로 동일 UUID를 쓰면 됩니다. DB 레벨 참조 무결성만 없어집니다.
-- `profiles(id)` 등 public 쪽으로 FK를 다시 거는 것은 운영 정책에 맞게 선택하세요.

ALTER TABLE public.party_reservations
  DROP CONSTRAINT IF EXISTS party_reservations_user_id_fkey;
