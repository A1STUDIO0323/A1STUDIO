"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Calendar, Clock, Coins, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

function BookingCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("id");
  const pointsUsed = searchParams.get("points");
  const paymentMethod = searchParams.get("method") || "points";

  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reservationId) {
      router.push("/booking");
      return;
    }

    const supabase = createClient();
    
    supabase
      .from("reservations")
      .select("*")
      .eq("id", reservationId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          console.error("예약 조회 오류:", error);
          router.push("/booking");
        } else {
          setReservation(data);
          setLoading(false);
        }
      });
  }, [reservationId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F3EB] flex items-center justify-center">
        <p className="text-[#6f655d]">로딩 중...</p>
      </div>
    );
  }

  if (!reservation) {
    return null;
  }

  const reservationDate = new Date(reservation.date);
  const startDisp =
    typeof reservation.start_time === "string"
      ? reservation.start_time.slice(0, 5)
      : String(reservation.start_time ?? "").slice(0, 5);
  const endDisp =
    typeof reservation.end_time === "string"
      ? reservation.end_time.slice(0, 5)
      : String(reservation.end_time ?? "").slice(0, 5);
  const durationLabel =
    reservation.duration_hours != null
      ? `${reservation.duration_hours}시간`
      : null;

  return (
    <div className="min-h-screen bg-[#F7F3EB] flex items-center justify-center py-20 px-4">
      <div className="max-w-md w-full">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#B98768]/15 mb-6">
            <CheckCircle className="w-10 h-10 text-[#B98768]" />
          </div>

          <h1 className="text-3xl font-bold text-[#3B342F] mb-3">
            예약 완료
          </h1>

          <p className="text-[#6f655d] mb-8">
            연습실 예약이 완료되었습니다
          </p>

          <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6 mb-8 text-left">
            <h2 className="text-lg font-bold text-[#3B342F] mb-4 pb-4 border-b border-[#D8CCBC]">
              예약 정보
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-[#B98768] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-[#9b9189] mb-1">예약 날짜</p>
                  <p className="font-semibold text-[#3B342F]">
                    {format(reservationDate, "yyyy년 M월 d일 (eee)", { locale: ko })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-[#B98768] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-[#9b9189] mb-1">이용 시간</p>
                  <p className="font-semibold text-[#3B342F]">
                    {startDisp} ~ {endDisp}
                    {durationLabel && (
                      <span className="text-sm text-[#9b9189] ml-2">
                        ({durationLabel})
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-[#D8CCBC]">
                <p className="text-sm text-[#9b9189] mb-1">결제 정보</p>
                {paymentMethod === "kakaopay" ? (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-[#B98768]" />
                    <p className="text-2xl font-bold text-[#B98768]">
                      카카오페이{" "}
                      {(reservation.total_amount ?? 0).toLocaleString("ko-KR")}
                      <span className="text-base ml-1">원</span>
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-[#B98768]" />
                    <p className="text-2xl font-bold text-[#B98768]">
                      {(reservation.points_used != null
                        ? reservation.points_used
                        : parseInt(pointsUsed || "0", 10)
                      ).toLocaleString("ko-KR")}
                      <span className="text-base ml-1">P</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-[#f5ede6] border border-[#B98768]/20 p-4 mb-8">
            <p className="text-sm text-[#6f655d]">
              마이페이지에서 예약 내역을 확인하고 취소할 수 있습니다
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/mypage"
              className="block w-full rounded-full bg-[#B98768] px-6 py-4 text-center text-base font-bold text-white transition-all hover:bg-[#a9785c] active:scale-95"
            >
              마이페이지
            </Link>

            <Link
              href="/"
              className="block w-full rounded-full border border-[#D8CCBC] px-6 py-4 text-center text-base font-medium text-[#3B342F] transition-all hover:border-[#B98768] hover:text-[#B98768]"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F3EB] flex items-center justify-center">
        <p className="text-[#6f655d]">로딩 중...</p>
      </div>
    }>
      <BookingCompleteContent />
    </Suspense>
  );
}
