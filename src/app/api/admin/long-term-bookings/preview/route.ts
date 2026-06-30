export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrLegacy } from "@/lib/admin-auth";
import { logger } from "@/lib/logger";
import {
  buildPaymentNoticeText,
  buildUsageNoticeText,
  buildKstScheduleDate,
  buildTimeGroups,
  parseUsageMonth,
  computeLongTermBreakdown,
} from "@/lib/long-term-template";

const LOG_PREFIX = "[admin:long-term-bookings:preview]";

const PreviewSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  dayOfWeek: z.string().optional().nullable(),
  usageMonth: z.string().min(1),
  usageDates: z.array(z.number().int()).min(1),
  startHour: z.number().int(),
  endHour: z.number().int(),
  spaceType: z.string().default("연습실"),
  hourlyRate: z.number().int().min(0),
  discountRate: z.number().default(0.1),
  usageNoticeSendHour: z.number().int().default(10),
  scheduleYear: z.number().int().optional(),
  // 날짜별 예외 시간 (선택). 해당 날짜는 기본 startHour/endHour 대신 이 값으로 계산.
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

export async function POST(req: NextRequest) {
  const auth = await requireAdminOrLegacy(req);
  if ("error" in auth) return auth.error;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  const parsed = PreviewSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해주세요", issues: parsed.error.issues }, { status: 400 });
  }

  const d = parsed.data;
  const overrides = d.timeOverrides ?? [];
  // 예외 시간 날짜도 이용일에 포함되도록 합집합 처리
  const usageDates = Array.from(new Set([...d.usageDates, ...overrides.map((o) => o.day)])).sort(
    (a, b) => a - b
  );
  const hoursPerDay = d.endHour - d.startHour; // 기본(대표) 하루 시간
  const totalDays = usageDates.length;
  // 예외 시간 반영한 실제 총 이용시간
  const realTotalHours = usageDates.reduce((sum, day) => {
    const ov = overrides.find((o) => o.day === day);
    return sum + ((ov ? ov.endHour : d.endHour) - (ov ? ov.startHour : d.startHour));
  }, 0);
  const { label: timeGroupsLabel } = buildTimeGroups(usageDates, d.startHour, d.endHour, overrides);
  // 예외 시간이 하나라도 있으면 시간그룹 표기로 전환 (기본 시간 표기와 불일치 방지)
  const mixedTimes = overrides.length > 0;

  let grossAmount: number;
  let breakdown: ReturnType<typeof computeLongTermBreakdown>["breakdown"] = [];
  if (d.spaceType === "연습실") {
    try {
      const monthNum = parseUsageMonth(d.usageMonth);
      const now = new Date();
      const fallbackYear = monthNum < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
      const year = d.scheduleYear ?? fallbackYear;
      const calc = computeLongTermBreakdown(year, monthNum, usageDates, d.startHour, d.endHour, overrides);
      grossAmount = calc.totalEvent;
      breakdown = calc.breakdown;
    } catch {
      grossAmount = realTotalHours * d.hourlyRate;
    }
  } else {
    grossAmount = realTotalHours * d.hourlyRate;
  }
  const discountAmount = Math.round(grossAmount * d.discountRate);
  const finalAmount = grossAmount - discountAmount;

  const template = {
    customerName: d.customerName,
    customerPhone: d.customerPhone,
    dayOfWeek: d.dayOfWeek ?? null,
    usageMonth: d.usageMonth,
    usageDates,
    startHour: d.startHour,
    endHour: d.endHour,
    spaceType: d.spaceType,
    hoursPerDay,
    totalHours: realTotalHours,
    hourlyRate: d.hourlyRate,
    grossAmount,
    discountRate: d.discountRate,
    discountAmount,
    finalAmount,
    priceBreakdown: breakdown,
    mixedTimes,
    timeGroupsLabel,
  };

  const paymentText = buildPaymentNoticeText(template);
  const usageText = buildUsageNoticeText(template);

  // 예외 시간 날짜는 발송시각도 그 날짜 시작시각 기준으로 보정 (오프셋 유지)
  const sendOffset = d.startHour - d.usageNoticeSendHour;
  const sendHourForDay = (day: number) => {
    const ov = overrides.find((o) => o.day === day);
    if (!ov) return d.usageNoticeSendHour;
    return Math.min(23, Math.max(0, ov.startHour - sendOffset));
  };

  let scheduleList: Array<{ day: number; scheduledAt: string; isPast: boolean }> = [];
  try {
    const monthNum = parseUsageMonth(d.usageMonth);
    const now = new Date();
    const fallbackYear = monthNum < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
    const year = d.scheduleYear ?? fallbackYear;

    scheduleList = usageDates.map((day) => {
      const at = buildKstScheduleDate(year, monthNum, day, sendHourForDay(day), 0);
      return { day, scheduledAt: at.toISOString(), isPast: at.getTime() <= Date.now() };
    });
  } catch (err) {
    logger.warn(`${LOG_PREFIX} schedule_calc_failed`, err);
  }

  return NextResponse.json({
    calc: {
      hoursPerDay,
      totalDays,
      totalHours: realTotalHours,
      grossAmount,
      discountAmount,
      finalAmount,
    },
    paymentText,
    paymentBytes: Buffer.byteLength(paymentText, "utf8"),
    usageText,
    usageBytes: Buffer.byteLength(usageText, "utf8"),
    scheduleList,
  });
}
