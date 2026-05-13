-- ============================================================
-- cm_profiles 노출 위치 독립 토글 추가 (Phase 2 — 2026-05-13)
-- ============================================================
-- 변경 사항:
--   1) show_in_section (BOOLEAN, default true): 원데이/레슨 메인 페이지 본문 CM 카드 노출 여부
--   2) show_in_list    (BOOLEAN, default true): 원데이/레슨 CM 목록 페이지 노출 여부
--
-- 기존 행은 현재 is_public 값을 그대로 두 컬럼에 복사 (백필).
-- is_public 은 레거시 마스터 토글로 유지하며, 애플리케이션에서
-- (show_in_section || show_in_list) 와 동기화한다.
--
-- 실행 위치: Supabase SQL Editor
-- prisma db push 사용 금지 (운영 DB)
-- ============================================================

ALTER TABLE public.cm_profiles
  ADD COLUMN IF NOT EXISTS show_in_section BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_in_list    BOOLEAN NOT NULL DEFAULT true;

-- 백필: 기존 행은 현재 is_public 값을 양쪽 컬럼에 복사
UPDATE public.cm_profiles
SET show_in_section = is_public,
    show_in_list    = is_public
WHERE show_in_section IS DISTINCT FROM is_public
   OR show_in_list    IS DISTINCT FROM is_public;
