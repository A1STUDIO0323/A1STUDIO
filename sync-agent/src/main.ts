import type { BrowserContext } from "playwright";
import { config } from "./config.js";
import { launchContext } from "./browser.js";
import { loadState, saveState } from "./state.js";
import {
  ackInternal,
  fetchPendingInternal,
  heartbeat,
  markPeerBlocked,
  pushExternalReservations,
} from "./homepage.js";
import { spacecloud } from "./platforms/spacecloud.js";
import { naver } from "./platforms/naver.js";
import type { PlatformAdapter, ScrapedReservation } from "./platforms/types.js";

/**
 * A1 STUDIO 예약 동기화 메인 루프 (24시간 PC 상주)
 *
 * 매 사이클:
 *  1. 스페이스클라우드·네이버에서 예약 스크랩 → 홈페이지에 업서트(신규 건은 홈페이지가 이용안내 SMS 발송)
 *  2. 신규 확정 예약 → 상대 플랫폼 같은 시간대 차단 / 취소 → 차단 해제
 *  3. 홈페이지 자체 예약 → 두 플랫폼 모두 차단
 *  4. 하트비트 보고. 연속 실패 시 관리자에게 SMS 알림(1시간 스로틀)
 */

const ADAPTERS: PlatformAdapter[] = [spacecloud, naver];

const peerOf = (p: PlatformAdapter): PlatformAdapter =>
  p.platform === "spacecloud" ? naver : spacecloud;

const keyOf = (r: { platform: string; externalId: string }) =>
  `${r.platform}:${r.externalId}`;

let consecutiveFailures = 0;
let lastAlertAt = 0;

async function syncPlatform(
  ctx: BrowserContext,
  adapter: PlatformAdapter,
  state: ReturnType<typeof loadState>
): Promise<string[]> {
  const problems: string[] = [];

  if (!(await adapter.isLoggedIn(ctx))) {
    problems.push(`${adapter.platform} 로그인 세션 만료 — PC에서 npm run login 으로 재로그인 필요`);
    return problems;
  }

  const scraped = await adapter.fetchReservations(ctx, config.lookaheadDays);
  console.log(`[${adapter.platform}] 예약 ${scraped.length}건 스크랩`);

  // 이전 사이클과 상태가 달라진 건만 홈페이지로 전송
  const changed = scraped.filter((r) => state.seen[keyOf(r)] !== r.status);
  if (changed.length > 0) {
    const results = await pushExternalReservations(changed);
    for (const res of results) {
      if (!res.ok) {
        problems.push(`홈페이지 업서트 실패 ${keyOf(res)}: ${res.error}`);
        continue;
      }
      state.seen[keyOf(res)] = changed.find((c) => keyOf(c) === keyOf(res))!.status;
      if (res.smsSent) console.log(`[${adapter.platform}] 이용안내 SMS 발송 완료: ${res.externalId}`);
    }
  }

  // 상대 플랫폼 차단/해제
  const peer = peerOf(adapter);
  for (const r of scraped) {
    const k = keyOf(r);
    try {
      if (r.status === "confirmed" && !state.peerBlocked[k]) {
        await peer.blockSlot(ctx, r);
        state.peerBlocked[k] = true;
        await markPeerBlocked(r.platform, r.externalId);
        console.log(`[${peer.platform}] 차단 완료 ← ${k} (${r.date} ${r.startTime}~${r.endTime})`);
      } else if (r.status === "cancelled" && state.peerBlocked[k]) {
        await peer.unblockSlot(ctx, r);
        state.peerBlocked[k] = false;
        console.log(`[${peer.platform}] 차단 해제 ← ${k}`);
      }
    } catch (e) {
      problems.push(e instanceof Error ? e.message : String(e));
    }
  }

  return problems;
}

async function syncInternalToPlatforms(
  ctx: BrowserContext,
  state: ReturnType<typeof loadState>
): Promise<string[]> {
  const problems: string[] = [];
  const pending = await fetchPendingInternal();
  if (pending.length > 0) console.log(`[homepage] 외부 차단 대기 예약 ${pending.length}건`);

  for (const r of pending) {
    if (state.internalBlocked[r.id]) {
      await ackInternal([{ source: r.source, id: r.id }]);
      continue;
    }
    try {
      for (const adapter of ADAPTERS) {
        await adapter.blockSlot(ctx, r);
      }
      state.internalBlocked[r.id] = true;
      await ackInternal([{ source: r.source, id: r.id }]);
      console.log(`[homepage→플랫폼] 양측 차단 완료: ${r.date} ${r.startTime}~${r.endTime}`);
    } catch (e) {
      problems.push(e instanceof Error ? e.message : String(e));
    }
  }
  return problems;
}

async function runCycle(ctx: BrowserContext): Promise<void> {
  const state = loadState();
  const problems: string[] = [];

  for (const adapter of ADAPTERS) {
    try {
      problems.push(...(await syncPlatform(ctx, adapter, state)));
    } catch (e) {
      problems.push(`[${adapter.platform}] ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  try {
    problems.push(...(await syncInternalToPlatforms(ctx, state)));
  } catch (e) {
    problems.push(`[internal] ${e instanceof Error ? e.message : String(e)}`);
  }

  saveState(state);

  const ok = problems.length === 0;
  consecutiveFailures = ok ? 0 : consecutiveFailures + 1;
  // 3사이클 연속 실패 시 관리자 SMS (1시간에 1번만)
  const alertAdmin =
    consecutiveFailures >= 3 && Date.now() - lastAlertAt > 3600_000;
  if (alertAdmin) lastAlertAt = Date.now();

  try {
    await heartbeat({ ok, error: problems.join(" / ").slice(0, 500) || undefined, alertAdmin });
  } catch (e) {
    console.error("[heartbeat] 실패:", e);
  }

  if (!ok) console.warn(`문제 ${problems.length}건:\n- ${problems.join("\n- ")}`);
}

async function main() {
  const once = process.argv.includes("--once");
  const ctx = await launchContext();
  console.log(`sync-agent 시작 — ${config.pollIntervalMin}분 간격 폴링 (${config.homepageUrl})`);

  for (;;) {
    const started = Date.now();
    try {
      await runCycle(ctx);
    } catch (e) {
      console.error("[cycle] 예기치 못한 오류:", e);
    }
    if (once) break;
    const elapsed = Date.now() - started;
    const waitMs = Math.max(30_000, config.pollIntervalMin * 60_000 - elapsed);
    await new Promise((r) => setTimeout(r, waitMs));
  }

  await ctx.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
