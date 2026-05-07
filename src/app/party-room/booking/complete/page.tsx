"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { format, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import { CheckCircle, MapPin, Phone, Calendar, Clock, CreditCard, AlertCircle } from "lucide-react";
import Link from "next/link";
import { STUDIO_PHONE } from "@/lib/constants";

const PACKAGE_INFO = {
  day: { name: '데이 패키지', time: '10:00 ~ 17:00' },
  night: { name: '나잇 패키지', time: '19:00 ~ 익일 07:00' },
  allday: { name: '올데이 패키지', time: '10:00 ~ 익일 07:00' },
};

function PartyRoomCompleteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("id");
  
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!reservationId) {
      router.push("/party-room");
      return;
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("points:refresh"));
    }

    const supabase = createClient();
    
    supabase
      .from("party_reservations")
      .select("*")
      .eq("id", reservationId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          console.error("예약 조회 오류:", error);
          router.push("/party-room");
        } else {
          setReservation(data);
          setLoading(false);
        }
      });
  }, [reservationId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F3EB] py-20 flex items-center justify-center">
        <p className="text-[#6f655d]">로딩 중...</p>
      </div>
    );
  }

  if (!reservation) return null;

  // 취소 가능 기한 계산
  const startDateTime = new Date(`${reservation.date}T${reservation.start_time}`);
  const fullRefundDeadline = addDays(startDateTime, -7);
  const halfRefundDeadline = addDays(startDateTime, -3);

  const packageInfo = PACKAGE_INFO[reservation.package_type as keyof typeof PACKAGE_INFO];

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        {/* 완료 헤더 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-[#3B342F] mb-2">
            파티룸 예약이 완료되었습니다
          </h1>
          <p className="text-[#6f655d]">
            예약 확인 정보가 등록하신 연락처로 발송됩니다
          </p>
        </div>

        {/* 예약 상세 정보 */}
        <div className="rounded-2xl border border-[#D8CCBC] bg-white p-8 mb-6">
          <h2 className="text-xl font-bold text-[#3B342F] mb-6 pb-4 border-b border-[#D8CCBC]">
            예약 정보
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b border-[#D8CCBC]">
              <span className="text-[#6f655d]">패키지</span>
              <span className="font-semibold text-[#3B342F]">
                {packageInfo.name}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#D8CCBC]">
              <span className="text-[#6f655d]">날짜</span>
              <span className="font-semibold text-[#3B342F]">
                {format(new Date(reservation.date), "yyyy년 M월 d일 (eee)", { locale: ko })}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#D8CCBC]">
              <span className="text-[#6f655d]">이용시간</span>
              <span className="font-semibold text-[#3B342F]">
                {packageInfo.time}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#D8CCBC]">
              <span className="text-[#6f655d]">결제금액</span>
              <span className="font-bold text-[#B98768] text-xl">
                {reservation.total_amount.toLocaleString("ko-KR")}원
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#6f655d]">결제수단</span>
              <span className="font-semibold text-[#3B342F]">
                {reservation.payment_method === 'points' ? '포인트' : '카카오페이'}
              </span>
            </div>
          </div>
        </div>

        {/* 입실 안내 */}
        <div className="rounded-xl bg-[#EFE7DA] p-6 mb-6">
          <h3 className="text-lg font-bold text-[#3B342F] mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#B98768]" />
            입실 안내
          </h3>
          <div className="space-y-2 text-sm text-[#6f655d]">
            <p>· 도어락 코드는 예약 확정 문자·이메일로 발송됩니다</p>
            <p>· 주소: 서울시 송파구 문정동 70-13 B1</p>
            <p className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              문의: {STUDIO_PHONE} (24시간)
            </p>
          </div>
        </div>

        {/* 취소·환불 안내 (카드 50% 환불 포함 - 1/3) */}
        <div className="rounded-xl bg-white border border-[#D8CCBC] p-6 mb-6">
          <h3 className="text-lg font-bold text-[#3B342F] mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#B98768]" />
            취소·환불 안내
          </h3>
          <ul className="mb-4 space-y-1 text-sm text-[#6f655d] list-disc list-inside">
            <li>이용 7일 전 이상: 전액 환불</li>
            <li>이용 3일 ~ 6일 전: 50% 환불</li>
            <li>이용 전날: 취소 불가</li>
            <li>이용 당일: 취소 불가</li>
          </ul>
          <div className="space-y-3 border-t border-[#D8CCBC] pt-3 text-sm">
            <p className="font-semibold text-[#3B342F]">이 예약 기준 취소 마감 시각</p>
            <div>
              <p className="text-[#6f655d]">
                · 전액 환불: {format(fullRefundDeadline, "M월 d일(eee) HH:mm", { locale: ko })}까지
              </p>
            </div>
            <div>
              <p className="text-[#6f655d] mb-1">
                · 50% 환불: {format(halfRefundDeadline, "M월 d일(eee) HH:mm", { locale: ko })}까지
              </p>
              {reservation.payment_method === 'kakaopay' && (
                <p className="ml-4 text-xs text-[#9b9189] bg-yellow-50 border border-yellow-200 rounded p-2">
                  ⚠️ 카드 결제 시 카드 전액 취소 후 결제금액의 50%가 포인트로 적립됩니다.<br />
                  포인트는 마이페이지에서 확인하실 수 있습니다.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <Link
            href="/mypage"
            className="flex-1 rounded-xl border border-[#D8CCBC] px-6 py-4 text-base font-bold text-[#3B342F] hover:bg-[#F7F3EB] text-center"
          >
            예약 내역 확인하기
          </Link>
          <Link
            href="/party-room"
            className="flex-1 rounded-xl bg-[#B98768] px-6 py-4 text-base font-bold text-white hover:bg-[#a9785c] text-center"
          >
            파티룸 홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PartyRoomCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F3EB] py-20 flex items-center justify-center">
        <p className="text-[#6f655d]">로딩 중...</p>
      </div>
    }>
      <PartyRoomCompleteContent />
    </Suspense>
  );
}
