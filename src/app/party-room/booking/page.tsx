"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  calcPartyRoomPoints,
  PartyRoomPackage,
  PARTY_ROOM_PACKAGES,
  PARTY_ROOM_MAX_HEADCOUNT,
} from "@/lib/pricing";
import { useIsAdult } from "@/lib/auth-client";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isBefore, startOfToday, addMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Calendar, Sparkles, AlertCircle, Users, CreditCard, Coins } from "lucide-react";

type Step = 1 | 2 | 3 | 4;

const PACKAGE_INFO = {
  day: { name: '낮 패키지', time: '10:00 ~ 17:00', hours: 7 },
  night: { name: '야간 패키지', time: '19:00 ~ 익일 07:00', hours: 12 },
  allday: { name: '종일권', time: '10:00 ~ 익일 07:00', hours: 21 },
};

function PartyRoomBookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const isAdultUser = useIsAdult();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  
  // Step 1: 패키지 선택
  const [selectedPackage, setSelectedPackage] = useState<PartyRoomPackage | null>(null);
  
  // Step 2: 날짜 선택
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [unavailableDates, setUnavailableDates] = useState<{ day: string[]; night: string[]; allday: string[] }>({ day: [], night: [], allday: [] });
  const [priceInfo, setPriceInfo] = useState<any>(null);
  
  // Step 3: 예약 정보 확인
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [memo, setMemo] = useState("");
  const [policyConfirmed, setPolicyConfirmed] = useState(false);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  
  // Step 4: 결제 수단 선택
  const [paymentMethod, setPaymentMethod] = useState<'points' | 'kakaopay' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 알림 메시지
  const cancelled = searchParams.get('cancelled');
  const failed = searchParams.get('failed');

  // 초기화
  useEffect(() => {
    const supabase = createClient();
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login?redirect=/party-room/booking");
      } else {
        setUser(user);
        
        // 포인트 잔액 조회
        supabase
          .from("user_points")
          .select("balance")
          .eq("user_id", user.id)
          .single()
          .then(({ data }) => {
            setUserPoints(data?.balance || 0);
            setLoading(false);
          });
      }
    });
  }, [router]);

  // 성인 체크
  useEffect(() => {
    if (loading) return;
    
    if (isAdultUser === null) {
      alert("예약을 위해 생년월일 정보가 필요합니다. 프로필을 완성해 주세요.");
      router.push("/onboarding/profile");
    } else if (isAdultUser === false) {
      alert("파티룸은 만 19세 이상 성인 회원만 예약할 수 있습니다.");
      router.push("/party-room");
    }
  }, [isAdultUser, loading, router]);

  // 패키지 선택 시 예약 가능 날짜 조회
  useEffect(() => {
    if (!selectedPackage) return;

    const monthStr = format(currentMonth, "yyyy-MM");
    fetch(`/api/party-room/reservations/available?month=${monthStr}`)
      .then((res) => res.json())
      .then((data) => {
        setUnavailableDates(data.unavailable || { day: [], night: [], allday: [] });
      })
      .catch((err) => console.error("예약 가능 날짜 조회 오류:", err));
  }, [selectedPackage, currentMonth]);

  // 날짜 선택 시 가격 계산
  useEffect(() => {
    if (!selectedDate || !selectedPackage) {
      setPriceInfo(null);
      return;
    }

    const pricing = calcPartyRoomPoints(selectedDate, selectedPackage);
    setPriceInfo(pricing);
  }, [selectedDate, selectedPackage]);

  // 달력 날짜 생성
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const today = startOfToday();
  const maxDate = addDays(today, 60);

  // 날짜가 예약 불가능한지 확인
  const isDateUnavailable = (date: Date): boolean => {
    if (!selectedPackage) return false;
    const dateStr = format(date, "yyyy-MM-dd");
    return unavailableDates[selectedPackage].includes(dateStr);
  };

  // 포인트 결제
  const handlePointsPayment = async () => {
    if (!selectedDate || !selectedPackage || !priceInfo) return;

    const totalAmount = priceInfo.isEvent ? priceInfo.eventPrice : priceInfo.originalPrice;

    if (totalAmount > userPoints) {
      if (confirm("포인트가 부족합니다. 포인트를 충전하시겠습니까?")) {
        router.push("/charge");
      }
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/party-room/reservations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package_type: selectedPackage,
          date: format(selectedDate, "yyyy-MM-dd"),
          guest_name: guestName,
          guest_phone: guestPhone,
          memo,
          headcount: PARTY_ROOM_MAX_HEADCOUNT,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "예약에 실패했습니다");
      }

      router.push(`/party-room/booking/complete?id=${data.reservation_id}`);
    } catch (error) {
      console.error("예약 오류:", error);
      alert(error instanceof Error ? error.message : "예약에 실패했습니다");
      setSubmitting(false);
    }
  };

  // 카카오페이 결제
  const handleKakaoPayment = async () => {
    if (!selectedDate || !selectedPackage || !priceInfo) return;

    setSubmitting(true);

    try {
      const response = await fetch("/api/party-room/payments/kakao/ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          package_type: selectedPackage,
          date: format(selectedDate, "yyyy-MM-dd"),
          guest_name: guestName,
          guest_phone: guestPhone,
          memo,
          headcount: PARTY_ROOM_MAX_HEADCOUNT,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "결제 준비에 실패했습니다");
      }

      // 카카오페이 결제창으로 리디렉트
      window.location.href = data.redirect_url;
    } catch (error) {
      console.error("결제 준비 오류:", error);
      alert(error instanceof Error ? error.message : "결제 준비에 실패했습니다");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F3EB] py-20 flex items-center justify-center">
        <p className="text-[#6f655d]">로딩 중...</p>
      </div>
    );
  }

  const totalAmount = priceInfo ? (priceInfo.isEvent ? priceInfo.eventPrice : priceInfo.originalPrice) : 0;
  const canProceedToStep2 = selectedPackage !== null;
  const canProceedToStep3 = selectedDate !== null && priceInfo !== null;
  const canProceedToStep4 = policyConfirmed && adultConfirmed;

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
            Party Room Booking
          </p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">
            파티룸 예약
          </h1>
          <p className="mt-3 text-[#6f655d]">
            패키지를 선택하고 날짜를 정해 예약하세요
          </p>
        </div>

        {/* 알림 메시지 */}
        {cancelled && (
          <div className="mb-8 rounded-xl bg-yellow-50 border border-yellow-200 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">결제가 취소되었습니다.</p>
          </div>
        )}
        {failed && (
          <div className="mb-8 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">결제에 실패했습니다. 다시 시도해주세요.</p>
          </div>
        )}

        {/* 포인트 잔액 */}
        <div className="mb-8 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6 text-center">
          <p className="text-sm text-[#9b9189] mb-2">보유 포인트</p>
          <p className="text-4xl font-bold text-[#B98768]">
            {userPoints.toLocaleString("ko-KR")}
            <span className="text-xl ml-1">P</span>
          </p>
        </div>

        {/* 진행 단계 표시 */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  currentStep >= step
                    ? "bg-[#B98768] text-white"
                    : "bg-[#EFE7DA] text-[#9b9189]"
                }`}
              >
                {step}
              </div>
              {step < 4 && (
                <div
                  className={`w-8 h-0.5 ${
                    currentStep > step ? "bg-[#B98768]" : "bg-[#D8CCBC]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* STEP 1: 패키지 선택 */}
        {currentStep === 1 && (
          <div className="rounded-2xl border border-[#D8CCBC] bg-white p-6">
            <h2 className="text-xl font-bold text-[#3B342F] mb-6">
              1. 패키지 선택
            </h2>

            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#B98768]/20 px-4 py-2 text-sm font-semibold text-[#B98768]">
              <Sparkles className="w-4 h-4" />
              현재 오픈 이벤트 기간 · 비품 업그레이드 완료 후 정가 전환
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {(['day', 'night', 'allday'] as PartyRoomPackage[]).map((pkg) => {
                const info = PACKAGE_INFO[pkg];
                return (
                  <button
                    key={pkg}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`rounded-2xl border-2 p-6 text-left transition-all ${
                      selectedPackage === pkg
                        ? 'border-[#B98768] bg-[#f5ede6] shadow-lg'
                        : 'border-[#D8CCBC] bg-white hover:bg-[#F7F3EB]'
                    }`}
                  >
                    <h3 className="text-xl font-bold text-[#3B342F] mb-2">{info.name}</h3>
                    <p className="text-sm text-[#6f655d] mb-4">{info.time}</p>
                    <p className="text-xs text-[#9b9189] mb-4">({info.hours}시간)</p>
                    
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-[#9b9189]">비피크</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs line-through text-[#9b9189]">
                            {PARTY_ROOM_PACKAGES[pkg].hours === 7 ? '100,000원' : 
                             PARTY_ROOM_PACKAGES[pkg].hours === 12 ? '140,000원' : '210,000원'}
                          </span>
                          <span className="text-lg font-bold text-[#B98768]">
                            {PARTY_ROOM_PACKAGES[pkg].hours === 7 ? '70,000원' : 
                             PARTY_ROOM_PACKAGES[pkg].hours === 12 ? '100,000원' : '150,000원'}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="text-[#9b9189]">피크</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs line-through text-[#9b9189]">
                            {PARTY_ROOM_PACKAGES[pkg].hours === 7 ? '130,000원' : 
                             PARTY_ROOM_PACKAGES[pkg].hours === 12 ? '160,000원' : '250,000원'}
                          </span>
                          <span className="text-lg font-bold text-[#B98768]">
                            {PARTY_ROOM_PACKAGES[pkg].hours === 7 ? '90,000원' : 
                             PARTY_ROOM_PACKAGES[pkg].hours === 12 ? '120,000원' : '180,000원'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentStep(2)}
              disabled={!canProceedToStep2}
              className="w-full rounded-xl bg-[#B98768] px-6 py-4 text-base font-bold text-white transition-all hover:bg-[#a9785c] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음 단계
            </button>
          </div>
        )}

        {/* STEP 2: 날짜 선택 */}
        {currentStep === 2 && selectedPackage && (
          <div className="rounded-2xl border border-[#D8CCBC] bg-white p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#3B342F] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#B98768]" />
                2. 날짜 선택
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                  className="p-2 rounded-full hover:bg-[#EFE7DA] transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-[#3B342F]" />
                </button>
                <span className="text-lg font-semibold text-[#3B342F] min-w-[120px] text-center">
                  {format(currentMonth, "yyyy년 M월", { locale: ko })}
                </span>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 rounded-full hover:bg-[#EFE7DA] transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-[#3B342F]" />
                </button>
              </div>
            </div>

            <div className="mb-4 text-sm text-[#6f655d]">
              선택한 패키지: <span className="font-bold text-[#3B342F]">{PACKAGE_INFO[selectedPackage].name}</span>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-6">
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <div key={day} className="text-center text-sm font-semibold text-[#9b9189] py-2">
                  {day}
                </div>
              ))}
              {days.map((day) => {
                const isDisabled = isBefore(day, today) || day > maxDate || isDateUnavailable(day);
                const isSelected = selectedDate && format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => !isDisabled && setSelectedDate(day)}
                    disabled={isDisabled}
                    className={`
                      aspect-square rounded-lg text-sm transition-all
                      ${isDisabled ? "text-[#D8CCBC] cursor-not-allowed bg-[#F7F3EB]" : "hover:bg-[#EFE7DA]"}
                      ${isSelected ? "bg-[#B98768] text-white font-bold" : "text-[#3B342F]"}
                      ${isToday(day) && !isSelected ? "border-2 border-[#B98768]" : ""}
                    `}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            {priceInfo && selectedDate && (
              <div className="rounded-lg bg-[#f5ede6] border border-[#B98768]/20 p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#6f655d]">
                    {format(selectedDate, "yyyy년 M월 d일 (eee)", { locale: ko })} · {priceInfo.priceType === 'peak' ? '피크타임' : '비피크'}
                  </span>
                  {priceInfo.isEvent && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#B98768]/20 px-2 py-0.5 text-xs font-semibold text-[#B98768]">
                      <Sparkles className="w-3 h-3" />
                      이벤트 할인
                    </span>
                  )}
                </div>
                {priceInfo.isEvent && (
                  <p className="text-sm text-[#9b9189] mb-2">
                    <span className="line-through">
                      {priceInfo.originalPrice.toLocaleString("ko-KR")}원
                    </span>
                    {" → "}
                    <span className="font-semibold text-[#B98768]">
                      {priceInfo.eventPrice.toLocaleString("ko-KR")}원
                    </span>
                  </p>
                )}
                <p className="text-3xl font-bold text-[#B98768]">
                  {totalAmount.toLocaleString("ko-KR")}원
                </p>
                <p className="text-xs text-[#9b9189] mt-2 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  최대 10인 이용 가능 (추가 요금 없음)
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep(1)}
                className="flex-1 rounded-xl border border-[#D8CCBC] px-6 py-4 text-base font-bold text-[#3B342F] hover:bg-[#F7F3EB]"
              >
                이전
              </button>
              <button
                onClick={() => setCurrentStep(3)}
                disabled={!canProceedToStep3}
                className="flex-1 rounded-xl bg-[#B98768] px-6 py-4 text-base font-bold text-white transition-all hover:bg-[#a9785c] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음 단계
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: 예약 정보 확인 */}
        {currentStep === 3 && selectedPackage && selectedDate && priceInfo && (
          <div className="rounded-2xl border border-[#D8CCBC] bg-white p-6">
            <h2 className="text-xl font-bold text-[#3B342F] mb-6">
              3. 예약 정보 확인
            </h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between py-2 border-b border-[#D8CCBC]">
                <span className="text-[#6f655d]">패키지</span>
                <span className="font-semibold text-[#3B342F]">
                  {PACKAGE_INFO[selectedPackage].name} ({PACKAGE_INFO[selectedPackage].time})
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#D8CCBC]">
                <span className="text-[#6f655d]">날짜</span>
                <span className="font-semibold text-[#3B342F]">
                  {format(selectedDate, "yyyy년 M월 d일 (eee)", { locale: ko })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#D8CCBC]">
                <span className="text-[#6f655d]">요금 구분</span>
                <span className="font-semibold text-[#3B342F]">
                  {priceInfo.priceType === 'peak' ? '피크타임' : '비피크'}
                </span>
              </div>
              {priceInfo.isEvent && (
                <div className="flex justify-between py-2 border-b border-[#D8CCBC]">
                  <span className="text-[#6f655d]">정가</span>
                  <span className="line-through text-[#9b9189]">
                    {priceInfo.originalPrice.toLocaleString("ko-KR")}원
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2">
                <span className="text-[#6f655d]">결제금액</span>
                <span className="font-bold text-[#B98768] text-2xl">
                  {totalAmount.toLocaleString("ko-KR")}원
                </span>
              </div>
            </div>

            {/* 예약자 정보 (선택사항) */}
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3B342F] mb-2">
                  예약자 이름 (선택)
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="이름을 입력하세요"
                  className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] focus:border-[#B98768] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3B342F] mb-2">
                  연락처 (선택)
                </label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  placeholder="010-1234-5678"
                  className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] focus:border-[#B98768] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#3B342F] mb-2">
                  메모 (선택)
                </label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="특이사항이 있으면 입력하세요"
                  rows={3}
                  className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] focus:border-[#B98768] focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* 취소·환불 정책 안내 */}
            <div className="mb-6 rounded-xl bg-[#EFE7DA] p-6">
              <h3 className="text-lg font-bold text-[#3B342F] mb-3">취소·환불 정책</h3>
              <ul className="space-y-2 text-sm text-[#6f655d]">
                <li>· <span className="font-semibold">7일 전까지:</span> 전액 환불</li>
                <li>
                  · <span className="font-semibold">3일 전까지:</span> 50% 환불
                  <div className="ml-4 mt-1 text-xs text-[#9b9189]">
                    (카드 결제 시 카드 전액 취소 후 결제금액의 50%가 포인트로 적립됩니다)
                  </div>
                </li>
                <li>· <span className="font-semibold">3일 이내:</span> 환불 불가</li>
              </ul>
            </div>

            {/* 확인 체크박스 */}
            <div className="mb-6 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policyConfirmed}
                  onChange={(e) => setPolicyConfirmed(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-[#D8CCBC] text-[#B98768] focus:ring-[#B98768]"
                />
                <span className="text-sm text-[#3B342F]">
                  위 취소·환불 정책을 확인했습니다.
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adultConfirmed}
                  onChange={(e) => setAdultConfirmed(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-[#D8CCBC] text-[#B98768] focus:ring-[#B98768]"
                />
                <span className="text-sm text-[#3B342F]">
                  본인 및 동반 이용자 전원이 만 19세 이상 성인임을 확인합니다.
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep(2)}
                className="flex-1 rounded-xl border border-[#D8CCBC] px-6 py-4 text-base font-bold text-[#3B342F] hover:bg-[#F7F3EB]"
              >
                이전
              </button>
              <button
                onClick={() => setCurrentStep(4)}
                disabled={!canProceedToStep4}
                className="flex-1 rounded-xl bg-[#B98768] px-6 py-4 text-base font-bold text-white transition-all hover:bg-[#a9785c] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                결제하기
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: 결제 수단 선택 */}
        {currentStep === 4 && selectedPackage && selectedDate && priceInfo && (
          <div className="rounded-2xl border border-[#D8CCBC] bg-white p-6">
            <h2 className="text-xl font-bold text-[#3B342F] mb-6">
              4. 결제 수단 선택
            </h2>

            <div className="space-y-4 mb-6">
              {/* 포인트 결제 */}
              <div
                className={`rounded-xl border-2 p-6 cursor-pointer transition-all ${
                  paymentMethod === 'points'
                    ? 'border-[#B98768] bg-[#f5ede6]'
                    : 'border-[#D8CCBC] bg-white hover:bg-[#F7F3EB]'
                }`}
                onClick={() => setPaymentMethod('points')}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Coins className="w-6 h-6 text-[#B98768]" />
                  <h3 className="text-lg font-bold text-[#3B342F]">포인트 결제</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6f655d]">현재 잔액</span>
                    <span className="font-semibold text-[#3B342F]">
                      {userPoints.toLocaleString("ko-KR")}P
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6f655d]">결제 후 잔액</span>
                    <span className="font-semibold text-[#3B342F]">
                      {(userPoints - totalAmount).toLocaleString("ko-KR")}P
                    </span>
                  </div>
                </div>
                {totalAmount > userPoints && (
                  <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                    포인트가 부족합니다. (부족: {(totalAmount - userPoints).toLocaleString("ko-KR")}P)
                  </div>
                )}
              </div>

              {/* 카카오페이 결제 */}
              <div
                className={`rounded-xl border-2 p-6 cursor-pointer transition-all ${
                  paymentMethod === 'kakaopay'
                    ? 'border-[#B98768] bg-[#f5ede6]'
                    : 'border-[#D8CCBC] bg-white hover:bg-[#F7F3EB]'
                }`}
                onClick={() => setPaymentMethod('kakaopay')}
              >
                <div className="flex items-center gap-3 mb-3">
                  <CreditCard className="w-6 h-6 text-[#FEE500]" />
                  <h3 className="text-lg font-bold text-[#3B342F]">카카오페이</h3>
                </div>
                <p className="text-sm text-[#6f655d]">
                  신용·체크카드 및 카카오페이머니 결제
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep(3)}
                className="flex-1 rounded-xl border border-[#D8CCBC] px-6 py-4 text-base font-bold text-[#3B342F] hover:bg-[#F7F3EB]"
              >
                이전
              </button>
              {paymentMethod === 'points' ? (
                <button
                  onClick={handlePointsPayment}
                  disabled={submitting || totalAmount > userPoints}
                  className="flex-1 rounded-xl bg-[#B98768] px-6 py-4 text-base font-bold text-white transition-all hover:bg-[#a9785c] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "처리 중..." : "포인트로 결제하기"}
                </button>
              ) : paymentMethod === 'kakaopay' ? (
                <button
                  onClick={handleKakaoPayment}
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-[#FEE500] px-6 py-4 text-base font-bold text-[#3B342F] transition-all hover:bg-[#F5DC00] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "처리 중..." : "카카오페이로 결제하기"}
                </button>
              ) : (
                <button
                  disabled
                  className="flex-1 rounded-xl bg-[#D8CCBC] px-6 py-4 text-base font-bold text-white cursor-not-allowed"
                >
                  결제 수단을 선택하세요
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PartyRoomBookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F3EB] py-20 flex items-center justify-center">
        <p className="text-[#6f655d]">로딩 중...</p>
      </div>
    }>
      <PartyRoomBookingContent />
    </Suspense>
  );
}
