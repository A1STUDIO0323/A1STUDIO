-- 파티룸 예약 시스템 데이터베이스 마이그레이션
-- Supabase SQL Editor에서 실행

-- 1. 파티룸 예약 테이블 생성
CREATE TABLE IF NOT EXISTS party_reservations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  package_type     TEXT NOT NULL CHECK (package_type IN ('day', 'night', 'allday')),
  date             DATE NOT NULL,          -- 낮/종일권: 이용 시작일, 야간: 입실일
  start_time       TIME NOT NULL,          -- 10:00 / 19:00
  end_time         TIME NOT NULL,          -- 17:00 / 익일 07:00
  end_date         DATE NOT NULL,          -- 익일 여부 반영 (야간/종일권은 익일 날짜)
  price_type       TEXT NOT NULL CHECK (price_type IN ('peak', 'off_peak')),
  is_event_price   BOOLEAN DEFAULT TRUE,
  total_amount     INTEGER NOT NULL,        -- 최종 결제 금액
  payment_method   TEXT NOT NULL CHECK (payment_method IN ('points', 'kakaopay')),
  points_used      INTEGER DEFAULT 0,
  status           TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  kakaopay_tid     TEXT,                   -- 카카오페이 결제 tid
  kakaopay_order_id TEXT UNIQUE,           -- 카카오페이 주문 ID
  headcount        INTEGER DEFAULT 1,
  guest_name       TEXT,
  guest_phone      TEXT,
  memo             TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at     TIMESTAMPTZ,
  refund_method    TEXT CHECK (refund_method IN ('points', 'card_cancel')),
  refund_amount    INTEGER DEFAULT 0,
  refund_points    INTEGER DEFAULT 0
);

-- 2. 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_party_reservations_user_id 
  ON party_reservations(user_id);

CREATE INDEX IF NOT EXISTS idx_party_reservations_date 
  ON party_reservations(date);

CREATE INDEX IF NOT EXISTS idx_party_reservations_status 
  ON party_reservations(status);

CREATE INDEX IF NOT EXISTS idx_party_reservations_date_package 
  ON party_reservations(date, package_type, status);

-- 3. RLS (Row Level Security) 정책 설정
ALTER TABLE party_reservations ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 예약만 조회 가능
CREATE POLICY "Users can view own party reservations"
  ON party_reservations
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 자신의 예약만 생성 가능
CREATE POLICY "Users can insert own party reservations"
  ON party_reservations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 예약만 업데이트 가능 (취소용)
CREATE POLICY "Users can update own party reservations"
  ON party_reservations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. 코멘트 추가 (문서화)
COMMENT ON TABLE party_reservations IS '파티룸 예약 정보 (연습실 예약과 별개)';
COMMENT ON COLUMN party_reservations.package_type IS '패키지 타입: day(낮), night(야간), allday(종일권)';
COMMENT ON COLUMN party_reservations.date IS '이용 시작일 (야간의 경우 입실일)';
COMMENT ON COLUMN party_reservations.end_date IS '이용 종료일 (야간/종일권의 경우 익일)';
COMMENT ON COLUMN party_reservations.price_type IS '가격 타입: peak(피크), off_peak(비피크)';
COMMENT ON COLUMN party_reservations.payment_method IS '결제 수단: points(포인트), kakaopay(카카오페이)';
COMMENT ON COLUMN party_reservations.refund_method IS '환불 방법: points(포인트 환불), card_cancel(카드 취소)';

-- 5. 포인트 환불 함수 생성 (취소 시 사용)
CREATE OR REPLACE FUNCTION refund_party_room_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_reservation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 포인트 잔액 증가
  UPDATE user_points
  SET 
    balance = balance + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- 거래 내역 기록
  INSERT INTO point_transactions (
    user_id,
    amount,
    type,
    description,
    reservation_id,
    created_at
  ) VALUES (
    p_user_id,
    p_amount,
    'refund',
    p_description,
    p_reservation_id,
    NOW()
  );

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION refund_party_room_points IS '파티룸 예약 취소 시 포인트 환불 처리';
