import fs from "node:fs";
import { config } from "./config.js";

/**
 * 로컬 상태 파일 — 이미 처리한 예약/차단을 기억해 중복 작업 방지.
 * 홈페이지 DB가 원본(source of truth)이고 이 파일은 네트워크 절약용 캐시다.
 * 파일을 지워도 홈페이지 쪽 멱등 처리(sms_sent_at 등) 덕분에 중복 SMS는 발생하지 않는다.
 */
interface State {
  /** platform:externalId → 마지막으로 본 status */
  seen: Record<string, string>;
  /** platform:externalId → 상대 플랫폼 차단 완료 여부 */
  peerBlocked: Record<string, boolean>;
  /** 홈페이지 예약 id → 외부 차단 완료 여부 */
  internalBlocked: Record<string, boolean>;
}

const empty: State = { seen: {}, peerBlocked: {}, internalBlocked: {} };

export function loadState(): State {
  try {
    return { ...empty, ...JSON.parse(fs.readFileSync(config.stateFile, "utf8")) };
  } catch {
    return { ...empty };
  }
}

export function saveState(state: State): void {
  fs.writeFileSync(config.stateFile, JSON.stringify(state, null, 2));
}
