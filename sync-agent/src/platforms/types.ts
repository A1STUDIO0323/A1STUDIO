import type { BrowserContext } from "playwright";

export type Platform = "spacecloud" | "naver";

/** 플랫폼에서 스크랩한 예약 1건 */
export interface ScrapedReservation {
  platform: Platform;
  externalId: string;
  roomType: "practice" | "party";
  date: string; // YYYY-MM-DD
  endDate?: string | null;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  guestName: string;
  guestPhone: string; // 숫자만 또는 010-xxxx-xxxx
  amount?: number;
  status: "confirmed" | "cancelled";
  memo?: string;
}

/** 차단할 시간 슬롯 */
export interface BlockSlot {
  roomType: "practice" | "party";
  date: string;
  endDate?: string | null;
  startTime: string;
  endTime: string;
}

/** 각 플랫폼 어댑터가 구현해야 하는 인터페이스 */
export interface PlatformAdapter {
  platform: Platform;
  /** 로그인 세션 유효 여부 확인 */
  isLoggedIn(ctx: BrowserContext): Promise<boolean>;
  /** 예약 목록 스크랩 (오늘 ~ lookaheadDays) */
  fetchReservations(ctx: BrowserContext, lookaheadDays: number): Promise<ScrapedReservation[]>;
  /** 해당 시간 슬롯을 예약 불가로 차단 */
  blockSlot(ctx: BrowserContext, slot: BlockSlot): Promise<void>;
  /** 차단 해제 (취소 시) */
  unblockSlot(ctx: BrowserContext, slot: BlockSlot): Promise<void>;
}
