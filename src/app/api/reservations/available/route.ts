import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchPartyIntervals } from "@/lib/space-availability";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json({ error: "date 파라미터가 필요합니다" }, { status: 400 });
    }

    const supabase = await createClient();

    // 해당 날짜의 확정된 예약 조회 (PAID, HOLD, CONFIRMED 상태 모두 포함)
    const { data: reservations, error } = await supabase
      .from("reservations")
      .select("start_time, end_time")
      .eq("date", dateStr)
      .in("status", ["PAID", "HOLD", "CONFIRMED"])
      .order("start_time", { ascending: true });

    if (error) {
      throw new Error(`예약 조회 실패: ${error.message}`);
    }

    // 예약된 시간 블록 반환
    const reserved = (reservations || []).map((r) => ({
      start_time: r.start_time,
      end_time: r.end_time,
    }));

    // 교차검사: 같은 물리 공간의 파티룸(party_reservations) 점유도 해당 날짜에 표시
    // 자정 넘김 구간은 요청 날짜에 걸치는 부분만 클립 (end 1440분 → "24:00")
    const [dy, dm, dd] = dateStr.slice(0, 10).split("-").map(Number);
    const dayStartMin = Math.floor(Date.UTC(dy, dm - 1, dd) / 86_400_000) * 1440;
    const dayEndMin = dayStartMin + 1440;
    const fmt = (relMin: number) =>
      `${String(Math.floor(relMin / 60)).padStart(2, "0")}:${String(relMin % 60).padStart(2, "0")}`;

    const partyIntervals = await fetchPartyIntervals(dateStr, dateStr);
    for (const iv of partyIntervals) {
      const s = Math.max(iv.startMin, dayStartMin);
      const e = Math.min(iv.endMin, dayEndMin);
      if (s < e) {
        reserved.push({ start_time: fmt(s - dayStartMin), end_time: fmt(e - dayStartMin) });
      }
    }

    return NextResponse.json({
      date: dateStr,
      reserved,
    });
  } catch (error) {
    console.error("예약 가능 시간 조회 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "예약 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}
