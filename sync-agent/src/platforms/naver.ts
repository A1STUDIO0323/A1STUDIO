import type { BrowserContext, Page } from "playwright";
import type { BlockSlot, PlatformAdapter, ScrapedReservation } from "./types.js";

/**
 * 네이버 스마트플레이스(예약) 어댑터
 *
 * ⚠️ 셀렉터 확인 필요: 스마트플레이스 예약관리 화면은 로그인해야 구조를 볼 수 있다.
 * `npm run login` 으로 네이버 로그인(2단계 인증 포함) 후,
 * `HEADED=true npm run once` 로 실제 화면을 보면서 SELECTORS 를 조정한다.
 *
 * 네이버는 자동화 감지가 엄격하므로: 로그인은 반드시 사람이 직접(headed),
 * 폴링 간격을 지나치게 짧게(1분 미만) 잡지 말 것.
 */

const URLS = {
  // 스마트플레이스 예약 파트너센터 — 업체 진입 후 예약목록
  bookings: "https://partner.booking.naver.com",
};

const SELECTORS = {
  loginForm: "#id, input[name='id'], .login_wrap",
  reservationRow: "[data-booking-id], table tbody tr, li[class*='booking']",
  guestName: "[class*='name']",
  status: "[class*='status']",
};

function roomTypeOf(text: string): "practice" | "party" {
  return /파티/.test(text) ? "party" : "practice";
}

async function openPage(ctx: BrowserContext, url: string): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  return page;
}

export const naver: PlatformAdapter = {
  platform: "naver",

  async isLoggedIn(ctx) {
    const page = await openPage(ctx, URLS.bookings);
    try {
      const kickedToLogin =
        /nid\.naver\.com/i.test(page.url()) ||
        (await page.locator(SELECTORS.loginForm).count()) > 0;
      return !kickedToLogin;
    } finally {
      await page.close();
    }
  },

  async fetchReservations(ctx, _lookaheadDays): Promise<ScrapedReservation[]> {
    const page = await openPage(ctx, URLS.bookings);
    try {
      await page.waitForSelector(SELECTORS.reservationRow, { timeout: 15_000 });
      const rows = page.locator(SELECTORS.reservationRow);
      const count = await rows.count();
      const out: ScrapedReservation[] = [];

      for (let i = 0; i < count; i++) {
        const row = rows.nth(i);
        const text = (await row.innerText()).replace(/\s+/g, " ");

        const externalId =
          (await row.getAttribute("data-booking-id")) ??
          text.match(/예약번호[:\s]*([A-Z0-9-]+)/i)?.[1] ??
          "";
        const phone = text.match(/(01[016789][-\s]?\d{3,4}[-\s]?\d{4})/)?.[1] ?? "";
        const date = text.match(/(\d{4}[.\-/]\d{2}[.\-/]\d{2})/)?.[1]?.replace(/[./]/g, "-") ?? "";
        const times = text.match(/(\d{1,2}:\d{2})\s*[~-]\s*(\d{1,2}:\d{2})/);
        const name = text.match(/([가-힣]{2,4})\s*님/)?.[1] ?? "";
        const cancelled = /취소/.test(text);

        if (!externalId || !date || !times) {
          console.warn(`[naver] 행 파싱 실패(셀렉터 확인 필요): "${text.slice(0, 80)}..."`);
          continue;
        }

        out.push({
          platform: "naver",
          externalId,
          roomType: roomTypeOf(text),
          date,
          startTime: times[1].padStart(5, "0"),
          endTime: times[2].padStart(5, "0"),
          guestName: name || "예약자",
          guestPhone: phone,
          status: cancelled ? "cancelled" : "confirmed",
        });
      }
      return out;
    } finally {
      await page.close();
    }
  },

  async blockSlot(_ctx, slot: BlockSlot) {
    // TODO(셀렉터 확인 필요): 스마트플레이스 예약 > 스케줄(운영시간/휴무) 설정에서
    // slot.date / slot.startTime~endTime 시간대를 예약 불가로 설정.
    throw new Error(
      `[naver] blockSlot 미구현 — 스마트플레이스 스케줄 화면 셀렉터 확인 후 구현 필요 (${slot.date} ${slot.startTime}~${slot.endTime})`
    );
  },

  async unblockSlot(_ctx, slot: BlockSlot) {
    throw new Error(
      `[naver] unblockSlot 미구현 — 스마트플레이스 스케줄 화면 셀렉터 확인 필요 (${slot.date} ${slot.startTime}~${slot.endTime})`
    );
  },
};
