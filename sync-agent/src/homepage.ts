import { config } from "./config.js";
import type { ScrapedReservation } from "./platforms/types.js";

/** 홈페이지 /api/sync/* 호출 래퍼 */

async function api<T>(
  path: string,
  init: { method: string; body?: unknown }
): Promise<T> {
  const res = await fetch(`${config.homepageUrl}${path}`, {
    method: init.method,
    headers: {
      "Content-Type": "application/json",
      "x-sync-api-key": config.apiKey,
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${init.method} ${path} 실패 (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

export interface PushResult {
  platform: string;
  externalId: string;
  ok: boolean;
  isNew?: boolean;
  smsSent?: boolean;
  needsPeerBlock?: boolean;
  error?: string;
}

/** 스크랩한 외부 예약을 홈페이지에 업서트 (신규 건은 홈페이지가 SMS 발송) */
export async function pushExternalReservations(
  reservations: ScrapedReservation[]
): Promise<PushResult[]> {
  if (reservations.length === 0) return [];
  const { results } = await api<{ results: PushResult[] }>(
    "/api/sync/external-reservations",
    { method: "POST", body: { reservations } }
  );
  return results;
}

/** 상대 플랫폼 차단 완료 표시 */
export async function markPeerBlocked(platform: string, externalId: string): Promise<void> {
  await api("/api/sync/external-reservations", {
    method: "PATCH",
    body: { platform, externalId, blockedOnPeer: true },
  });
}

export interface PendingInternal {
  source: "reservations" | "party_reservations";
  id: string;
  roomType: "practice" | "party";
  date: string;
  endDate: string | null;
  startTime: string;
  endTime: string;
}

/** 아직 외부 플랫폼에 차단 반영하지 않은 홈페이지 자체 예약 */
export async function fetchPendingInternal(): Promise<PendingInternal[]> {
  const { pending } = await api<{ pending: PendingInternal[] }>(
    "/api/sync/internal-reservations",
    { method: "GET" }
  );
  return pending;
}

/** 홈페이지 자체 예약의 외부 차단 반영 완료 확인 */
export async function ackInternal(
  items: Array<{ source: string; id: string }>
): Promise<void> {
  if (items.length === 0) return;
  await api("/api/sync/internal-reservations", { method: "POST", body: { items } });
}

/** 하트비트 + (선택) 관리자 SMS 알림 */
export async function heartbeat(params: {
  ok: boolean;
  error?: string;
  alertAdmin?: boolean;
}): Promise<void> {
  await api("/api/sync/heartbeat", { method: "POST", body: params });
}
