import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdminOrLegacy } from "@/lib/admin-auth";

/**
 * 관리자용 예약 총괄 조회 API
 * GET /api/admin/reservations/calendar?start=2026-04-01&end=2026-04-30
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminOrLegacy(request);
  if ("error" in auth) return auth.error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "start와 end 파라미터가 필요합니다 (YYYY-MM-DD 형식)" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 관리자 권한 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    // 역할 확인 (admin 또는 owner만 접근 가능)
    const { data: roleData } = await supabase
      .from("member_roles")
      .select("role")
      .eq("email", user.email)
      .single();

    if (!roleData || !["admin", "owner"].includes(roleData.role)) {
      return NextResponse.json({ error: "관리자 권한이 필요합니다" }, { status: 403 });
    }

    // 1. 연습실 예약 조회
    const { data: roomReservations, error: roomError } = await supabase
      .from("reservations")
      .select(`
        id,
        date,
        start_time,
        end_time,
        status,
        reservation_type,
        points_used,
        user_id,
        guest_name,
        guest_phone,
        headcount,
        memo,
        created_at
      `)
      .gte("date", startDate)
      .lte("date", endDate)
      .in("status", ["PAID", "HOLD", "CONFIRMED"])
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (roomError) {
      console.error("연습실 예약 조회 오류:", roomError);
    }

    // 2. 파티룸 예약 조회
    const { data: partyReservations, error: partyError } = await supabase
      .from("party_reservations")
      .select(`
        id,
        date,
        end_date,
        start_time,
        end_time,
        package_type,
        status,
        points_used,
        payment_method,
        user_id,
        guest_name,
        guest_phone,
        headcount,
        memo,
        created_at
      `)
      .gte("date", startDate)
      .lte("date", endDate)
      .in("status", ["PAID", "HOLD", "CONFIRMED"])
      .order("date", { ascending: true });

    if (partyError) {
      console.error("파티룸 예약 조회 오류:", partyError);
    }

    // 3. 외부 플랫폼 예약 조회 (스페이스 클라우드, 네이버 플레이스 등)
    const { data: externalReservations, error: externalError } = await supabase
      .from("external_reservations")
      .select(`
        id,
        platform,
        date,
        start_time,
        end_time,
        room_type,
        guest_name,
        guest_phone,
        amount,
        status,
        external_id,
        created_at
      `)
      .gte("date", startDate)
      .lte("date", endDate)
      .eq("status", "confirmed")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    // external_reservations 테이블이 없을 수 있으므로 오류 무시
    if (externalError && !externalError.message.includes("relation")) {
      console.error("외부 예약 조회 오류:", externalError);
    }

    // 4. 통합 예약 목록 생성
    const allReservations = [
      ...(roomReservations || []).map((r) => ({
        ...r,
        type: r.reservation_type === 'party-room' ? 'party-room' : 'practice-room',
        source: 'internal',
        room_name: r.reservation_type === 'party-room' ? 'A1 파티룸' : 'A1 연습실',
      })),
      ...(partyReservations || []).map((r) => ({
        ...r,
        type: 'party-room',
        source: 'internal',
        room_name: 'A1 파티룸',
      })),
      ...(externalReservations || []).map((r) => ({
        ...r,
        type: r.room_type,
        source: 'external',
        room_name: r.platform === 'spacecloud' ? '스페이스클라우드' : '네이버 플레이스',
      })),
    ];

    // 날짜별로 그룹화
    const reservationsByDate: Record<string, any[]> = {};
    allReservations.forEach((reservation) => {
      const date = reservation.date;
      if (!reservationsByDate[date]) {
        reservationsByDate[date] = [];
      }
      reservationsByDate[date].push(reservation);
    });

    return NextResponse.json({
      reservations: allReservations,
      reservationsByDate,
      stats: {
        total: allReservations.length,
        practiceRoom: roomReservations?.length || 0,
        partyRoom: partyReservations?.length || 0,
        external: externalReservations?.length || 0,
      },
    });
  } catch (error) {
    console.error("예약 총괄 조회 오류:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "서버 오류" },
      { status: 500 }
    );
  }
}
