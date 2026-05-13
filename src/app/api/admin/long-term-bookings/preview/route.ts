export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrLegacy } from "@/lib/admin-auth";
import { logger } from "@/lib/logger";
import {
  buildPaymentNoticeText,
  buildUsageNoticeText,
  buildKstScheduleDate,
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
  const hoursPerDay = d.endHour - d.startHour;
  const totalDays = d.usageDates.length;
  const totalHours = hoursPerDay * totalDays;

  let grossAmount: number;
  let breakdown: ReturnType<typeof computeLongTermBreakdown>["breakdown"] = [];
  if (d.spaceType === "연습실") {
    try {
      const monthNum = parseUsageMonth(d.usageMonth);
      const now = new Date();
      const fallbackYear = monthNum < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
      const year = d.scheduleYear ?? fallbackYear;
      const calc = computeLongTermBreakdown(year, monthNum, d.usageDates, d.startHour, d.endHour);
      grossAmount = calc.totalEvent;
      breakdown = calc.breakdown;
    } catch {
      grossAmount = totalHours * d.hourlyRate;
    }
  } else {
    grossAmount = totalHours * d.hourlyRate;
  }
  const discountAmount = Math.round(grossAmount * d.discountRate);
  const finalAmount = grossAmount - discountAmount;

  const template = {
    customerName: d.customerName,
    customerPhone: d.customerPhone,
    dayOfWeek: d.dayOfWeek ?? null,
    usageMonth: d.usageMonth,
    usageDates: d.usageDates,
    startHour: d.startHour,
    endHour: d.endHour,
    spaceType: d.spaceType,
    hoursPerDay,
    totalHours,
    hourlyRate: d.hourlyRate,
    grossAmount,
    discountRate: d.discountRate,
    discountAmount,
    finalAmount,
    priceBreakdown: breakdown,
  };

  const paymentText = buildPaymentNoticeText(template);
  const usageText = buildUsageNoticeText(template);

  let scheduleList: Array<{ day: number; scheduledAt: string; isPast: boolean }> = [];
  try {
    const monthNum = parseUsageMonth(d.usageMonth);
    const now = new Date();
    const fallbackYear = monthNum < now.getMonth() + 1 ? now.getFullYear() + 1 : now.getFullYear();
    const year = d.scheduleYear ?? fallbackYear;

    scheduleList = d.usageDates.map((day) => {
      const at = buildKstScheduleDate(year, monthNum, day, d.usageNoticeSendHour, 0);
      return { day, scheduledAt: at.toISOString(), isPast: at.getTime() <= Date.now() };
    });
  } catch (err) {
    logger.warn(`${LOG_PREFIX} schedule_calc_failed`, err);
  }

  return NextResponse.json({
    calc: {
      hoursPerDay,
      totalDays,
      totalHours,
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
