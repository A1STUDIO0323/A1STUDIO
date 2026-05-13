export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import sgMail from "@sendgrid/mail";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendSMS } from "@/lib/sms";
import { STUDIO_PHONE } from "@/lib/constants";

const LOG_PREFIX = "[long-term:apply]";

// 고객용 장기대관 신청 API
// - 카카오페이 심사 중: 결제 흐름과 무관, long_term_bookings 테이블에 status='REQUESTED'로만 저장
// - 어드민 권한 검증 없음 (공개 API). 어드민 라우트와 분리.
// - 신청 완료 후 관리자에게 SMS + 이메일 알림

const ApplySchema = z.object({
  customerName: z.string().min(1).max(50),
  customerPhone: z.string().min(9).max(20),
  spaceType: z.enum(["연습실", "파티룸"]).default("연습실"),
  usageMonth: z.string().min(1).max(10), // 예: "6월"
  dayOfWeek: z.string().max(30).optional().nullable(),
  usageDates: z.array(z.number().int().min(1).max(31)).min(1).max(31),
  startHour: z.number().int().min(0).max(24),
  endHour: z.number().int().min(0).max(24),
  customerMemo: z.string().max(2000).optional().nullable(),
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  logger.log(`${LOG_PREFIX} POST start`);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch (err) {
    logger.error(`${LOG_PREFIX} invalid_json`, err);
    return NextResponse.json({ ok: false, error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const parsed = ApplySchema.safeParse(raw);
  if (!parsed.success) {
    logger.warn(`${LOG_PREFIX} validation_failed`, parsed.error.issues);
    return NextResponse.json(
      { ok: false, error: "입력값을 확인해주세요.", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;

  const hoursPerDay = data.endHour - data.startHour;
  if (hoursPerDay <= 0) {
    return NextResponse.json(
      { ok: false, error: "종료 시간이 시작 시간보다 커야 합니다." },
      { status: 400 }
    );
  }
  const totalHours = hoursPerDay * data.usageDates.length;

  // 1) DB 저장 — 가격 관련 필드는 0으로 두고 관리자가 검토 후 산정
  let created;
  try {
    created = await prisma.long_term_bookings.create({
      data: {
        status: "REQUESTED",
        customer_name: data.customerName.trim(),
        customer_phone: data.customerPhone.replace(/[^0-9]/g, ""),
        day_of_week: data.dayOfWeek?.trim() || null,
        usage_month: data.usageMonth.trim(),
        usage_dates: data.usageDates,
        start_hour: data.startHour,
        end_hour: data.endHour,
        space_type: data.spaceType,
        hours_per_day: hoursPerDay,
        total_hours: totalHours,
        hourly_rate: 0,
        gross_amount: 0,
        discount_rate: 0,
        discount_amount: 0,
        final_amount: 0,
        admin_memo: data.customerMemo?.trim() || null,
      },
    });
    logger.log(`${LOG_PREFIX} db_success id=${created.id}`);
  } catch (err) {
    logger.error(`${LOG_PREFIX} db_failed`, err);
    return NextResponse.json(
      { ok: false, error: "신청 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 }
    );
  }

  // 2) 관리자 알림 — SMS + 이메일 (실패해도 신청 자체는 성공 처리)
  const adminPhone = process.env.ADMIN_NOTIFY_PHONE || STUDIO_PHONE;
  const summaryLines = [
    `[A1STUDIO] 장기대관 신청 접수`,
    `이름: ${created.customer_name}`,
    `연락처: ${created.customer_phone}`,
    `공간: ${created.space_type}`,
    `이용월: ${created.usage_month}` + (created.day_of_week ? ` (${created.day_of_week})` : ""),
    `날짜: ${created.usage_dates.join(", ")}일`,
    `시간: ${String(created.start_hour).padStart(2, "0")}:00 ~ ${String(created.end_hour).padStart(2, "0")}:00 (일 ${created.hours_per_day}h, 총 ${created.total_hours}h)`,
  ];
  if (created.admin_memo) summaryLines.push(`메모: ${created.admin_memo}`);
  summaryLines.push(`관리자 페이지에서 확인해주세요.`);
  const smsText = summaryLines.join("\n");

  // 2-1) SMS
  let smsResult: { success: boolean; error?: string } = { success: false };
  try {
    logger.log(`${LOG_PREFIX} notify_sms start id=${created.id} to=${adminPhone}`);
    smsResult = await sendSMS({
      to: adminPhone,
      text: smsText,
      subject: "[A1STUDIO] 장기대관 신청 접수",
    });
    if (smsResult.success) {
      logger.log(`${LOG_PREFIX} notify_sms success id=${created.id}`);
    } else {
      logger.error(`${LOG_PREFIX} notify_sms failed id=${created.id} error=${smsResult.error}`);
    }
  } catch (err) {
    logger.error(`${LOG_PREFIX} notify_sms exception id=${created.id}`, err);
  }

  // 2-2) 이메일 (SendGrid)
  let emailResult: { success: boolean; error?: string } = { success: false };
  const apiKey = process.env.SENDGRID_API_KEY;
  const toEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;
  if (apiKey && toEmail && fromEmail) {
    try {
      logger.log(`${LOG_PREFIX} notify_email start id=${created.id} to=${toEmail}`);
      sgMail.setApiKey(apiKey);
      await sgMail.send({
        to: toEmail,
        from: fromEmail,
        subject: `[A1 STUDIO] 장기대관 신청 - ${created.customer_name}`,
        text: smsText,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#18181b">
            <h2 style="background:#B98768;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0;margin:0">
              장기대관 신청 접수
            </h2>
            <div style="border:1px solid #e4e4e7;border-top:none;border-radius:0 0 8px 8px;padding:24px">
              <table style="width:100%;border-collapse:collapse;font-size:14px">
                <tr><td style="padding:6px 0;color:#71717a;width:90px">이름</td><td style="font-weight:600">${escapeHtml(created.customer_name)}</td></tr>
                <tr><td style="padding:6px 0;color:#71717a">연락처</td><td style="font-weight:600">${escapeHtml(created.customer_phone)}</td></tr>
                <tr><td style="padding:6px 0;color:#71717a">공간</td><td style="font-weight:600">${escapeHtml(created.space_type)}</td></tr>
                <tr><td style="padding:6px 0;color:#71717a">이용월</td><td style="font-weight:600">${escapeHtml(created.usage_month)}${created.day_of_week ? ` (${escapeHtml(created.day_of_week)})` : ""}</td></tr>
                <tr><td style="padding:6px 0;color:#71717a">날짜</td><td style="font-weight:600">${created.usage_dates.join(", ")}일</td></tr>
                <tr><td style="padding:6px 0;color:#71717a">시간</td><td style="font-weight:600">${String(created.start_hour).padStart(2, "0")}:00 ~ ${String(created.end_hour).padStart(2, "0")}:00 (일 ${created.hours_per_day}h, 총 ${created.total_hours}h)</td></tr>
              </table>
              ${created.admin_memo ? `<hr style="border:none;border-top:1px solid #e4e4e7;margin:16px 0"/><p style="color:#71717a;font-size:13px;margin:0 0 8px">고객 메모</p><p style="white-space:pre-line;font-size:14px;line-height:1.7;margin:0">${escapeHtml(created.admin_memo)}</p>` : ""}
              <p style="margin:24px 0 0;font-size:13px;color:#71717a">관리자 페이지에서 처리해주세요 → /admin/long-term-bookings</p>
            </div>
          </div>
        `,
      });
      emailResult = { success: true };
      logger.log(`${LOG_PREFIX} notify_email success id=${created.id}`);
    } catch (err) {
      emailResult = { success: false, error: err instanceof Error ? err.message : "unknown" };
      logger.error(`${LOG_PREFIX} notify_email failed id=${created.id}`, err);
    }
  } else {
    logger.warn(`${LOG_PREFIX} notify_email skipped (env not configured) id=${created.id}`);
  }

  return NextResponse.json({
    ok: true,
    id: created.id,
    notify: { sms: smsResult.success, email: emailResult.success },
  });
}
