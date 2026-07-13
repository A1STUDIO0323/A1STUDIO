-- 외부 플랫폼(스페이스클라우드/네이버 스마트플레이스) 예약 동기화 지원
-- sync-agent(24시간 PC)가 /api/sync/* 를 통해 사용한다.

-- 1. external_reservations: SMS 발송/상대 플랫폼 차단 추적 컬럼
ALTER TABLE external_reservations ADD COLUMN IF NOT EXISTS sms_sent_at TIMESTAMPTZ;
ALTER TABLE external_reservations ADD COLUMN IF NOT EXISTS blocked_on_peer_at TIMESTAMPTZ;
ALTER TABLE external_reservations ADD COLUMN IF NOT EXISTS end_date TEXT;

-- 2. (platform, external_id) 멱등 upsert 용 유니크 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS uq_external_reservations_platform_external_id
  ON external_reservations(platform, external_id)
  WHERE external_id IS NOT NULL;

-- 3. 홈페이지 자체 예약을 외부 플랫폼에 차단 반영했는지 추적
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS synced_to_platforms_at TIMESTAMPTZ;
ALTER TABLE party_reservations ADD COLUMN IF NOT EXISTS synced_to_platforms_at TIMESTAMPTZ;

-- 4. sync-agent 상태(하트비트) — 관리자 화면에서 동기화 상태 확인용
CREATE TABLE IF NOT EXISTS sync_status (
  id TEXT PRIMARY KEY,             -- 'sync-agent'
  last_seen_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync_status"
  ON sync_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM member_roles
      WHERE member_roles.email = auth.jwt()->>'email'
      AND member_roles.role IN ('admin', 'owner')
    )
  );
