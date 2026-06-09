import { NextRequest, NextResponse } from "next/server";
import {
  fetchPartyIntervals,
  fetchPracticeIntervals,
} from "@/lib/space-availability";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json({ error: "date 파라미터가 필요합니다" }, { status: 400 });
    }

    // 자정 넘김 예약을 포함해 정확히 표시하려면 절대 분 기준으로 클립.
    // - fetchPracticeIntervals / fetchPartyIntervals 는 ±1일 패딩 조회 →
    //   전날에 시작해 당일로 넘어오는 예약도 포함됨.
    const [dy, dm, dd] = dateStr.slice(0, 10).split("-").map(Number);
    const dayStartMin = Math.floor(Date.UTC(dy, dm - 1, dd) / 86_400_000) * 1440;
    const dayEndMin = dayStartMin + 1440;
    const fmt = (relMin: number) =>
      `${String(Math.floor(relMin / 60)).padStart(2, "0")}:${String(relMin % 60).padStart(2, "0")}`;

    const reserved: { start_time: string; end_time: string }[] = [];

    // 연습실 예약 (자정 넘김 포함)
    const practiceIntervals = await fetchPracticeIntervals(dateStr, dateStr);
    for (const iv of practiceIntervals) {
      const s = Math.max(iv.startMin, dayStartMin);
      const e = Math.min(iv.endMin, dayEndMin);
      if (s < e) {
        reserved.push({ start_time: fmt(s - dayStartMin), end_time: fmt(e - dayStartMin) });
      }
    }

    // 파티룸 예약 (이미 자정 넘김 지원)
    const partyIntervals = await fetchPartyIntervals(dateStr, dateStr);
    for (const iv of partyIntervals) {
      const s = Math.max(iv.startMin, dayStartMin);
      const e = Math.min(iv.endMin, dayEndMin);
      if (s < e) {
        reserved.push({ start_time: fmt(s - dayStartMin), end_time: fmt(e - dayStartMin) });
      }
    }

    // 시작 시간 순으로 정렬
    reserved.sort((a, b) => a.start_time.localeCompare(b.start_time));

    return NextResponse.json({
      date: dateStr,
      reserved,
    });
  } catch (error) {
    console.error("[reservations/available] 조회 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "예약 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}
