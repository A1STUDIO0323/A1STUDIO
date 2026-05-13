import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// 예약현황(읽기 전용) — 카카오페이 심사 중: 결제/예약 컬럼·라우트 변경 없음, SELECT only
// GET /api/reservations/status?month=YYYY-MM
// 응답: { practice: [...], party: [...], longTerm: [...] }

export const dynamic = "force-dynamic";

type PracticeBlock = {
  source: "practice";
  date: string;        // YYYY-MM-DD
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
  roomName: string | null;
  status: string;
};

type PartyBlock = {
  source: "party";
  date: string;
  startTime: string;
  endTime: string;
  status: string;
};

type LongTermBlock = {
  source: "longTerm";
  date: string;
  startTime: string;
  endTime: string;
  spaceType: string;
  status: string;
};

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toHHmm(d: Date): string {
  // party_reservations.start_time / end_time = @db.Time(6) → Date with epoch 1970-01-01 in local TZ
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function dateOnly(d: Date): string {
  // party_reservations.date = @db.Date → midnight UTC
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month");
  logger.log("[reservations/status] GET start", { month });

  if (!month || !MONTH_RE.test(month)) {
    logger.warn("[reservations/status] invalid month param", { month });
    return NextResponse.json(
      { ok: false, error: "month 파라미터는 YYYY-MM 형식이어야 합니다." },
      { status: 400 }
    );
  }

  const [yStr, mStr] = month.split("-");
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;
  const firstDay = `${month}-01`;
  const lastDayNum = new Date(year, monthIdx + 1, 0).getDate();
  const lastDay = `${month}-${pad(lastDayNum)}`;

  try {
    // 1) 연습실 예약: Reservation.date = "YYYY-MM-DD" 문자열
    const practiceRows = await prisma.reservation.findMany({
      where: {
        date: { gte: firstDay, lte: lastDay },
        status: { in: ["PAID", "CONFIRMED", "HOLD"] },
      },
      select: {
        date: true,
        startTime: true,
        endTime: true,
        status: true,
        room: { select: { name: true } },
      },
    });
    const practice: PracticeBlock[] = practiceRows.map((r) => ({
      source: "practice",
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
      roomName: r.room?.name ?? null,
      status: r.status,
    }));

    // 2) 파티룸 예약: party_reservations.date(@db.Date), start_time/end_time(@db.Time)
    const partyRows = await prisma.party_reservations.findMany({
      where: {
        date: {
          gte: new Date(`${firstDay}T00:00:00.000Z`),
          lte: new Date(`${lastDay}T00:00:00.000Z`),
        },
        status: { in: ["PAID", "CONFIRMED", "HOLD"] },
      },
      select: { date: true, start_time: true, end_time: true, status: true },
    });
    const party: PartyBlock[] = partyRows.map((r) => ({
      source: "party",
      date: dateOnly(r.date),
      startTime: toHHmm(r.start_time),
      endTime: toHHmm(r.end_time),
      status: r.status ?? "PAID",
    }));

    // 3) 장기대관: usage_month(YYYY-MM) + usage_dates(Int[]) + start_hour/end_hour
    const ltRows = await prisma.long_term_bookings.findMany({
      where: {
        usage_month: month,
        status: { notIn: ["DRAFT", "CANCELLED"] },
      },
      select: {
        usage_month: true,
        usage_dates: true,
        start_hour: true,
        end_hour: true,
        space_type: true,
        status: true,
      },
    });
    const longTerm: LongTermBlock[] = ltRows.flatMap((r) =>
      (r.usage_dates ?? []).map((day) => ({
        source: "longTerm" as const,
        date: `${r.usage_month}-${pad(day)}`,
        startTime: `${pad(r.start_hour)}:00`,
        endTime: `${pad(r.end_hour)}:00`,
        spaceType: r.space_type,
        status: r.status,
      }))
    );

    logger.log("[reservations/status] GET success", {
      month,
      counts: { practice: practice.length, party: party.length, longTerm: longTerm.length },
    });

    return NextResponse.json({ ok: true, month, practice, party, longTerm });
  } catch (err) {
    logger.error("[reservations/status] GET failed", { month, error: err });
    return NextResponse.json(
      { ok: false, error: "예약현황 조회에 실패했습니다." },
      { status: 500 }
    );
  }
}
