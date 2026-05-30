import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchPracticeIntervals,
  partyPackageInterval,
  overlaps,
} from "@/lib/space-availability";

/**
 * 파티룸 예약 가능 날짜 조회
 * GET /api/party-room/reservations/available?month=2026-04
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get("month"); // YYYY-MM 형식

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "month 파라미터가 필요합니다 (YYYY-MM 형식)" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 해당 월의 시작일과 종료일 계산
    const [year, monthNum] = month.split("-");
    const startDate = `${year}-${monthNum}-01`;
    const endDate = `${year}-${monthNum}-${new Date(parseInt(year), parseInt(monthNum), 0).getDate()}`;

    // party_reservations에서 PAID, HOLD, CONFIRMED 상태의 예약 조회
    const { data: reservations, error } = await supabase
      .from("party_reservations")
      .select("package_type, date, end_date, status")
      .in("status", ["PAID", "HOLD", "CONFIRMED"])
      .gte("date", startDate)
      .lte("date", endDate);

    if (error) {
      throw new Error(`예약 조회 실패: ${error.message}`);
    }

    // 패키지별 예약 불가 날짜 목록 생성
    const unavailable: {
      day: string[];
      night: string[];
      allday: string[];
    } = {
      day: [],
      night: [],
      allday: [],
    };

    // 각 예약에 대해 처리
    for (const reservation of reservations || []) {
      const dateStr = reservation.date;
      const endDateStr = reservation.end_date;

      if (reservation.package_type === "day") {
        // 낮 패키지: 해당일만 블로킹
        if (!unavailable.day.includes(dateStr)) {
          unavailable.day.push(dateStr);
        }
        // 낮 패키지가 있으면 종일권도 불가
        if (!unavailable.allday.includes(dateStr)) {
          unavailable.allday.push(dateStr);
        }
      } else if (reservation.package_type === "night") {
        // 야간 패키지: 입실일과 익일 모두 블로킹
        if (!unavailable.night.includes(dateStr)) {
          unavailable.night.push(dateStr);
        }
        // 야간 패키지가 있으면 종일권도 불가
        if (!unavailable.allday.includes(dateStr)) {
          unavailable.allday.push(dateStr);
        }
        if (endDateStr && !unavailable.allday.includes(endDateStr)) {
          unavailable.allday.push(endDateStr);
        }
      } else if (reservation.package_type === "allday") {
        // 종일권: 입실일과 익일 모두 모든 패키지 블로킹
        if (!unavailable.day.includes(dateStr)) {
          unavailable.day.push(dateStr);
        }
        if (!unavailable.night.includes(dateStr)) {
          unavailable.night.push(dateStr);
        }
        if (!unavailable.allday.includes(dateStr)) {
          unavailable.allday.push(dateStr);
        }
        if (endDateStr) {
          if (!unavailable.night.includes(endDateStr)) {
            unavailable.night.push(endDateStr);
          }
          if (!unavailable.allday.includes(endDateStr)) {
            unavailable.allday.push(endDateStr);
          }
        }
      }
    }

    // 교차검사: 같은 물리 공간의 연습실(reservations) 점유와 시간이 겹치는 날짜도 차단
    // (연습실 00:00~02:00 예약이 전날 나잇/올데이 패키지와 겹치는 경우 등)
    const practiceIntervals = await fetchPracticeIntervals(
      supabase,
      startDate,
      endDate
    );
    if (practiceIntervals.length > 0) {
      const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
      for (let d = 1; d <= lastDay; d++) {
        const dateStr = `${year}-${monthNum}-${String(d).padStart(2, "0")}`;
        for (const pkg of ["day", "night", "allday"] as const) {
          if (unavailable[pkg].includes(dateStr)) continue;
          const candIv = partyPackageInterval(dateStr, pkg);
          if (practiceIntervals.some((iv) => overlaps(iv, candIv))) {
            unavailable[pkg].push(dateStr);
          }
        }
      }
    }

    // 정렬
    unavailable.day.sort();
    unavailable.night.sort();
    unavailable.allday.sort();

    return NextResponse.json({ unavailable });
  } catch (error) {
    console.error("예약 가능 날짜 조회 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류" },
      { status: 500 }
    );
  }
}
