import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { requireSyncAgent } from "@/lib/sync-auth";

/**
 * 홈페이지 자체 예약 → 외부 플랫폼 차단용 조회/확인 API (sync-agent 전용)
 *
 * GET  — 아직 외부 플랫폼(스페이스클라우드·네이버)에 차단 반영하지 않은
 *        확정 예약 목록(오늘 이후)을 반환.
 * POST — 차단 반영 완료 확인(ack): { items: [{ source, id }] }
 *        source: 'reservations' | 'party_reservations'
 */

function todayKst(): string {
  const kst = new Date(Date.now() + 9 * 3600_000);
  return kst.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  const denied = requireSyncAgent(request);
  if (denied) return denied;

  const supabase = getAdminClient();
  const from = todayKst();

  const [practice, party] = await Promise.all([
    supabase
      .from("reservations")
      .select("id, date, end_date, start_time, end_time, reservation_type, status")
      .gte("date", from)
      .in("status", ["PAID", "CONFIRMED"])
      .is("synced_to_platforms_at", null)
      .order("date", { ascending: true })
      .limit(100),
    supabase
      .from("party_reservations")
      .select("id, date, end_date, start_time, end_time, package_type, status")
      .gte("date", from)
      .in("status", ["PAID", "CONFIRMED", "paid", "confirmed"])
      .is("synced_to_platforms_at", null)
      .order("date", { ascending: true })
      .limit(100),
  ]);

  if (practice.error) {
    return NextResponse.json({ error: practice.error.message }, { status: 500 });
  }
  if (party.error) {
    return NextResponse.json({ error: party.error.message }, { status: 500 });
  }

  const pending = [
    ...(practice.data ?? []).map((r) => ({
      source: "reservations" as const,
      id: r.id,
      roomType: r.reservation_type === "party-room" ? "party" : "practice",
      date: r.date,
      endDate: r.end_date ?? null,
      startTime: String(r.start_time).slice(0, 5),
      endTime: String(r.end_time).slice(0, 5),
    })),
    ...(party.data ?? []).map((r) => ({
      source: "party_reservations" as const,
      id: r.id,
      roomType: "party",
      packageType: r.package_type,
      date: r.date,
      endDate: r.end_date ?? null,
      startTime: String(r.start_time).slice(0, 5),
      endTime: String(r.end_time).slice(0, 5),
    })),
  ];

  return NextResponse.json({ pending });
}

export async function POST(request: NextRequest) {
  const denied = requireSyncAgent(request);
  if (denied) return denied;

  let body: { items?: Array<{ source: string; id: string }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON" }, { status: 400 });
  }
  const items = body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items 배열이 필요합니다" }, { status: 400 });
  }

  const supabase = getAdminClient();
  const now = new Date().toISOString();
  const results: Array<{ source: string; id: string; ok: boolean; error?: string }> = [];

  for (const item of items) {
    if (!["reservations", "party_reservations"].includes(item.source)) {
      results.push({ ...item, ok: false, error: `지원하지 않는 source: ${item.source}` });
      continue;
    }
    const { error } = await supabase
      .from(item.source)
      .update({ synced_to_platforms_at: now })
      .eq("id", item.id);
    results.push({ ...item, ok: !error, error: error?.message });
  }

  return NextResponse.json({ results });
}
