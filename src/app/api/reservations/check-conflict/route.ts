import { NextRequest, NextResponse } from "next/server";
import { hasAnySpaceConflict } from "@/lib/space-availability";

/**
 * 선예약 충돌 사전 확인 (읽기 전용)
 * POST /api/reservations/check-conflict
 * body: { date: 'YYYY-MM-DD', startTime: 'HH:mm', endTime: 'HH:mm', endDate?: 'YYYY-MM-DD' }
 *
 * 연습실(reservations) + 파티룸(party_reservations) 두 테이블을 모두 검사한다.
 * 자정 넘김(overnight)은 endDate가 있으면 사용, 없으면 end<=start일 때 익일로 인식.
 * - 결제/예약 데이터 변경 없음, SELECT only.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { date, startTime, endTime, endDate } = body as {
      date?: string;
      startTime?: string;
      endTime?: string;
      endDate?: string | null;
    };

    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { ok: false, error: "date, startTime, endTime이 필요합니다." },
        { status: 400 }
      );
    }

    const conflict = await hasAnySpaceConflict({
      date,
      startTime,
      endTime,
      endDate: endDate ?? null,
    });

    console.log("[reservations/check-conflict]", { date, startTime, endTime, conflict });
    return NextResponse.json({ ok: true, conflict });
  } catch (err) {
    console.error("[reservations/check-conflict] 실패", err);
    // 실패 시 예약 진행을 막지 않도록 conflict=false 로 응답 (서버 측 최종 가드가 별도 존재)
    return NextResponse.json(
      { ok: false, conflict: false, error: "충돌 검사에 실패했습니다." },
      { status: 500 }
    );
  }
}
