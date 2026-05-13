-- 장기대관 고객 관리 테이블
-- 적용 방법: Supabase SQL Editor에서 실행 OR `npx prisma db push`
-- (이 프로젝트는 `db push` 방식 운영 — 권장: db push)

CREATE TABLE IF NOT EXISTS "public"."long_term_bookings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "customer_name" TEXT NOT NULL,
  "customer_phone" TEXT NOT NULL,

  "day_of_week" TEXT,
  "usage_month" TEXT NOT NULL,
  "usage_dates" INTEGER[] NOT NULL,
  "start_hour" INTEGER NOT NULL,
  "end_hour" INTEGER NOT NULL,

  "space_type" TEXT NOT NULL DEFAULT '연습실',
  "hours_per_day" INTEGER NOT NULL,
  "total_hours" INTEGER NOT NULL,
  "hourly_rate" INTEGER NOT NULL,
  "gross_amount" INTEGER NOT NULL,
  "discount_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "discount_amount" INTEGER NOT NULL DEFAULT 0,
  "final_amount" INTEGER NOT NULL,

  "payment_notice_sent_at" TIMESTAMP(3),
  "payment_notice_message_id" TEXT,
  "payment_confirmed_at" TIMESTAMP(3),

  "usage_notice_schedule" JSONB,
  "usage_notice_send_hour" INTEGER NOT NULL DEFAULT 10,

  "admin_memo" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "long_term_bookings_status_idx" ON "public"."long_term_bookings"("status");
CREATE INDEX IF NOT EXISTS "long_term_bookings_created_at_idx" ON "public"."long_term_bookings"("created_at");
