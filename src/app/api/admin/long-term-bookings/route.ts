export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAdminOrLegacy } from "@/lib/admin-auth";
import { sendScheduledLMS, sendSMS, logMessage } from "@/lib/sms";
import {
  buildPaymentNoticeText,
  buildUsageNoticeText,
  buildKstScheduleDate,
  buildTimeGroups,
  parseUsageMonth,
  computeLongTermBreakdown,
} from "@/lib/long-term-template";

const LOG_PREFIX = "[admin:long-term-bookings]";

const CreateSchema = z.object({
  customerName: z.string().min(1).max(50),
  customerPhone: z.string().min(9).max(20),
  dayOfWeek: z.string().max(30).optional().nullable(),
  usageMonth: z.string().min(1).max(10), // "5월"
  usageDates: z.array(z.number().int().min(1).max(31)).min(1).max(31),
  startHour: z.number().int().min(0).max(24),
  endHour: z.number().int().min(0).max(24),
  spaceType: z.string().min(1).max(20).default("연습실"),
  hourlyRate: z.number().int().min(0),
  discountRate: z.number().min(0).max(1).default(0.1),
  usageNoticeSendHour: z.number().int().min(0).max(23).default(10),
  adminMemo: z.string().max(2000).optional().nullable(),
  sendPaymentNoticeNow: z.boolean().default(true),
  scheduleUsageNotice: z.boolean().default(true),
  // 발송 예약 기준 연도 (이용월이 다음 해라면 지정)
  scheduleYear: z.number().int().min(2024).max(2100).optional(),
  // 날짜별 예외 시간 (선택). 해당 날짜는 기본 startHour/endHour 대신 이 값으로 계산/안내.
  timeOverrides: z
    .array(
      z.object({
        day: z.number().int().min(1).max(31),
        startHour: z.number().int().min(0).max(24),
        endHour: z.number().int().min(0).max(24),
      })
    )
    .optional()
    .default([]),
});

