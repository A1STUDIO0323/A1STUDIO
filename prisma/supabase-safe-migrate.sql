-- ============================================================
-- A1STUDIO 안전 마이그레이션 SQL (v2 - 최소 수정)
-- Supabase SQL Editor에서 전체 실행하세요.
-- ============================================================

-- ── ENUM 타입 (없으면 생성) ────────────────────────────────────
DO $$ BEGIN CREATE TYPE "OneDayClassStatus"  AS ENUM ('OPEN','CONFIRMED','CANCELLED','COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "ReservationStatus"  AS ENUM ('HOLD','PAID','CANCELLED','EXPIRED','REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','APPROVED','FAILED','CANCELLED','PARTIAL_REFUNDED','REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED','APPROVED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 핵심 테이블: reservations ──────────────────────────────────
-- Prisma 오류의 직접 원인 = 누락 컬럼
DO $$ BEGIN
  ALTER TABLE "reservations" ADD COLUMN "guest_email" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "reservations" ADD COLUMN "auth_code" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "reservations" ADD COLUMN "user_id" UUID;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "reservations" ADD COLUMN "memo" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ── blocked_slots ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "blocked_slots" (
    "id"         TEXT NOT NULL,
    "room_id"    TEXT NOT NULL DEFAULT '',
    "date"       TEXT NOT NULL DEFAULT '',
    "start_time" TEXT NOT NULL DEFAULT '',
    "end_time"   TEXT NOT NULL DEFAULT '',
    "reason"     TEXT NOT NULL DEFAULT '관리자 차단',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "blocked_slots_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "blocked_slots" ADD COLUMN "room_id" TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "blocked_slots" ADD COLUMN "date" TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "blocked_slots" ADD COLUMN "start_time" TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "blocked_slots" ADD COLUMN "end_time" TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "blocked_slots" ADD COLUMN "reason" TEXT NOT NULL DEFAULT '관리자 차단';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- blocked_slots 인덱스 (컬럼 존재 확인 후 생성)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'blocked_slots'
      AND column_name  = 'room_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "blocked_slots_room_id_date_idx" ON "blocked_slots"("room_id","date")';
  END IF;
END $$;

-- ── 나머지 테이블 (없으면 생성) ───────────────────────────────
CREATE TABLE IF NOT EXISTS "email_auth_users" (
    "email"         TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name"          TEXT,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_auth_users_pkey" PRIMARY KEY ("email")
);

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "token"      TEXT NOT NULL,
    "email"      TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at"    TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("token")
);
CREATE INDEX IF NOT EXISTS "password_reset_tokens_email_idx"      ON "password_reset_tokens"("email");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

CREATE TABLE IF NOT EXISTS "one_day_classes" (
    "id"               TEXT NOT NULL,
    "title"            TEXT NOT NULL,
    "teacher_name"     TEXT NOT NULL,
    "teacher_profile"  TEXT NOT NULL,
    "teacher_image"    TEXT,
    "class_type"       TEXT NOT NULL,
    "description"      TEXT NOT NULL,
    "desired_date"     TIMESTAMP(3) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 120,
    "min_headcount"    INTEGER NOT NULL DEFAULT 8,
    "max_headcount"    INTEGER NOT NULL DEFAULT 15,
    "price_per_person" INTEGER NOT NULL,
    "status"           "OneDayClassStatus" NOT NULL DEFAULT 'OPEN',
    "confirmed_date"   TIMESTAMP(3),
    "is_published"     BOOLEAN NOT NULL DEFAULT true,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "one_day_classes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "one_day_class_applications" (
    "id"           TEXT NOT NULL,
    "class_id"     TEXT NOT NULL,
    "user_id"      UUID,
    "guest_name"   TEXT NOT NULL,
    "guest_phone"  TEXT NOT NULL,
    "guest_email"  TEXT,
    "headcount"    INTEGER NOT NULL DEFAULT 1,
    "message"      TEXT,
    "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "one_day_class_applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "rooms" (
    "id"            TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "slug"          TEXT NOT NULL DEFAULT '',
    "description"   TEXT,
    "capacity"      INTEGER NOT NULL DEFAULT 0,
    "size_m2"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amenities_json" JSONB NOT NULL DEFAULT '[]',
    "images"        JSONB NOT NULL DEFAULT '[]',
    "is_active"     BOOLEAN NOT NULL DEFAULT true,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "rooms_slug_key" ON "rooms"("slug");

CREATE TABLE IF NOT EXISTS "pricing_rules" (
    "id"               TEXT NOT NULL,
    "room_id"          TEXT NOT NULL DEFAULT '',
    "label"            TEXT NOT NULL DEFAULT '',
    "day_of_week_mask" INTEGER NOT NULL DEFAULT 0,
    "time_start"       TEXT NOT NULL DEFAULT '',
    "time_end"         TEXT NOT NULL DEFAULT '',
    "price_per_hour"   INTEGER NOT NULL DEFAULT 0,
    "min_hours"        INTEGER NOT NULL DEFAULT 1,
    "is_package"       BOOLEAN NOT NULL DEFAULT false,
    "package_name"     TEXT,
    "package_hours"    INTEGER,
    "package_price"    INTEGER,
    "is_active"        BOOLEAN NOT NULL DEFAULT true,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "reservations" (
    "id"           TEXT NOT NULL,
    "room_id"      TEXT NOT NULL DEFAULT '',
    "user_id"      UUID,
    "guest_name"   TEXT NOT NULL DEFAULT '',
    "guest_phone"  TEXT NOT NULL DEFAULT '',
    "guest_email"  TEXT,
    "date"         TEXT NOT NULL DEFAULT '',
    "start_time"   TEXT NOT NULL DEFAULT '',
    "end_time"     TEXT NOT NULL DEFAULT '',
    "headcount"    INTEGER NOT NULL DEFAULT 1,
    "status"       "ReservationStatus" NOT NULL DEFAULT 'HOLD',
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "memo"         TEXT,
    "auth_code"    TEXT,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "reservations_room_id_date_idx"  ON "reservations"("room_id","date");
CREATE INDEX IF NOT EXISTS "reservations_guest_phone_idx"   ON "reservations"("guest_phone");

CREATE TABLE IF NOT EXISTS "reservation_holds" (
    "id"             TEXT NOT NULL,
    "room_id"        TEXT NOT NULL DEFAULT '',
    "reservation_id" TEXT NOT NULL DEFAULT '',
    "date"           TEXT NOT NULL DEFAULT '',
    "start_time"     TEXT NOT NULL DEFAULT '',
    "end_time"       TEXT NOT NULL DEFAULT '',
    "expires_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reservation_holds_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "reservation_holds_reservation_id_key"
    ON "reservation_holds"("reservation_id");
CREATE UNIQUE INDEX IF NOT EXISTS "reservation_holds_room_id_date_start_time_end_time_key"
    ON "reservation_holds"("room_id","date","start_time","end_time");

CREATE TABLE IF NOT EXISTS "payments" (
    "id"                   TEXT NOT NULL,
    "reservation_id"       TEXT NOT NULL DEFAULT '',
    "provider"             TEXT NOT NULL DEFAULT 'toss',
    "provider_payment_key" TEXT,
    "order_id"             TEXT NOT NULL DEFAULT '',
    "amount"               INTEGER NOT NULL DEFAULT 0,
    "status"               "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at"          TIMESTAMP(3),
    "raw_response"         JSONB,
    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payments_reservation_id_key" ON "payments"("reservation_id");
CREATE UNIQUE INDEX IF NOT EXISTS "payments_order_id_key"       ON "payments"("order_id");

CREATE TABLE IF NOT EXISTS "refunds" (
    "id"           TEXT NOT NULL,
    "payment_id"   TEXT NOT NULL DEFAULT '',
    "amount"       INTEGER NOT NULL DEFAULT 0,
    "reason"       TEXT NOT NULL DEFAULT '',
    "status"       "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "processed_at" TIMESTAMP(3),
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "reviews" (
    "id"             TEXT NOT NULL,
    "reservation_id" TEXT NOT NULL DEFAULT '',
    "rating"         INTEGER NOT NULL DEFAULT 0,
    "content"        TEXT NOT NULL DEFAULT '',
    "nickname"       TEXT,
    "is_visible"     BOOLEAN NOT NULL DEFAULT false,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_reservation_id_key" ON "reviews"("reservation_id");

CREATE TABLE IF NOT EXISTS "notices" (
    "id"           TEXT NOT NULL,
    "title"        TEXT NOT NULL DEFAULT '',
    "content"      TEXT NOT NULL DEFAULT '',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_pinned"    BOOLEAN NOT NULL DEFAULT false,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "events" (
    "id"           TEXT NOT NULL,
    "title"        TEXT NOT NULL DEFAULT '',
    "content"      TEXT NOT NULL DEFAULT '',
    "thumbnail"    TEXT,
    "starts_at"    TIMESTAMP(3),
    "ends_at"      TIMESTAMP(3),
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);
