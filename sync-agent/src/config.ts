import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`.env 에 ${name} 설정이 필요합니다 (.env.example 참고)`);
  }
  return v;
}

export const config = {
  homepageUrl: required("HOMEPAGE_URL").replace(/\/$/, ""),
  apiKey: required("SYNC_AGENT_API_KEY"),
  pollIntervalMin: Number(process.env.POLL_INTERVAL_MIN ?? 5),
  lookaheadDays: Number(process.env.LOOKAHEAD_DAYS ?? 60),
  headed: process.env.HEADED === "true",
  // 로그인 세션이 저장되는 크롬 프로필 디렉터리 (npm run login 으로 최초 로그인)
  profileDir: path.join(root, ".browser-profile"),
  stateFile: path.join(root, "state.json"),
};
