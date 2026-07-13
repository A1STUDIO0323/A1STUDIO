import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { requireSyncAgent } from "@/lib/sync-auth";
import { sendMessage, logMessage } from "@/lib/sms";
import { getExternalReservationGuideMessage } from "@/lib/message-templates";

/**
 * 외부 플랫폼(스페이스클라우드·네이버 스마트플레이스) 예약 동기화 API
 * sync-agent(24시간 PC)가 호출한다. 인증: x-sync-api-key 헤더.
 *
 * POST  — 스크랩한 예약 배열 upsert. 신규 확정 예약이면 이용안내 SMS 발송(멱등).
 * PATCH — 상대 플랫폼 차단 완료 표시 (blocked_on_peer_at).
 */

const PLATFORMS = ["spacecloud", "naver"] as const;
const ACTIVE_STATUSES = ["confirmed", "cancelled"] as const;

interface IncomingReservation {
  platform: string;
  externalId: string;
  roomType: string; // 'practice' | 'party'
  date: string; // YYYY-MM-DD
  endDate?: string | null;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  guestName: string;
  guestPhone: string;
  amount?: number;
  status?: string; // confirmed(기본) | cancelled
  memo?: string;
}

function isValid(r: IncomingReservation): string | null {
  if (!PLATFORMS.includes(r.platform as (typeof PLATFORMS)[number]))
    return `지원하지 않는 platform: ${r.platform}`;
  if (!r.externalId) return "externalId 누락";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date ?? "")) return `date 형식 오류: ${r.date}`;
  if (!/^\d{2}:\d{2}$/.test(r.startTime ?? "")) return `startTime 형식 오류: ${r.startTime}`;
  if (!/^\d{2}:\d{2}$/.test(r.endTime ?? "")) return `endTime 형식 오류: ${r.endTime}`;
  if (!r.guestName) return "guestName 누락";
  if (r.status && !ACTIVE_STATUSES.includes(r.status as (typeof ACTIVE_STATUSES)[number]))
    return `지원하지 않는 status: ${r.status}`;
  return null;
}

export async function POST(request: NextRequest) {
  const denied = requireSyncAgent(request);
  if (denied) return denied;

  let body: { reservations?: IncomingReservation[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON" }, { status: 400 });
  }
  const items = body.reservations;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "reservations 배열이 필요합니다" }, { status: 400 });
  }
  if (items.length > 100) {
    return NextResponse.json({ error: "한 번에 최대 100건까지 처리합니다" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const results: Array<{
    platform: string;
    externalId: string;
    ok: boolean;
    isNew?: boolean;
    smsSent?: boolean;
    needsPeerBlock?: boolean;
    error?: string;
  }> = [];

  for (const item of items) {
    const invalid = isValid(item);
    if (invalid) {
      results.push({
        platform: item.platform ?? "?",
        externalId: item.externalId ?? "?",
        ok: false,
        error: invalid,
      });
      continue;
    }

    const status = item.status ?? "confirmed";
    try {
      const { data: existing, error: selError } = await supabase
        .from("external_reservations")
        .select("id, status, sms_sent_at, blocked_on_peer_at")
        .eq("platform", item.platform)
        .eq("external_id", item.externalId)
        .maybeSingle();
      if (selError) throw new Error(selError.message);

      let rowId: string;
      let isNew = false;
      if (existing) {
        rowId = existing.id;
        const { error: updError } = await supabase
          .from("external_reservations")
          .update({
            room_type: item.roomType,
            date: item.date,
            end_date: item.endDate ?? null,
            start_time: item.startTime,
            end_time: item.endTime,
            guest_name: item.guestName,
            guest_phone: item.guestPhone,
            amount: item.amount ?? 0,
            status,
            memo: item.memo ?? null,
            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", rowId);
        if (updError) throw new Error(updError.message);
      } else {
        const { data: inserted, error: insError } = await supabase
          .from("external_reservations")
          .insert({
            platform: item.platform,
            external_id: item.externalId,
            room_type: item.roomType,
            date: item.date,
            end_date: item.endDate ?? null,
            start_time: item.startTime,
            end_time: item.endTime,
            guest_name: item.guestName,
            guest_phone: item.guestPhone,
            amount: item.amount ?? 0,
            status,
            memo: item.memo ?? null,
          })
          .select("id")
          .single();
        if (insError) throw new Error(insError.message);
        rowId = inserted.id;
        isNew = true;
      }

      // 이용안내 SMS — 확정 상태 + 전화번호 존재 + 아직 발송 전인 경우만 (멱등)
      let smsSent = false;
      const phoneDigits = (item.guestPhone ?? "").replace(/[^0-9]/g, "");
      const alreadySent = existing?.sms_sent_at != null;
      if (status === "confirmed" && !alreadySent && phoneDigits.length >= 10) {
        const text = getExternalReservationGuideMessage({
          guestName: item.guestName,
          guestPhone: item.guestPhone,
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          roomType: item.roomType === "party" ? "party" : "practice",
        });
        const sendResult = await sendMessage({ to: phoneDigits, text });
        await logMessage({
          phoneNumber: phoneDigits,
          messageType: "reservation_confirm",
          content: text,
          status: sendResult.success ? "success" : "failed",
          errorMessage: sendResult.error,
          messageId: sendResult.messageId,
        });
        if (sendResult.success) {
          smsSent = true;
          await supabase
            .from("external_reservations")
            .update({ sms_sent_at: new Date().toISOString() })
            .eq("id", rowId);
        }
      }

      results.push({
        platform: item.platform,
        externalId: item.externalId,
        ok: true,
        isNew,
        smsSent,
        needsPeerBlock:
          status === "confirmed" && existing?.blocked_on_peer_at == null,
      });
    } catch (error) {
      console.error("[sync/external-reservations] 처리 실패:", item.platform, item.externalId, error);
      results.push({
        platform: item.platform,
        externalId: item.externalId,
        ok: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류",
      });
    }
  }

  return NextResponse.json({ results });
}

export async function PATCH(request: NextRequest) {
  const denied = requireSyncAgent(request);
  if (denied) return denied;

  let body: { platform?: string; externalId?: string; blockedOnPeer?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON" }, { status: 400 });
  }
  if (!body.platform || !body.externalId) {
    return NextResponse.json({ error: "platform, externalId가 필요합니다" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("external_reservations")
    .update({
      blocked_on_peer_at: body.blockedOnPeer === false ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("platform", body.platform)
    .eq("external_id", body.externalId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