/**
 * GET — 장기대관 목록 조회
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdminOrLegacy(req);
  if ("error" in auth) return auth.error;

  const status = req.nextUrl.searchParams.get("status");
  const where = status ? { status } : {};

  try {
    const items = await prisma.long_term_bookings.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: 500,
    });
    logger.info(`${LOG_PREFIX} list success count=${items.length} status=${status ?? "ALL"}`);
    return NextResponse.json({ items });
  } catch (err) {
    logger.error(`${LOG_PREFIX} list db_failed`, err);
    return NextResponse.json({ error: "조회 중 오류가 발생했습니다" }, { status: 500 });
  }
}

/**
 * POST — 신규 장기대관 등록 + (선택) 요금안내문 즉시 발송 + 이용일별 이용안내문 예약 발송
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdminOrLegacy(req);
  if ("error" in auth) return auth.error;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch (err) {
    logger.error(`${LOG_PREFIX} create invalid_json`, err);
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(raw);
  if (!parsed.success) {
    logger.error(`${LOG_PREFIX} create validation_failed issues=${JSON.stringify(parsed.error.issues)}`);
    return NextResponse.json(
      { error: "입력값을 확인해주세요", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const hoursPerDay = data.endHour - data.startHour; // 기본(대표) 하루 시간
  if (hoursPerDay <= 0) {
    return NextResponse.json({ error: "종료 시간이 시작 시간보다 커야 합니다" }, { status: 400 });
  }

  const overrides = data.timeOverrides ?? [];
  // 예외 시간 날짜도 이용일에 포함되도록 합집합 처리
  const usageDates = Array.from(new Set([...data.usageDates, ...overrides.map((o) => o.day)])).sort(
    (a, b) => a - b
  );
  // 예외 시간 유효성: 각 override는 종료 > 시작
  const badOverride = overrides.find((o) => o.endHour <= o.startHour);
  if (badOverride) {
    return NextResponse.json(
      { error: `예외 시간이 올바르지 않습니다 (${badOverride.day}일: ${badOverride.startHour}-${badOverride.endHour})` },
      { status: 400 }
    );
  }

  const totalDays = usageDates.length;
  // 예외 시간 반영한 실제 총 이용시간
  const totalHours = usageDates.reduce((sum, day) => {
    const ov = overrides.find((o) => o.day === day);
    return sum + ((ov ? ov.endHour : data.endHour) - (ov ? ov.startHour : data.startHour));
  }, 0);
  const { label: timeGroupsLabel } = buildTimeGroups(usageDates, data.startHour, data.endHour, overrides);
  // 예외 시간이 하나라도 있으면 시간그룹 표기로 전환 (기본 시간 표기와 불일치 방지)
  const mixedTimes = overrides.length > 0;

  // 연습실은 시간대(피크/비피크) 정확 합산. grossAmount는 단가×시간이 아닌 정확한 시간대별 합으로 계산.
  let grossAmount: number;
  let breakdown: ReturnType<typeof computeLongTermBreakdown>["breakdown"] = [];
  if (data.spaceType === "연습실") {
    try {
      const monthNum = parseUsageMonth(data.usageMonth);
      const now = new Date();
      const fallbackYear = monthNum < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
      const year = data.scheduleYear ?? fallbackYear;
      const calc = computeLongTermBreakdown(year, monthNum, usageDates, data.startHour, data.endHour, overrides);
      grossAmount = calc.totalEvent;
      breakdown = calc.breakdown;
    } catch (err) {
      logger.warn(`${LOG_PREFIX} breakdown_calc_failed, fallback to rate*hours`, err);
      grossAmount = totalHours * data.hourlyRate;
    }
  } else {
    grossAmount = totalHours * data.hourlyRate;
  }
  const discountAmount = Math.round(grossAmount * data.discountRate);
  const finalAmount = grossAmount - discountAmount;

  // 예외 시간은 별도 컬럼 없이 메모에 기록을 남겨 추후 추적 가능하게 함
  const memoWithOverrides = mixedTimes
    ? [data.adminMemo?.trim() || null, `[예외 시간]\n${timeGroupsLabel}`].filter(Boolean).join("\n\n")
    : data.adminMemo ?? null;

  logger.info(
    `${LOG_PREFIX} create start name=${data.customerName} phone=${data.customerPhone} ` +
      `days=${totalDays} hoursPerDay=${hoursPerDay} totalHours=${totalHours} ` +
      `mixedTimes=${mixedTimes} overrides=${overrides.length} ` +
      `gross=${grossAmount} discount=${discountAmount} final=${finalAmount}`
  );

  // 1) DB 저장
  let created;
  try {
    created = await prisma.long_term_bookings.create({
      data: {
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        day_of_week: data.dayOfWeek ?? null,
        usage_month: data.usageMonth,
        usage_dates: usageDates,
        start_hour: data.startHour,
        end_hour: data.endHour,
        space_type: data.spaceType,
        hours_per_day: hoursPerDay,
        total_hours: totalHours,
        hourly_rate: data.hourlyRate,
        gross_amount: grossAmount,
        discount_rate: data.discountRate,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        usage_notice_send_hour: data.usageNoticeSendHour,
        admin_memo: memoWithOverrides,
        status: "DRAFT",
      },
    });
    logger.info(`${LOG_PREFIX} create db_success id=${created.id}`);
  } catch (err) {
    logger.error(`${LOG_PREFIX} create db_failed`, err);
    return NextResponse.json({ error: "등록 중 오류가 발생했습니다" }, { status: 500 });
  }

  const templateData = {
    customerName: created.customer_name,
    customerPhone: created.customer_phone,
    dayOfWeek: created.day_of_week,
    usageMonth: created.usage_month,
    usageDates: created.usage_dates,
    startHour: created.start_hour,
    endHour: created.end_hour,
    spaceType: created.space_type,
    hoursPerDay: created.hours_per_day,
    totalHours: created.total_hours,
    hourlyRate: created.hourly_rate,
    grossAmount: created.gross_amount,
    discountRate: created.discount_rate,
    discountAmount: created.discount_amount,
    finalAmount: created.final_amount,
    priceBreakdown: breakdown,
    mixedTimes,
    timeGroupsLabel,
  };

  // 2) 요금 안내문 즉시 발송 (옵션)
  let paymentResult: { success: boolean; messageId?: string; error?: string } = { success: false };
  if (data.sendPaymentNoticeNow) {
    const paymentText = buildPaymentNoticeText(templateData);
    logger.info(`${LOG_PREFIX} payment_notice start id=${created.id} bytes=${Buffer.byteLength(paymentText, "utf8")}`);
    paymentResult = await sendSMS({
      to: created.customer_phone,
      text: paymentText,
      subject: "[A1STUDIO] 장기대관 요금 안내",
    });

    await logMessage({
      phoneNumber: created.customer_phone,
      messageType: "reservation_confirm",
      content: paymentText,
      status: paymentResult.success ? "success" : "failed",
      errorMessage: paymentResult.error,
      messageId: paymentResult.messageId,
    });

    if (paymentResult.success) {
      logger.info(`${LOG_PREFIX} payment_notice success id=${created.id} messageId=${paymentResult.messageId}`);
      await prisma.long_term_bookings.update({
        where: { id: created.id },
        data: {
          payment_notice_sent_at: new Date(),
          payment_notice_message_id: paymentResult.messageId ?? null,
          status: "PENDING_PAYMENT",
        },
      });
    } else {
      logger.error(`${LOG_PREFIX} payment_notice failed id=${created.id} error=${paymentResult.error}`);
    }
  }

  // 3) 이용안내문 예약 발송 (옵션)
  const usageSchedule: Array<{ day: number; scheduledAt: string; groupId?: string; success: boolean; error?: string }> = [];
  if (data.scheduleUsageNotice) {
    const usageText = buildUsageNoticeText(templateData);
    const usageBytes = Buffer.byteLength(usageText, "utf8");
    const monthNum = parseUsageMonth(created.usage_month);
    const now = new Date();
    // 기본: 현재 연도. 이용월이 현재월보다 이전이면 다음 해로 추정.
    const fallbackYear = monthNum < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
    const year = data.scheduleYear ?? fallbackYear;

    // 예외 시간 날짜는 발송시각도 그 날짜 시작시각 기준으로 보정 (관리자가 설정한 오프셋 유지)
    const sendOffset = data.startHour - data.usageNoticeSendHour;
    const sendHourForDay = (day: number) => {
      const ov = overrides.find((o) => o.day === day);
      if (!ov) return data.usageNoticeSendHour;
      return Math.min(23, Math.max(0, ov.startHour - sendOffset));
    };

    logger.info(
      `${LOG_PREFIX} usage_notice schedule_start id=${created.id} year=${year} month=${monthNum} ` +
        `days=${created.usage_dates.length} bytes=${usageBytes}`
    );

    for (const day of created.usage_dates) {
      const scheduledAt = buildKstScheduleDate(year, monthNum, day, sendHourForDay(day), 0);
      const isPast = scheduledAt.getTime() <= Date.now();
      if (isPast) {
        logger.warn(`${LOG_PREFIX} usage_notice skip_past id=${created.id} day=${day} scheduledAt=${scheduledAt.toISOString()}`);
        usageSchedule.push({
          day,
          scheduledAt: scheduledAt.toISOString(),
          success: false,
          error: "이미 지난 시각",
        });
        continue;
      }

      const result = await sendScheduledLMS({
        to: created.customer_phone,
        text: usageText,
        scheduledAt,
        subject: "[A1STUDIO] 연습실 이용 안내",
      });

      await logMessage({
        phoneNumber: created.customer_phone,
        messageType: "reminder",
        content: usageText,
        status: result.success ? "success" : "failed",
        errorMessage: result.error,
        messageId: result.messageId,
      });

      usageSchedule.push({
        day,
        scheduledAt: scheduledAt.toISOString(),
        groupId: result.messageId,
        success: result.success,
        error: result.error,
      });

      if (result.success) {
        logger.info(`${LOG_PREFIX} usage_notice scheduled id=${created.id} day=${day} groupId=${result.messageId}`);
      } else {
        logger.error(`${LOG_PREFIX} usage_notice schedule_failed id=${created.id} day=${day} error=${result.error}`);
      }
    }

    const anySuccess = usageSchedule.some((s) => s.success);
    await prisma.long_term_bookings.update({
      where: { id: created.id },
      data: {
        usage_notice_schedule: usageSchedule,
        ...(anySuccess ? { status: "SCHEDULED" } : {}),
      },
    });
    logger.info(`${LOG_PREFIX} usage_notice schedule_done id=${created.id} success=${usageSchedule.filter((s) => s.success).length}/${usageSchedule.length}`);
  }

  const fresh = await prisma.long_term_bookings.findUnique({ where: { id: created.id } });
  return NextResponse.json({
    ok: true,
    item: fresh,
    paymentNotice: paymentResult,
    usageSchedule,
  });
}
