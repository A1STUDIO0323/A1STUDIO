import { chromium, type BrowserContext } from "playwright";
import { config } from "./config.js";

/**
 * 로그인 세션이 유지되는 persistent 크롬 컨텍스트.
 * .browser-profile/ 에 쿠키·세션이 저장되므로 최초 1회 수동 로그인 후 재사용된다.
 */
export async function launchContext(opts?: { headed?: boolean }): Promise<BrowserContext> {
  return chromium.launchPersistentContext(config.profileDir, {
    headless: !(opts?.headed ?? config.headed),
    viewport: { width: 1400, height: 900 },
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
  });
}
