export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { requireAdminOrLegacy } from "@/lib/admin-auth";
import { sendScheduledLMS, logMessage } from "@/lib/sms";
import {
  buildUsageNoticeText,
  buildKstScheduleDate,
  parseUsageMonth,
} from "@/lib/long-term-template";

const LOG_PREFIX = "[admin:long-term-bookings:schedule-usage-notice]";

type ScheduleEntry = {
  day: number;
  scheduledAt: string;
  groupId?: string;
  success: boolean;
  error?: string;
};

/**
 * POST — 사후에 이용안내문 예약 발송 일괄 추가
 * - 기존 schedule의 success=true 항목은 그대로 유지 (중복 예약 방지)
 * - 미예약/실패 항목 또는 schedule이 비어있는 경우 미래 이용일에 대해 예약 발송 추가
 * - 이미 지난 날짜는 자동 skip
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrLegacy(req);
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id가 필요합니다" }, { status: 400 });

  logger.info(`${LOG_PREFIX} start id=${id}`);

  const booking = await prisma.long_term_bookings.findUnique({ where: { id } });
  if (!booking) {
    return NextResponse.json({ error: "해당 항목을 찾을 수 없습니다" }, { status: 404 });
  }

  if (booking.status === "CANCELLED") {
    return NextResponse.json({ error: "취소된 예약은 발송 추가 불가" }, { status: 400 });
  }

  // 이미 예약 성공한 일자는 중복 예약 방지
  const existingSchedule = (booking.usage_notice_schedule as unknown as ScheduleEntry[] | null) ?? [];
  const alreadyScheduledDays = new Set(
    existingSchedule.filter((s) => s.success && s.groupId).map((s) => s.day)
  );

  // 안내문 텍스트 (현재 DB 정보 기준)
  const templateData = {
    customerName: booking.customer_name,
    customerPhone: booking.customer_phone,
    dayOfWeek: booking.day_of_week,
    usageMonth: booking.usage_month,
    usageDates: booking.usage_dates,
    startHour: booking.start_hour,
    endHour: booking.end_hour,
    spaceType: booking.space_type,
    hoursPerDay: booking.hours_per_day,
    totalHours: booking.total_hours,
    hourlyRate: booking.hourly_rate,
    grossAmount: booking.gross_amount,
    discountRate: booking.discount_rate,
    discountAmount: booking.discount_amount,
    finalAmount: booking.final_amount,
  };
  const usageText = buildUsageNoticeText(templateData);
  const usageBytes = Buffer.byteLength(usageText, "utf8");

  // 연도/월 계산
  let monthNum: number;
  try {
    monthNum = parseUsageMonth(booking.usage_month);
  } catch (err) {
    logger.error(`${LOG_PREFIX} parse_month_failed id=${id} usage_month=${booking.usage_month}`, err);
    return NextResponse.json({ error: "이용월 형식이 올바르지 않습니다" }, { status: 400 });
  }
  const now = new Date();
  const fallbackYear = monthNum < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
  const year = fallbackYear;

  logger.info(
    `${LOG_PREFIX} processing id=${id} year=${year} month=${monthNum} ` +
      `totalDays=${booking.usage_dates.length} alreadyScheduled=${alreadyScheduledDays.size} bytes=${usageBytes}`
  );

  const newResults: ScheduleEntry[] = [];
  for (const day of booking.usage_dates) {
    if (alreadyScheduledDays.has(day)) {
      // 이미 성공 예약된 일자는 기존 항목 유지
      const existing = existingSchedule.find((s) => s.day === day && s.success);
      if (existing) newResults.push(existing);
      continue;
    }

    const scheduledAt = buildKstScheduleDate(year, monthNum, day, booking.usage_notice_send_hour, 0);

    if (scheduledAt.getTime() <= Date.now()) {
      logger.warn(`${LOG_PREFIX} skip_past id=${id} day=${day} scheduledAt=${scheduledAt.toISOString()}`);
      newResults.push({
        day,
        scheduledAt: scheduledAt.toISOString(),
        success: false,
        error: "이미 지난 시각 (skip)",
      });
      continue;
    }

    const result = await sendScheduledLMS({
      to: booking.customer_phone,
      text: usageText,
      scheduledAt,
      subject: "[A1STUDIO] 연습실 이용 안내",
    });

    await logMessage({
      phoneNumber: booking.customer_phone,
      messageType: "reminder",
      content: usageText,
      status: result.success ? "success" : "failed",
      errorMessage: result.error,
      messageId: result.messageId,
    });

    newResults.push({
      day,
      scheduledAt: scheduledAt.toISOString(),
      groupId: result.messageId,
      success: result.success,
      error: result.error,
    });

    if (result.success) {
      logger.info(`${LOG_PREFIX} scheduled id=${id} day=${day} groupId=${result.messageId}`);
    } else {
      logger.error(`${LOG_PREFIX} failed id=${id} day=${day} error=${result.error}`);
    }
  }

  // 일자 순 정렬
  newResults.sort((a, b) => a.day - b.day);

  const anySuccess = newResults.some((s) => s.success);
  const newlyScheduled = newResults.filter(
    (s) => s.success && !alreadyScheduledDays.has(s.day)
  ).length;
  const skippedPast = newResults.filter((s) => !s.success && s.error?.includes("지난")).length;
  const failed = newResults.filter((s) => !s.success && !s.error?.includes("지난")).length;

  await prisma.long_term_bookings.update({
    where: { id },
    data: {
      usage_notice_schedule: newResults,
      ...(anySuccess && booking.status === "PENDING_PAYMENT" ? { status: "SCHEDULED" } : {}),
      ...(anySuccess && booking.status === "DRAFT" ? { status: "SCHEDULED" } : {}),
    },
  });

  logger.info(
    `${LOG_PREFIX} done id=${id} newlyScheduled=${newlyScheduled} skippedPast=${skippedPast} failed=${failed}`
  );

  return NextResponse.json({
    ok: true,
    newlyScheduled,
    skippedPast,
    failed,
    alreadyScheduled: alreadyScheduledDays.size,
    schedule: newResults,
  });
}
