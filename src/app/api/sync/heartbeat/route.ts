import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { requireSyncAgent } from "@/lib/sync-auth";
import { sendSMS } from "@/lib/sms";

/**
 * sync-agent 상태 보고 API
 *
 * POST body:
 *  - ok: boolean         — 이번 폴링 사이클 성공 여부
 *  - error?: string      — 실패 시 에러 요약
 *  - alertAdmin?: boolean — true면 관리자(SYNC_ALERT_PHONE)에게 SMS 알림
 */
export async function POST(request: NextRequest) {
  const denied = requireSyncAgent(request);
  if (denied) return denied;

  let body: { ok?: boolean; error?: string; alertAdmin?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const now = new Date().toISOString();
  const { error: dbError } = await supabase.from("sync_status").upsert({
    id: "sync-agent",
    last_seen_at: now,
    ...(body.ok ? { last_success_at: now, last_error: null } : { last_error: body.error ?? "unknown" }),
    updated_at: now,
  });
  if (dbError) {
    console.error("[sync/heartbeat] sync_status 저장 실패:", dbError.message);
  }

  let alertSent = false;
  if (body.alertAdmin) {
    const adminPhone = process.env.SYNC_ALERT_PHONE;
    if (adminPhone) {
      const result = await sendSMS({
        to: adminPhone,
        text: `[A1 STUDIO 예약동기화 알림]\n${body.error ?? "동기화 프로그램 점검이 필요합니다."}\n(24시간 PC의 sync-agent를 확인해 주세요)`,
      });
      alertSent = result.success;
    } else {
      console.warn("[sync/heartbeat] SYNC_ALERT_PHONE 미설정 — 관리자 알림 생략");
    }
  }

  return NextResponse.json({ ok: true, alertSent });
}
