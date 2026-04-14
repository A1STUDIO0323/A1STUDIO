"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  calcPoints, 
  getPriceType, 
  calcDuration, 
  getPriceTypeName,
  calcPartyRoomPoints,
  PartyRoomPackage,
  PARTY_ROOM_PACKAGES,
} from "@/lib/pricing";
import { useIsAdult } from "@/lib/auth-client";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isBefore, startOfToday } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Calendar, Sparkles, AlertCircle, Users } from "lucide-react";

interface TimeSlot {
  time: string;
  disabled: boolean;
}

type ReservationType = 'room' | 'party-room';

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type') as ReservationType;
  const reservationType = typeParam === 'party-room' ? 'party-room' : 'room';
  
  const [user, setUser] = useState<any>(null);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const isAdultUser = useIsAdult();
  
  // Step 0: 탭 선택
  const [selectedType, setSelectedType] = useState<ReservationType>(reservationType);
  
  // Step 1: 날짜 선택
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Step 2: 시간/패키지 선택
  const [reservedSlots, setReservedSlots] = useState<{ start_time: string; end_time: string }[]>([]);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [selectedPackage, setSelectedPackage] = useState<PartyRoomPackage | null>(null);
  
  // Step 3: 예약 정보
  const [totalPoints, setTotalPoints] = useState(0);
  const [priceInfo, setPriceInfo] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [showAdultModal, setShowAdultModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // 초기화
  useEffect(() => {
    const supabase = createClient();
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login?redirect=/booking");
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

  // 탭 변경 시 성인 체크
  useEffect(() => {
    if (selectedType === 'party-room') {
      if (isAdultUser === null) {
        setShowProfileModal(true);
      } else if (isAdultUser === false) {
        setShowAdultModal(true);
        setSelectedType('room'); // 다시 연습실로
      }
    }
  }, [selectedType, isAdultUser]);

  // 날짜 선택 시 예약된 시간 조회
  useEffect(() => {
    if (!selectedDate) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    fetch(`/api/reservations/available?date=${dateStr}`)
      .then((res) => res.json())
      .then((data) => {
        setReservedSlots(data.reserved || []);
      })
      .catch((err) => console.error("예약 조회 오류:", err));
  }, [selectedDate]);

  // 시간 선택 시 요금 계산 (연습실)
  useEffect(() => {
    if (selectedType !== 'room' || !selectedDate || !startTime || !endTime) {
      if (selectedType === 'room') {
        setTotalPoints(0);
        setPriceInfo(null);
      }
      return;
    }

    const startHour = parseInt(startTime.split(":")[0]);
    const priceType = getPriceType(selectedDate, startHour);
    const duration = calcDuration(startTime, endTime);
    const pricing = calcPoints(priceType, duration, selectedDate);
    
    const points = pricing.isEvent ? pricing.eventPrice : pricing.originalPrice;
    setTotalPoints(points);
    setPriceInfo({
      ...pricing,
      priceType,
      duration,
      finalPrice: points,
    });
  }, [selectedType, selectedDate, startTime, endTime]);

  // 패키지 선택 시 요금 계산 (파티룸)
  useEffect(() => {
    if (selectedType !== 'party-room' || !selectedDate || !selectedPackage) {
      if (selectedType === 'party-room') {
        setTotalPoints(0);
        setPriceInfo(null);
      }
      return;
    }

    const pricing = calcPartyRoomPoints(selectedDate, selectedPackage);
    const points = pricing.isEvent ? pricing.eventPrice : pricing.originalPrice;
    setTotalPoints(points);
    setPriceInfo({
      ...pricing,
      packageName: selectedPackage === 'day' ? '낮 패키지' : 
                   selectedPackage === 'night' ? '야간 패키지' : '종일권',
      packageTime: PARTY_ROOM_PACKAGES[selectedPackage].start + ' ~ ' + PARTY_ROOM_PACKAGES[selectedPackage].end,
      finalPrice: points,
    });
  }, [selectedType, selectedDate, selectedPackage]);

  // 달력 날짜 생성
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // 시간 슬롯 생성 (30분 단위)
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let min of [0, 30]) {
        const time = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
        
        // 예약된 시간인지 체크
        const isReserved = reservedSlots.some((slot) => {
          const slotStart = slot.start_time;
          const slotEnd = slot.end_time;
          return time >= slotStart && time < slotEnd;
        });
        
        slots.push({ time, disabled: isReserved });
      }
    }
    return slots;
  };

  const timeSlots = selectedDate ? generateTimeSlots() : [];

  // 예약 제출
  const handleSubmit = async () => {
    if (!selectedDate) {
      alert("날짜를 선택해주세요");
      return;
    }

    if (selectedType === 'room' && (!startTime || !endTime)) {
      alert("시간을 선택해주세요");
      return;
    }

    if (selectedType === 'party-room' && !selectedPackage) {
      alert("패키지를 선택해주세요");
      return;
    }

    if (selectedType === 'party-room' && !adultConfirmed) {
      alert("성인 확인 체크박스를 선택해주세요");
      return;
    }

    if (totalPoints > userPoints) {
      alert("포인트가 부족합니다");
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        date: format(selectedDate, "yyyy-MM-dd"),
        reservation_type: selectedType,
      };

      if (selectedType === 'room') {
        payload.start_time = startTime;
        payload.end_time = endTime;
      } else {
        // 파티룸
        payload.package_type = selectedPackage;
        const pkg = PARTY_ROOM_PACKAGES[selectedPackage!];
        payload.start_time = pkg.start;
        payload.end_time = pkg.end;
        payload.headcount = 10; // 기본값
      }

      const response = await fetch("/api/reservations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "예약에 실패했습니다");
      }

      router.push(`/booking/complete?id=${data.reservation_id}&points=${data.points_used}`);
    } catch (error) {
      console.error("예약 오류:", error);
      alert(error instanceof Error ? error.message : "예약에 실패했습니다");
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

  const today = startOfToday();
  const maxDate = addDays(today, 60);

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
            Booking
          </p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">
            예약하기
          </h1>
          <p className="mt-3 text-[#6f655d]">
            연습실 또는 파티룸을 선택하고 예약하세요
          </p>
        </div>

        {/* 포인트 잔액 표시 */}
        <div className="mb-8 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6 text-center">
          <p className="text-sm text-[#9b9189] mb-2">보유 포인트</p>
          <p className="text-4xl font-bold text-[#B98768]">
            {userPoints.toLocaleString("ko-KR")}
            <span className="text-xl ml-1">P</span>
          </p>
        </div>

        {/* 탭 선택 */}
        <div className="mb-8 flex gap-2 justify-center">
          <button
            onClick={() => setSelectedType('room')}
            className={`rounded-xl px-8 py-4 text-base font-bold transition-all ${
              selectedType === 'room'
                ? 'bg-[#B98768] text-white'
                : 'bg-white text-[#3B342F] border border-[#D8CCBC] hover:bg-[#EFE7DA]'
            }`}
          >
            연습실 예약
          </button>
          <button
            onClick={() => setSelectedType('party-room')}
            className={`rounded-xl px-8 py-4 text-base font-bold transition-all ${
              selectedType === 'party-room'
                ? 'bg-[#B98768] text-white'
                : 'bg-white text-[#3B342F] border border-[#D8CCBC] hover:bg-[#EFE7DA]'
            }`}
          >
            파티룸 예약
            <span className="ml-2 text-xs opacity-90">성인 전용</span>
          </button>
        </div>

        {/* Step 1: 날짜 선택 */}
        <div className="mb-8 rounded-2xl border border-[#D8CCBC] bg-white p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#3B342F] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#B98768]" />
              1. 날짜 선택
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(addDays(currentMonth, -30))}
                className="p-2 rounded-full hover:bg-[#EFE7DA] transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-[#3B342F]" />
              </button>
              <span className="text-lg font-semibold text-[#3B342F] min-w-[120px] text-center">
                {format(currentMonth, "yyyy년 M월", { locale: ko })}
              </span>
              <button
                onClick={() => setCurrentMonth(addDays(currentMonth, 30))}
                className="p-2 rounded-full hover:bg-[#EFE7DA] transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-[#3B342F]" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-[#9b9189] py-2">
                {day}
              </div>
            ))}
            {days.map((day) => {
              const isDisabled = isBefore(day, today) || day > maxDate;
              const isSelected = selectedDate && format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => !isDisabled && setSelectedDate(day)}
                  disabled={isDisabled}
                  className={`
                    aspect-square rounded-lg text-sm transition-all
                    ${isDisabled ? "text-[#D8CCBC] cursor-not-allowed" : "hover:bg-[#EFE7DA]"}
                    ${isSelected ? "bg-[#B98768] text-white font-bold" : "text-[#3B342F]"}
                    ${isToday(day) && !isSelected ? "border-2 border-[#B98768]" : ""}
                  `}
                >
                  {format(day, "d")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: 시간/패키지 선택 */}
        {selectedDate && (
          <div className="mb-8 rounded-2xl border border-[#D8CCBC] bg-white p-6">
            <h2 className="text-xl font-bold text-[#3B342F] mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#B98768]" />
              2. {selectedType === 'room' ? '시간 선택' : '패키지 선택'}
            </h2>

            <div className="mb-4">
              <p className="text-sm text-[#6f655d] mb-2">
                선택한 날짜: {format(selectedDate, "yyyy년 M월 d일 (eee)", { locale: ko })}
              </p>
            </div>

            {selectedType === 'room' ? (
              // 연습실: 시간 선택
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[#3B342F] mb-2">
                      시작 시간
                    </label>
                    <select
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        setEndTime("");
                      }}
                      className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] focus:border-[#B98768] focus:outline-none"
                    >
                      <option value="">선택하세요</option>
                      {timeSlots.map((slot) => (
                        <option key={slot.time} value={slot.time} disabled={slot.disabled}>
                          {slot.time} {slot.disabled ? "(예약됨)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#3B342F] mb-2">
                      종료 시간
                    </label>
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={!startTime}
                      className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-[#3B342F] focus:border-[#B98768] focus:outline-none disabled:opacity-50"
                    >
                      <option value="">선택하세요</option>
                      {timeSlots
                        .filter((slot) => slot.time > startTime)
                        .map((slot) => (
                          <option key={slot.time} value={slot.time} disabled={slot.disabled}>
                            {slot.time} {slot.disabled ? "(예약됨)" : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {priceInfo && (
                  <div className="rounded-lg bg-[#f5ede6] border border-[#B98768]/20 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#6f655d]">
                        {getPriceTypeName(priceInfo.priceType)}
                      </span>
                      {priceInfo.isEvent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#B98768]/20 px-2 py-0.5 text-xs font-semibold text-[#B98768]">
                          <Sparkles className="w-3 h-3" />
                          이벤트 할인
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-[#B98768]">
                      {priceInfo.duration}시간 × {priceInfo.pricePerHour.toLocaleString("ko-KR")}P = {totalPoints.toLocaleString("ko-KR")}P
                    </p>
                    {priceInfo.isEvent && (
                      <p className="text-sm text-[#9b9189] mt-1">
                        <span className="line-through text-[#9b9189] text-sm">
                        {priceInfo.originalPrice.toLocaleString("ko-KR")}P
                      </span>
                      {" → "}
                      <span className="font-semibold text-[#B98768]">
                        {priceInfo.eventPrice.toLocaleString("ko-KR")}P
                      </span>
                      </p>
                    )}
                  </div>
                )}
              </>
            ) : (
              // 파티룸: 패키지 선택
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {(['day', 'night', 'allday'] as PartyRoomPackage[]).map((pkg) => (
                    <button
                      key={pkg}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`rounded-xl border-2 p-4 text-left transition-all ${
                        selectedPackage === pkg
                          ? 'border-[#B98768] bg-[#f5ede6]'
                          : 'border-[#D8CCBC] bg-white hover:bg-[#F7F3EB]'
                      }`}
                    >
                      <h3 className="text-lg font-bold text-[#3B342F] mb-2">
                        {pkg === 'day' && '낮 패키지'}
                        {pkg === 'night' && '야간 패키지'}
                        {pkg === 'allday' && '종일권'}
                      </h3>
                      <p className="text-sm text-[#6f655d] mb-2">
                        {PARTY_ROOM_PACKAGES[pkg].start} ~ {PARTY_ROOM_PACKAGES[pkg].end}
                      </p>
                      <p className="text-xs text-[#9b9189]">
                        ({PARTY_ROOM_PACKAGES[pkg].hours}시간)
                      </p>
                    </button>
                  ))}
                </div>

                {priceInfo && (
                  <div className="rounded-lg bg-[#f5ede6] border border-[#B98768]/20 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#6f655d]">
                        {priceInfo.packageName}
                      </span>
                      {priceInfo.isEvent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#B98768]/20 px-2 py-0.5 text-xs font-semibold text-[#B98768]">
                          <Sparkles className="w-3 h-3" />
                          오픈 이벤트
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-[#B98768]">
                      {totalPoints.toLocaleString("ko-KR")}원
                    </p>
                    {priceInfo.isEvent && (
                      <p className="text-sm text-[#9b9189] mt-1">
                        <span className="line-through text-[#9b9189]">
                          {priceInfo.originalPrice.toLocaleString("ko-KR")}원
                        </span>
                        {" → "}
                        <span className="font-semibold text-[#B98768]">
                          {priceInfo.eventPrice.toLocaleString("ko-KR")}원
                        </span>
                      </p>
                    )}
                    <p className="text-xs text-[#9b9189] mt-2 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      최대 10인 이용 가능 (추가 요금 없음)
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3: 확인 및 결제 */}
        {selectedDate && (
          (selectedType === 'room' && startTime && endTime) ||
          (selectedType === 'party-room' && selectedPackage)
        ) && (
          <div className="rounded-2xl border border-[#D8CCBC] bg-white p-6">
            <h2 className="text-xl font-bold text-[#3B342F] mb-6">
              3. 예약 확인
            </h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between py-2 border-b border-[#D8CCBC]">
                <span className="text-[#6f655d]">예약 유형</span>
                <span className="font-semibold text-[#3B342F]">
                  {selectedType === 'room' ? '연습실' : '파티룸'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#D8CCBC]">
                <span className="text-[#6f655d]">예약 날짜</span>
                <span className="font-semibold text-[#3B342F]">
                  {format(selectedDate, "yyyy년 M월 d일 (eee)", { locale: ko })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#D8CCBC]">
                <span className="text-[#6f655d]">이용 시간</span>
                <span className="font-semibold text-[#3B342F]">
                  {selectedType === 'room' ? (
                    `${startTime} ~ ${endTime}`
                  ) : (
                    `${priceInfo.packageName} (${priceInfo.packageTime})`
                  )}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#D8CCBC]">
                <span className="text-[#6f655d]">사용 포인트</span>
                <span className="font-bold text-[#B98768] text-lg">
                  {totalPoints.toLocaleString("ko-KR")}{selectedType === 'room' ? 'P' : '원'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#6f655d]">예약 후 잔액</span>
                <span className="font-semibold text-[#3B342F]">
                  {(userPoints - totalPoints).toLocaleString("ko-KR")}P
                </span>
              </div>
            </div>

            {/* 파티룸 성인 확인 체크박스 */}
            {selectedType === 'party-room' && (
              <div className="mb-6 rounded-lg bg-[#f5ede6] p-4">
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
            )}

            {totalPoints > userPoints && (
              <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700 mb-1">
                    포인트가 부족합니다
                  </p>
                  <p className="text-sm text-red-600">
                    {(totalPoints - userPoints).toLocaleString("ko-KR")}P가 부족합니다
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {totalPoints > userPoints ? (
                <button
                  onClick={() => router.push("/charge")}
                  className="w-full rounded-xl bg-[#B98768] px-6 py-4 text-base font-bold text-white transition-all hover:bg-[#a9785c] active:scale-95"
                >
                  포인트 충전하기
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || (selectedType === 'party-room' && !adultConfirmed)}
                  className="w-full rounded-xl bg-[#B98768] px-6 py-4 text-base font-bold text-white transition-all hover:bg-[#a9785c] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "예약 중..." : "예약 확정하기"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 성인 전용 모달 */}
      {showAdultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-2xl bg-white p-6 max-w-md">
            <h3 className="text-xl font-bold text-[#3B342F] mb-4">
              성인 전용 공간
            </h3>
            <p className="text-[#6f655d] mb-6">
              파티룸은 만 19세 이상 성인 회원만 예약할 수 있습니다.
            </p>
            <button
              onClick={() => setShowAdultModal(false)}
              className="w-full rounded-xl bg-[#B98768] px-6 py-3 font-bold text-white hover:bg-[#a9785c]"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 프로필 완성 모달 */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-2xl bg-white p-6 max-w-md">
            <h3 className="text-xl font-bold text-[#3B342F] mb-4">
              프로필 완성 필요
            </h3>
            <p className="text-[#6f655d] mb-6">
              예약을 위해 생년월일 정보가 필요합니다. 프로필을 완성해 주세요.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowProfileModal(false)}
                className="flex-1 rounded-xl border border-[#D8CCBC] px-6 py-3 font-bold text-[#3B342F] hover:bg-[#F7F3EB]"
              >
                취소
              </button>
              <button
                onClick={() => router.push("/onboarding/profile")}
                className="flex-1 rounded-xl bg-[#B98768] px-6 py-3 font-bold text-white hover:bg-[#a9785c]"
              >
                프로필 완성하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F7F3EB] py-20 flex items-center justify-center">
        <p className="text-[#6f655d]">로딩 중...</p>
      </div>
    }>
      <BookingContent />
    </Suspense>
  );
}
