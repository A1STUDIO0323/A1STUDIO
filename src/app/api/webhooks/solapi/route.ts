/**
 * 솔라피 메시지 상태 webhook 수신
 *
 * 솔라피 콘솔에서 본 URL을 webhook으로 등록.
 * 보안: 환경변수 `SOLAPI_WEBHOOK_TOKEN`을 URL 쿼리 ?token=... 으로 검증.
 *
 * 페이로드(배열): 각 이벤트는 { eventType, groupId, messageId, statusCode, statusMessage, to, type, dateProcessed, dateReceived } 등을 포함.
 * 솔라피 statusCode "2000"이 발송 성공. 그 외는 실패.
 *
 * 처리: long_term_bookings.usage_notice_schedule 의 해당 groupId 항목에
 *   delivered: true/false, deliveredAt, deliveryStatus, deliveryFailReason 기록.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const LOG_PREFIX = "[webhook:solapi]";

type SolapiEvent = {
  eventType?: string;
  groupId?: string;
  messageId?: string;
  statusCode?: string;
  statusMessage?: string;
  to?: string;
  from?: string;
  type?: string;
  dateProcessed?: string;
  dateReceived?: string;
  // 솔라피가 추가 필드를 보낼 수 있음 — 알려진 필드만 사용
  [key: string]: unknown;
};

type ScheduleEntry = {
  day: number;
  scheduledAt: string;
  groupId?: string;
  success: boolean;
  error?: string;
  delivered?: boolean;
  deliveredAt?: string;
  deliveryStatus?: string;
  deliveryFailReason?: string;
};

// 솔라피 statusCode: "2000" = 그룹 접수 성공, "4000" = 단말기 수신 성공
const SUCCESS_CODES = new Set(["2000", "4000"]);
const SUCCESS_MESSAGES = new Set(["수신 완료", "success", "OK", "ok"]);
const DELIVERY_EVENTS = new Set([
  "DELIVERY_COMPLETED",
  "DELIVERY_FAILED",
  "DELIVERED",
  "SENT",
  "MESSAGE_STATUS",
]);

export async function POST(req: NextRequest) {
  const expectedToken = process.env.SOLAPI_WEBHOOK_TOKEN;
  if (!expectedToken) {
    logger.error(`${LOG_PREFIX} config_missing SOLAPI_WEBHOOK_TOKEN`);
    return NextResponse.json({ error: "webhook 미설정" }, { status: 500 });
  }

  const token = req.nextUrl.searchParams.get("token");
  if (token !== expectedToken) {
    logger.warn(`${LOG_PREFIX} unauthorized provided_token_len=${token?.length ?? 0}`);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch (err) {
    logger.error(`${LOG_PREFIX} invalid_json`, err);
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const events: SolapiEvent[] = Array.isArray(payload) ? payload : [payload as SolapiEvent];
  logger.info(`${LOG_PREFIX} received count=${events.length}`);

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const ev of events) {
    processed++;
    const groupId = ev.groupId;
    if (!groupId) {
      logger.warn(`${LOG_PREFIX} skip no_groupId eventType=${ev.eventType}`);
      skipped++;
      continue;
    }

    // 발송 이벤트 외 (예: SCHEDULED, GROUP_STATUS 등)는 카운트만 하고 무시
    if (ev.eventType && !DELIVERY_EVENTS.has(ev.eventType)) {
      logger.info(`${LOG_PREFIX} skip non_delivery_event type=${ev.eventType} groupId=${groupId}`);
      skipped++;
      continue;
    }

    const statusCode = ev.statusCode ?? "";
    const statusMessage = ev.statusMessage ?? "";

    // eventType이 있으면 우선 신뢰 (DELIVERY_COMPLETED는 statusCode와 무관하게 성공)
    let isDelivered: boolean;
    if (ev.eventType === "DELIVERY_COMPLETED" || ev.eventType === "DELIVERED") {
      isDelivered = true;
    } else if (ev.eventType === "DELIVERY_FAILED") {
      isDelivered = false;
    } else {
      isDelivered = SUCCESS_CODES.has(statusCode) || SUCCESS_MESSAGES.has(statusMessage);
    }
    const failReason = isDelivered ? undefined : (statusMessage || statusCode || "발송 실패");

    try {
      // 해당 groupId를 schedule에 포함하는 long_term_bookings 찾기
      // 단순 contains 쿼리: usage_notice_schedule는 JSONB 배열이라 일반 텍스트 검색이 부정확
      // 안전하게 status가 SCHEDULED 또는 PENDING_PAYMENT인 것들을 모두 가져와 메모리에서 매칭
      const candidates = await prisma.long_term_bookings.findMany({
        where: {
          status: { in: ["SCHEDULED", "PENDING_PAYMENT", "DRAFT", "COMPLETED"] },
        },
        select: { id: true, usage_notice_schedule: true },
      });

      let matchedBookingId: string | null = null;
      let matchedSchedule: ScheduleEntry[] | null = null;
      for (const c of candidates) {
        const schedule = (c.usage_notice_schedule as unknown as ScheduleEntry[] | null) ?? [];
        if (schedule.some((s) => s.groupId === groupId)) {
          matchedBookingId = c.id;
          matchedSchedule = schedule;
          break;
        }
      }

      if (!matchedBookingId || !matchedSchedule) {
        logger.info(`${LOG_PREFIX} no_matching_booking groupId=${groupId}`);
        skipped++;
        continue;
      }

      const newSchedule = matchedSchedule.map((s) => {
        if (s.groupId !== groupId) return s;
        return {
          ...s,
          delivered: isDelivered,
          deliveredAt: ev.dateProcessed || ev.dateReceived || new Date().toISOString(),
          deliveryStatus: statusCode || ev.eventType || "UNKNOWN",
          deliveryFailReason: failReason,
        };
      });

      // 모든 schedule 항목이 발송 완료(성공/실패 무관)면 status=COMPLETED로 이동
      const allTerminal = newSchedule.every(
        (s) => s.delivered === true || s.delivered === false && s.deliveryFailReason
      );
      const allDelivered = newSchedule.every((s) => s.delivered === true);

      await prisma.long_term_bookings.update({
        where: { id: matchedBookingId },
        data: {
          usage_notice_schedule: newSchedule,
          ...(allTerminal && allDelivered ? { status: "COMPLETED" } : {}),
        },
      });

      logger.info(
        `${LOG_PREFIX} updated id=${matchedBookingId} groupId=${groupId} delivered=${isDelivered} status=${statusCode} ${failReason ? `reason=${failReason}` : ""}`
      );
      updated++;
    } catch (err) {
      logger.error(`${LOG_PREFIX} db_failed groupId=${groupId}`, err);
      errors++;
    }
  }

  logger.info(`${LOG_PREFIX} done processed=${processed} updated=${updated} skipped=${skipped} errors=${errors}`);

  // 솔라피는 200 OK가 아니면 재시도하므로, 일부 실패해도 200 반환
  return NextResponse.json({ ok: true, processed, updated, skipped, errors });
}

/**
 * 솔라피가 GET으로 검증 요청을 보낼 수도 있으므로 헬스체크
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const expected = process.env.SOLAPI_WEBHOOK_TOKEN;
  if (!expected || token !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
