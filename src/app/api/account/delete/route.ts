import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin 클라이언트 생성 (계정 삭제용)
 */
function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * 회원 탈퇴 API
 * POST /api/account/delete
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다" },
        { status: 401 }
      );
    }

    // 1. 포인트 소멸 처리 (잔액이 있으면 0으로 변경)
    const { data: pointsData } = await supabase
      .from("user_points")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    console.log('[계정탈퇴] 포인트 잔액:', pointsData?.balance || 0);

    let forfeitedPoints = 0;

    if (pointsData && pointsData.balance > 0) {
      forfeitedPoints = pointsData.balance;
      
      // 포인트를 0으로 변경하고 소멸 기록 추가
      await supabase
        .from("user_points")
        .update({
          balance: 0,
          total_used: (pointsData.balance || 0),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      // 소멸 기록 추가
      await supabase
        .from("point_transactions")
        .insert({
          user_id: user.id,
          type: "use",
          amount: pointsData.balance,
          balance_after: 0,
          description: `회원 탈퇴로 인한 포인트 소멸`,
          reservation_id: null,
        });

      console.log('[계정탈퇴] 포인트 소멸 완료:', pointsData.balance);
    }

    // 2. 활성 예약 자동 취소 처리
    const todayDate = new Date().toISOString().split('T')[0];
    
    // 연습실 예약 확인
    const { data: activeReservations, error: reservationsError } = await supabase
      .from("reservations")
      .select("id, date, start_time, status, total_amount")
      .eq("user_id", user.id)
      .in("status", ["PAID", "CONFIRMED", "HOLD"])
      .gte("date", todayDate);

    // 파티룸 예약 확인
    const { data: activePartyReservations, error: partyReservationsError } = await supabase
      .from("party_reservations")
      .select("id, date, start_time, status, total_amount")
      .eq("user_id", user.id)
      .in("status", ["PAID", "CONFIRMED", "HOLD"])
      .gte("date", todayDate);

    console.log('[계정탈퇴] 활성 예약 확인:', {
      activeReservations: activeReservations?.length || 0,
      activePartyReservations: activePartyReservations?.length || 0,
      todayDate,
    });

    // 활성 예약 자동 취소 처리
    if (activeReservations && activeReservations.length > 0) {
      console.log('[계정탈퇴] 연습실 예약 자동 취소 시작');
      
      for (const reservation of activeReservations) {
        // 예약 상태를 CANCELLED로 변경
        await supabase
          .from("reservations")
          .update({ status: "CANCELLED" })
          .eq("id", reservation.id);
        
        console.log(`[계정탈퇴] 연습실 예약 취소: ${reservation.id}`);
      }
    }

    if (activePartyReservations && activePartyReservations.length > 0) {
      console.log('[계정탈퇴] 파티룸 예약 자동 취소 시작');
      
      for (const reservation of activePartyReservations) {
        // 예약 상태를 CANCELLED로 변경
        await supabase
          .from("party_reservations")
          .update({ status: "CANCELLED" })
          .eq("id", reservation.id);
        
        console.log(`[계정탈퇴] 파티룸 예약 취소: ${reservation.id}`);
      }
    }

    const totalCancelledReservations = 
      (activeReservations?.length || 0) + (activePartyReservations?.length || 0);
    
    if (totalCancelledReservations > 0) {
      console.log(`[계정탈퇴] 총 ${totalCancelledReservations}건의 예약 자동 취소 완료`);
    }

    console.log('[계정탈퇴] 포인트 및 예약 처리 완료 - 탈퇴 진행');

    // 3. 개인정보 비식별화 (member_profiles)
    const { error: profileError } = await supabase
      .from("member_profiles")
      .update({
        phone: null,
        birth_date: null,
        middle_school: null,
        high_school: null,
        university: null,
        graduate_school: null,
        updated_at: new Date().toISOString(),
      })
      .eq("email", user.email);

    if (profileError) {
      console.error("프로필 삭제 실패:", profileError);
    }

    // 4. 예약 정보 비식별화 (guest_name, guest_phone)
    await supabase
      .from("reservations")
      .update({
        guest_name: "탈퇴회원",
        guest_phone: "삭제됨",
      })
      .eq("user_id", user.id);

    await supabase
      .from("party_reservations")
      .update({
        guest_name: "탈퇴회원",
        guest_phone: "삭제됨",
      })
      .eq("user_id", user.id);

    // 5. Supabase Auth 계정 삭제 (Admin API 사용)
    console.log('[계정탈퇴] Auth 계정 삭제 시작');
    const adminClient = createAdminClient();
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error("계정 삭제 실패:", deleteError);
      return NextResponse.json(
        { error: "계정 삭제에 실패했습니다", detail: deleteError.message },
        { status: 500 }
      );
    }

    console.log('[계정탈퇴] Auth 계정 삭제 완료');

    // 6. 세션 종료 (서버 측)
    await supabase.auth.signOut();
    console.log('[계정탈퇴] 세션 종료 완료');

    return NextResponse.json({
      success: true,
      message: "회원 탈퇴가 완료되었습니다",
      deleted: {
        user_id: user.id,
        email: user.email,
        cancelled_reservations: totalCancelledReservations,
        points_forfeited: forfeitedPoints,
      }
    });

  } catch (error) {
    console.error("회원 탈퇴 중 오류:", error);
    return NextResponse.json(
      { error: "회원 탈퇴 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
