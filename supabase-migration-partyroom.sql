-- 파티룸 기능 추가를 위한 데이터베이스 마이그레이션
-- Supabase SQL Editor에서 실행

-- reservations 테이블에 파티룸 관련 컬럼 추가
ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS reservation_type TEXT DEFAULT 'room' CHECK (reservation_type IN ('room', 'party-room'));

ALTER TABLE reservations 
  ADD COLUMN IF NOT EXISTS package_type TEXT CHECK (package_type IN ('day', 'night', 'allday'));

-- 기존 레코드는 모두 'room' 타입으로 설정
UPDATE reservations 
SET reservation_type = 'room' 
WHERE reservation_type IS NULL;

-- 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_reservations_type 
  ON reservations(reservation_type);

-- 코멘트 추가
COMMENT ON COLUMN reservations.reservation_type IS '예약 타입: room(연습실) 또는 party-room(파티룸)';
COMMENT ON COLUMN reservations.package_type IS '파티룸 패키지 타입: day(낮 패키지), night(야간 패키지), allday(종일권)';
