// 일회성 마이그레이션 스크립트 — intake_submissions 테이블 생성
// 풀러 환경에서 prisma migrate가 안 될 때 사용
// 실행: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/scripts/add-intake-submissions.ts

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { Client } from "pg";

const SQL = `
CREATE TABLE IF NOT EXISTS public.intake_submissions (
  id                  TEXT PRIMARY KEY,
  status              TEXT NOT NULL DEFAULT 'NEW',
  contact_name        TEXT NOT NULL,
  contact_phone       TEXT NOT NULL,
  contact_email       TEXT NOT NULL,
  contact_role        TEXT,
  preferred_channel   TEXT,
  business_name       TEXT,
  business_number     TEXT,
  representative      TEXT,
  business_address    TEXT,
  business_phone      TEXT,
  business_email      TEXT,
  ecommerce_license   TEXT,
  industry            TEXT,
  goals               JSONB,
  goal_summary        TEXT,
  target_tier         TEXT,
  brand_logo_status   TEXT,
  brand_color_main    TEXT,
  brand_color_sub     TEXT,
  brand_color_avoid   TEXT,
  tone_and_manner     JSONB,
  reference_sites     JSONB,
  menu_items          JSONB,
  intro_text          TEXT,
  products            JSONB,
  photo_status        TEXT,
  faqs                JSONB,
  business_hours      TEXT,
  closed_days         TEXT,
  location            TEXT,
  parking             TEXT,
  social_links        JSONB,
  domain_status       TEXT,
  domain_candidates   JSONB,
  member_required     TEXT,
  signup_methods      JSONB,
  signup_fields       JSONB,
  member_tiers        TEXT,
  booking_unit        TEXT,
  booking_duration    TEXT,
  booking_capacity    TEXT,
  booking_targets     TEXT,
  booking_window      TEXT,
  booking_max_days    TEXT,
  refund_policy       TEXT,
  notification_prefs  JSONB,
  pg_ready            JSONB,
  payment_methods     JSONB,
  refund_terms        TEXT,
  guest_checkout      TEXT,
  admin_operators     TEXT,
  admin_features      JSONB,
  desired_open_date   TEXT,
  deadline            TEXT,
  budget_range        TEXT,
  payment_split       TEXT,
  infra_payer         TEXT,
  extra_requests      TEXT,
  agreed              BOOLEAN NOT NULL DEFAULT false,
  source_ip           TEXT,
  user_agent          TEXT,
  created_at          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS intake_submissions_status_idx ON public.intake_submissions(status);
CREATE INDEX IF NOT EXISTS intake_submissions_created_at_idx ON public.intake_submissions(created_at);

ALTER TABLE public.intake_submissions ADD COLUMN IF NOT EXISTS admin_memo TEXT;
`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[migrate:intake] DATABASE_URL is not set");
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  console.log("[migrate:intake] start");
  try {
    await client.connect();
    console.log("[migrate:intake] connected");
    await client.query(SQL);
    console.log("[migrate:intake] success table=intake_submissions");
  } catch (err) {
    console.error("[migrate:intake] failed", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
