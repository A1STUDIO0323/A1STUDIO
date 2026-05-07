export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const LOG_PREFIX = "[intake:submit]";

const SubmitSchema = z.object({
  contact_name: z.string().trim().min(1, "담당자 성함을 입력해주세요").max(50),
  contact_phone: z.string().trim().min(1, "연락처를 입력해주세요").max(30),
  contact_email: z.string().trim().email("올바른 이메일을 입력해주세요").max(120),
  contact_role: z.string().trim().max(50).optional().nullable(),
  preferred_channel: z.string().trim().max(20).optional().nullable(),

  business_name: z.string().trim().max(120).optional().nullable(),
  business_number: z.string().trim().max(30).optional().nullable(),
  representative: z.string().trim().max(50).optional().nullable(),
  business_address: z.string().trim().max(255).optional().nullable(),
  business_phone: z.string().trim().max(30).optional().nullable(),
  business_email: z.string().trim().max(120).optional().nullable(),
  ecommerce_license: z.string().trim().max(60).optional().nullable(),
  industry: z.string().trim().max(120).optional().nullable(),

  goals: z.array(z.string()).max(20).optional().nullable(),
  goal_summary: z.string().trim().max(2000).optional().nullable(),
  target_tier: z.enum(["1", "2", "3", "4", "5", "unsure"]).optional().nullable(),

  brand_logo_status: z.string().trim().max(60).optional().nullable(),
  brand_color_main: z.string().trim().max(60).optional().nullable(),
  brand_color_sub: z.string().trim().max(60).optional().nullable(),
  brand_color_avoid: z.string().trim().max(120).optional().nullable(),
  tone_and_manner: z.array(z.string()).max(20).optional().nullable(),
  reference_sites: z.array(z.object({ url: z.string().max(255), note: z.string().max(255).optional() })).max(10).optional().nullable(),

  menu_items: z.array(z.string()).max(30).optional().nullable(),
  intro_text: z.string().trim().max(3000).optional().nullable(),
  products: z.array(z.object({
    name: z.string().max(120).optional(),
    description: z.string().max(500).optional(),
    price: z.string().max(60).optional(),
    note: z.string().max(255).optional(),
  })).max(50).optional().nullable(),
  photo_status: z.string().trim().max(60).optional().nullable(),
  faqs: z.array(z.object({ q: z.string().max(255).optional(), a: z.string().max(1000).optional() })).max(30).optional().nullable(),

  business_hours: z.string().trim().max(255).optional().nullable(),
  closed_days: z.string().trim().max(255).optional().nullable(),
  location: z.string().trim().max(255).optional().nullable(),
  parking: z.string().trim().max(60).optional().nullable(),
  social_links: z.array(z.object({ kind: z.string().max(40), url: z.string().max(255) })).max(20).optional().nullable(),

  domain_status: z.string().trim().max(60).optional().nullable(),
  domain_candidates: z.array(z.string()).max(10).optional().nullable(),

  member_required: z.string().trim().max(60).optional().nullable(),
  signup_methods: z.array(z.string()).max(20).optional().nullable(),
  signup_fields: z.array(z.string()).max(30).optional().nullable(),
  member_tiers: z.string().trim().max(255).optional().nullable(),

  booking_unit: z.string().trim().max(60).optional().nullable(),
  booking_duration: z.string().trim().max(60).optional().nullable(),
  booking_capacity: z.string().trim().max(60).optional().nullable(),
  booking_targets: z.string().trim().max(255).optional().nullable(),
  booking_window: z.string().trim().max(60).optional().nullable(),
  booking_max_days: z.string().trim().max(60).optional().nullable(),
  refund_policy: z.string().trim().max(2000).optional().nullable(),
  notification_prefs: z.array(z.string()).max(10).optional().nullable(),

  pg_ready: z.array(z.string()).max(10).optional().nullable(),
  payment_methods: z.array(z.string()).max(20).optional().nullable(),
  refund_terms: z.string().trim().max(2000).optional().nullable(),
  guest_checkout: z.string().trim().max(60).optional().nullable(),

  admin_operators: z.string().trim().max(2000).optional().nullable(),
  admin_features: z.array(z.string()).max(30).optional().nullable(),

  desired_open_date: z.string().trim().max(60).optional().nullable(),
  deadline: z.string().trim().max(255).optional().nullable(),
  budget_range: z.string().trim().max(60).optional().nullable(),
  payment_split: z.string().trim().max(60).optional().nullable(),
  infra_payer: z.string().trim().max(60).optional().nullable(),

  extra_requests: z.string().trim().max(5000).optional().nullable(),
  agreed: z.boolean().refine((v) => v === true, { message: "동의가 필요합니다" }),
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "-";
  if (Array.isArray(v)) {
    if (v.length === 0) return "-";
    if (typeof v[0] === "object") return JSON.stringify(v, null, 2);
    return v.join(", ");
  }
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
}

function tierLabel(t?: string | null): string {
  switch (t) {
    case "1": return "1단계 — 일반 소개 페이지";
    case "2": return "2단계 — 회원 + 게시판";
    case "3": return "3단계 — 예약 시스템";
    case "4": return "4단계 — 결제 시스템";
    case "5": return "5단계 — 풀 커스텀 플랫폼";
    case "unsure": return "미정 (상담 후 결정)";
    default: return "-";
  }
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;
  const userAgent = req.headers.get("user-agent") || null;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch (err) {
    logger.error(`${LOG_PREFIX} invalid_json ip=${ip}`, err);
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = SubmitSchema.safeParse(payload);
  if (!parsed.success) {
    logger.error(
      `${LOG_PREFIX} validation_failed ip=${ip} issues=${parsed.error.issues
        .map((i) => `${i.path.join(".")}:${i.message}`)
        .join(" | ")}`
    );
    return NextResponse.json(
      { error: "입력값을 확인해주세요.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;
  logger.info(`${LOG_PREFIX} start name=${data.contact_name} email=${data.contact_email} tier=${data.target_tier ?? "-"} ip=${ip}`);

  let saved: { id: string } | null = null;
  try {
    saved = await prisma.intake_submissions.create({
      data: {
        contact_name: data.contact_name,
        contact_phone: data.contact_phone,
        contact_email: data.contact_email,
        contact_role: data.contact_role ?? null,
        preferred_channel: data.preferred_channel ?? null,
        business_name: data.business_name ?? null,
        business_number: data.business_number ?? null,
        representative: data.representative ?? null,
        business_address: data.business_address ?? null,
        business_phone: data.business_phone ?? null,
        business_email: data.business_email ?? null,
        ecommerce_license: data.ecommerce_license ?? null,
        industry: data.industry ?? null,
        goals: data.goals ?? undefined,
        goal_summary: data.goal_summary ?? null,
        target_tier: data.target_tier ?? null,
        brand_logo_status: data.brand_logo_status ?? null,
        brand_color_main: data.brand_color_main ?? null,
        brand_color_sub: data.brand_color_sub ?? null,
        brand_color_avoid: data.brand_color_avoid ?? null,
        tone_and_manner: data.tone_and_manner ?? undefined,
        reference_sites: data.reference_sites ?? undefined,
        menu_items: data.menu_items ?? undefined,
        intro_text: data.intro_text ?? null,
        products: data.products ?? undefined,
        photo_status: data.photo_status ?? null,
        faqs: data.faqs ?? undefined,
        business_hours: data.business_hours ?? null,
        closed_days: data.closed_days ?? null,
        location: data.location ?? null,
        parking: data.parking ?? null,
        social_links: data.social_links ?? undefined,
        domain_status: data.domain_status ?? null,
        domain_candidates: data.domain_candidates ?? undefined,
        member_required: data.member_required ?? null,
        signup_methods: data.signup_methods ?? undefined,
        signup_fields: data.signup_fields ?? undefined,
        member_tiers: data.member_tiers ?? null,
        booking_unit: data.booking_unit ?? null,
        booking_duration: data.booking_duration ?? null,
        booking_capacity: data.booking_capacity ?? null,
        booking_targets: data.booking_targets ?? null,
        booking_window: data.booking_window ?? null,
        booking_max_days: data.booking_max_days ?? null,
        refund_policy: data.refund_policy ?? null,
        notification_prefs: data.notification_prefs ?? undefined,
        pg_ready: data.pg_ready ?? undefined,
        payment_methods: data.payment_methods ?? undefined,
        refund_terms: data.refund_terms ?? null,
        guest_checkout: data.guest_checkout ?? null,
        admin_operators: data.admin_operators ?? null,
        admin_features: data.admin_features ?? undefined,
        desired_open_date: data.desired_open_date ?? null,
        deadline: data.deadline ?? null,
        budget_range: data.budget_range ?? null,
        payment_split: data.payment_split ?? null,
        infra_payer: data.infra_payer ?? null,
        extra_requests: data.extra_requests ?? null,
        agreed: data.agreed,
        source_ip: ip,
        user_agent: userAgent,
      },
      select: { id: true },
    });
  } catch (err) {
    logger.error(`${LOG_PREFIX} db_failed name=${data.contact_name} email=${data.contact_email}`, err);
    return NextResponse.json(
      { error: "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }

  // 메일 발송 (실패해도 저장은 성공으로 처리)
  const apiKey = process.env.SENDGRID_API_KEY;
  const toEmail = process.env.INTAKE_TO_EMAIL || process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;

  if (apiKey && toEmail && fromEmail) {
    sgMail.setApiKey(apiKey);

    const rows: [string, unknown][] = [
      ["담당자", data.contact_name],
      ["연락처", data.contact_phone],
      ["이메일", data.contact_email],
      ["직책", data.contact_role],
      ["선호 채널", data.preferred_channel],
      ["─ 사업자 ─", ""],
      ["상호", data.business_name],
      ["사업자번호", data.business_number],
      ["대표자", data.representative],
      ["주소", data.business_address],
      ["대표 전화", data.business_phone],
      ["대표 이메일", data.business_email],
      ["통신판매업 신고", data.ecommerce_license],
      ["업종", data.industry],
      ["─ 의뢰 내용 ─", ""],
      ["목적", data.goals],
      ["한 줄 요약", data.goal_summary],
      ["희망 단계", tierLabel(data.target_tier)],
      ["─ 브랜드 ─", ""],
      ["로고", data.brand_logo_status],
      ["대표 컬러", data.brand_color_main],
      ["보조 컬러", data.brand_color_sub],
      ["피하고 싶은 색", data.brand_color_avoid],
      ["톤앤매너", data.tone_and_manner],
      ["참고 사이트", data.reference_sites],
      ["─ 콘텐츠 ─", ""],
      ["메뉴 구성", data.menu_items],
      ["회사 소개글", data.intro_text],
      ["상품·서비스", data.products],
      ["사진 상태", data.photo_status],
      ["FAQ", data.faqs],
      ["─ 운영 ─", ""],
      ["영업시간", data.business_hours],
      ["휴무일", data.closed_days],
      ["위치", data.location],
      ["주차", data.parking],
      ["SNS", data.social_links],
      ["─ 도메인 ─", ""],
      ["도메인 보유", data.domain_status],
      ["도메인 후보", data.domain_candidates],
      ["─ 회원 ─", ""],
      ["회원 가입", data.member_required],
      ["가입 방식", data.signup_methods],
      ["가입 필드", data.signup_fields],
      ["등급", data.member_tiers],
      ["─ 예약 ─", ""],
      ["예약 단위", data.booking_unit],
      ["1회 시간", data.booking_duration],
      ["수용 인원", data.booking_capacity],
      ["예약 항목", data.booking_targets],
      ["예약 시작", data.booking_window],
      ["최대 가능일", data.booking_max_days],
      ["취소·환불 정책", data.refund_policy],
      ["알림", data.notification_prefs],
      ["─ 결제 ─", ""],
      ["사전 준비", data.pg_ready],
      ["결제 수단", data.payment_methods],
      ["환불 규정", data.refund_terms],
      ["비회원 결제", data.guest_checkout],
      ["─ 관리자 ─", ""],
      ["운영자", data.admin_operators],
      ["관리 기능", data.admin_features],
      ["─ 일정·예산 ─", ""],
      ["희망 오픈일", data.desired_open_date],
      ["마감", data.deadline],
      ["예산 범위", data.budget_range],
      ["분할 결제", data.payment_split],
      ["인프라 비용", data.infra_payer],
      ["─ 기타 ─", ""],
      ["추가 요청", data.extra_requests],
    ];

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:720px;margin:0 auto;color:#18181b">
        <h2 style="background:#7c3aed;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0;margin:0">신규 홈페이지 제작 의뢰</h2>
        <div style="border:1px solid #e4e4e7;border-top:none;border-radius:0 0 8px 8px;padding:24px">
          <p style="margin:0 0 16px;color:#71717a;font-size:13px">제출 ID: ${saved.id} · IP: ${escapeHtml(ip ?? "-")}</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            ${rows
              .map(([k, v]) => {
                if (k.startsWith("─")) {
                  return `<tr><td colspan="2" style="padding:14px 0 6px;color:#7c3aed;font-weight:700;border-top:1px solid #e4e4e7">${escapeHtml(k)}</td></tr>`;
                }
                const val = fmt(v);
                return `<tr>
                  <td style="padding:6px 8px 6px 0;color:#71717a;width:140px;vertical-align:top">${escapeHtml(k)}</td>
                  <td style="padding:6px 0;font-weight:500;white-space:pre-wrap;word-break:break-word">${escapeHtml(val)}</td>
                </tr>`;
              })
              .join("")}
          </table>
        </div>
      </div>
    `;

    try {
      await sgMail.send({
        to: toEmail,
        from: fromEmail,
        subject: `[A1STUDIO 의뢰] ${data.contact_name} · ${tierLabel(data.target_tier)}`,
        text: rows
          .map(([k, v]) => (k.startsWith("─") ? `\n${k}\n` : `${k}: ${fmt(v)}`))
          .join("\n"),
        html,
        replyTo: data.contact_email,
      });
      logger.info(`${LOG_PREFIX} mail_sent id=${saved.id}`);
    } catch (err) {
      logger.error(`${LOG_PREFIX} mail_failed id=${saved.id}`, err);
      // 메일 실패해도 사용자에게는 성공 응답 (DB에 저장됐으므로)
    }
  } else {
    logger.warn(`${LOG_PREFIX} mail_skipped reason=missing_env id=${saved.id}`);
  }

  logger.info(`${LOG_PREFIX} success id=${saved.id} email=${data.contact_email}`);
  return NextResponse.json({ success: true, id: saved.id });
}
