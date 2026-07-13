import type { BrowserContext, Page } from "playwright";
import type { BlockSlot, PlatformAdapter, ScrapedReservation } from "./types.js";

/**
 * 스페이스클라우드 파트너센터 어댑터
 *
 * ⚠️ 셀렉터 확인 필요: 파트너센터는 로그인해야 화면 구조를 볼 수 있어,
 * 아래 SELECTORS 는 실제 계정으로 접속해 개발자도구로 확인 후 조정해야 한다.
 * `npm run login` → 로그인 → `HEADED=true npm run once` 로 확인하면서 맞추면 된다.
 */

const URLS = {
  home: "https://partner.spacecloud.kr",
  // 예약 관리 목록 (신규/이용예정 예약)
  reservations: "https://partner.spacecloud.kr/reservation/list",
};

const SELECTORS = {
  // 로그인 상태 판별: 로그인 페이지로 리다이렉트되면 세션 만료
  loginForm: 'form[action*="login"], input[name="id"][type="text"]',
  // 예약 목록의 행
  reservationRow: "[data-reservation-id], table tbody tr",
  // 행 내부 필드 (없으면 행 전체 텍스트에서 정규식 파싱으로 폴백)
  guestName: ".guest-name",
  guestPhone: ".guest-phone",
  dateTime: ".reservation-datetime",
  space: ".space-name",
  status: ".reservation-status",
};

/** 공간명 → roomType 매핑 — 실제 등록된 공간명에 맞게 조정 */
function roomTypeOf(spaceName: string): "practice" | "party" {
  return /파티/.test(spaceName) ? "party" : "practice";
}

async function openPage(ctx: BrowserContext, url: string): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  return page;
}

export const spacecloud: PlatformAdapter = {
  platform: "spacecloud",

  async isLoggedIn(ctx) {
    const page = await openPage(ctx, URLS.reservations);
    try {
      // 로그인 페이지로 튕기거나 로그인 폼이 보이면 세션 만료
      const kickedToLogin =
        /login/i.test(page.url()) ||
        (await page.locator(SELECTORS.loginForm).count()) > 0;
      return !kickedToLogin;
    } finally {
      await page.close();
    }
  },

  async fetchReservations(ctx, _lookaheadDays): Promise<ScrapedReservation[]> {
    const page = await openPage(ctx, URLS.reservations);
    try {
      await page.waitForSelector(SELECTORS.reservationRow, { timeout: 15_000 });
      const rows = page.locator(SELECTORS.reservationRow);
      const count = await rows.count();
      const out: ScrapedReservation[] = [];

      for (let i = 0; i < count; i++) {
        const row = rows.nth(i);
        const text = (await row.innerText()).replace(/\s+/g, " ");

        // 행 전체 텍스트에서 파싱 (필드 셀렉터가 안 맞아도 동작하도록)
        const externalId =
          (await row.getAttribute("data-reservation-id")) ??
          text.match(/예약번호[:\s]*([A-Z0-9-]+)/i)?.[1] ??
          "";
        const phone = text.match(/(01[016789][-\s]?\d{3,4}[-\s]?\d{4})/)?.[1] ?? "";
        const date = text.match(/(\d{4}[.\-/]\d{2}[.\-/]\d{2})/)?.[1]?.replace(/[./]/g, "-") ?? "";
        const times = text.match(/(\d{1,2}:\d{2})\s*[~-]\s*(\d{1,2}:\d{2})/);
        const name =
          (await row.locator(SELECTORS.guestName).textContent().catch(() => null))?.trim() ??
          text.match(/예약자[:\s]*([가-힣a-zA-Z]+)/)?.[1] ??
          "";
        const cancelled = /취소/.test(text);

        if (!externalId || !date || !times) {
          console.warn(`[spacecloud] 행 파싱 실패(셀렉터 확인 필요): "${text.slice(0, 80)}..."`);
          continue;
        }

        out.push({
          platform: "spacecloud",
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
    // TODO(셀렉터 확인 필요): 파트너센터 > 예약관리 > 예약마감(휴무) 설정 화면에서
    // slot.date / slot.startTime~endTime 시간대를 마감 처리.
    // 화면 구조 확인 후 구현 — 그 전까지는 실패로 처리해 관리자 알림이 가도록 한다.
    throw new Error(
      `[spacecloud] blockSlot 미구현 — 파트너센터 예약마감 화면 셀렉터 확인 후 구현 필요 (${slot.date} ${slot.startTime}~${slot.endTime})`
    );
  },

  async unblockSlot(_ctx, slot: BlockSlot) {
    throw new Error(
      `[spacecloud] unblockSlot 미구현 — 파트너센터 예약마감 해제 셀렉터 확인 필요 (${slot.date} ${slot.startTime}~${slot.endTime})`
    );
  },
};
