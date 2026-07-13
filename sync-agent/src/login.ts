import { launchContext } from "./browser.js";

/**
 * 최초 로그인용 스크립트 — 브라우저 창을 띄워 두 플랫폼에 직접 로그인한다.
 * 로그인 세션은 .browser-profile/ 에 저장되어 이후 npm start 에서 재사용된다.
 *
 * 사용법: npm run login → 두 탭에서 각각 로그인 → 브라우저 창 닫기
 */
async function main() {
  const ctx = await launchContext({ headed: true });

  const spacecloud = await ctx.newPage();
  await spacecloud.goto("https://partner.spacecloud.kr");

  const naver = await ctx.newPage();
  await naver.goto("https://partner.booking.naver.com");

  console.log("두 탭에서 각각 로그인해 주세요. 로그인 후 브라우저 창을 닫으면 세션이 저장됩니다.");
  await new Promise<void>((resolve) => ctx.on("close", () => resolve()));
  console.log("세션 저장 완료. 이제 `npm start` 로 동기화를 시작할 수 있습니다.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
