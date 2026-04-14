-- 1. Add CONFIRMED to ReservationStatus enum
ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';

-- 2. Update existing 'confirmed' values to 'CONFIRMED' if any exist
UPDATE reservations SET status = 'CONFIRMED' WHERE status = 'confirmed';
UPDATE party_reservations SET status = 'CONFIRMED' WHERE status = 'confirmed';

-- 3. Create external_reservations table for space cloud, naver place etc.
CREATE TABLE IF NOT EXISTS external_reservations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  platform TEXT NOT NULL,
  external_id TEXT,
  room_type TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  amount INTEGER DEFAULT 0,
  status TEXT DEFAULT 'confirmed',
  memo TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_external_reservations_platform_date ON external_reservations(platform, date);
CREATE INDEX IF NOT EXISTS idx_external_reservations_date ON external_reservations(date);

-- 4. Create payment_locks table for payment duplication prevention
CREATE TABLE IF NOT EXISTS payment_locks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL,
  lock_type TEXT NOT NULL,
  lock_key TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lock_type, lock_key)
);

CREATE INDEX IF NOT EXISTS idx_payment_locks_user_type ON payment_locks(user_id, lock_type);
CREATE INDEX IF NOT EXISTS idx_payment_locks_expires ON payment_locks(expires_at);

-- 5. Create function to auto-delete expired locks
CREATE OR REPLACE FUNCTION delete_expired_payment_locks()
RETURNS void AS $$
BEGIN
  DELETE FROM payment_locks WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 6. Enable RLS on new tables
ALTER TABLE external_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_locks ENABLE ROW LEVEL SECURITY;

-- 7. Create policies for external_reservations (admin only)
CREATE POLICY "Admins can view external_reservations"
  ON external_reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM member_roles
      WHERE member_roles.email = auth.jwt()->>'email'
      AND member_roles.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can insert external_reservations"
  ON external_reservations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM member_roles
      WHERE member_roles.email = auth.jwt()->>'email'
      AND member_roles.role IN ('admin', 'owner')
    )
  );

-- 8. Create policies for payment_locks (users can view their own)
CREATE POLICY "Users can view their own payment_locks"
  ON payment_locks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own payment_locks"
  ON payment_locks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own payment_locks"
  ON payment_locks FOR DELETE
  USING (user_id = auth.uid());

