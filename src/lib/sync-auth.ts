import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * sync-agent(24시간 PC) 전용 API 키 인증.
 * 요청 헤더 x-sync-api-key 를 env SYNC_AGENT_API_KEY 와 비교한다.
 */
export function requireSyncAgent(request: NextRequest): NextResponse | null {
  const expected = process.env.SYNC_AGENT_API_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "SYNC_AGENT_API_KEY가 설정되지 않았습니다" },
      { status: 503 }
    );
  }
  const provided = request.headers.get("x-sync-api-key") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }
  return null;
}
