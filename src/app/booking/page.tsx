"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calcPoints, getPriceType, calcDuration, isEventPeriod, getPriceTypeName } from "@/lib/pricing";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfToday } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Calendar, Sparkles, AlertCircle } from "lucide-react";

interface TimeSlot {
  time: string;
  disabled: boolean;
}

export default function BookingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  // Step 1: 날짜 선택
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Step 2: 시간 선택
  const [reservedSlots, setReservedSlots] = useState<{ start_time: string; end_time: string }[]>([]);
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  
  // Step 3: 예약 정보
  const [totalPoints, setTotalPoints] = useState(0);
  const [priceInfo, setPriceInfo] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

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

  // 시간 선택 시 요금 계산
  useEffect(() => {
    if (!selectedDate || !startTime || !endTime) {
      setTotalPoints(0);
      setPriceInfo(null);
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
  }, [selectedDate, startTime, endTime]);

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
    if (!selectedDate || !startTime || !endTime) {
      alert("날짜와 시간을 선택해주세요");
      return;
    }

    if (totalPoints > userPoints) {
      alert("포인트가 부족합니다");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/reservations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: format(selectedDate, "yyyy-MM-dd"),
          start_time: startTime,
          end_time: endTime,
        }),
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
            연습실 예약
          </h1>
          <p className="mt-3 text-[#6f655d]">
            날짜와 시간을 선택하고 예약하세요
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

        {/* Step 2: 시간 선택 */}
        {selectedDate && (
          <div className="mb-8 rounded-2xl border border-[#D8CCBC] bg-white p-6">
            <h2 className="text-xl font-bold text-[#3B342F] mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#B98768]" />
              2. 시간 선택
            </h2>

            <div className="mb-4">
              <p className="text-sm text-[#6f655d] mb-2">
                선택한 날짜: {format(selectedDate, "yyyy년 M월 d일 (eee)", { locale: ko })}
              </p>
            </div>

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
                    <span className="line-through">{priceInfo.originalPrice.toLocaleString("ko-KR")}P</span>
                    {" → "}
                    <span className="font-semibold text-[#B98768]">{priceInfo.eventPrice.toLocaleString("ko-KR")}P</span>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: 확인 및 결제 */}
        {selectedDate && startTime && endTime && (
          <div className="rounded-2xl border border-[#D8CCBC] bg-white p-6">
            <h2 className="text-xl font-bold text-[#3B342F] mb-6">
              3. 예약 확인
            </h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between py-2 border-b border-[#D8CCBC]">
                <span className="text-[#6f655d]">예약 날짜</span>
                <span className="font-semibold text-[#3B342F]">
                  {format(selectedDate, "yyyy년 M월 d일 (eee)", { locale: ko })}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#D8CCBC]">
                <span className="text-[#6f655d]">이용 시간</span>
                <span className="font-semibold text-[#3B342F]">
                  {startTime} ~ {endTime}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#D8CCBC]">
                <span className="text-[#6f655d]">사용 포인트</span>
                <span className="font-bold text-[#B98768] text-lg">
                  {totalPoints.toLocaleString("ko-KR")}P
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[#6f655d]">예약 후 잔액</span>
                <span className="font-semibold text-[#3B342F]">
                  {(userPoints - totalPoints).toLocaleString("ko-KR")}P
                </span>
              </div>
            </div>

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
                  disabled={submitting}
                  className="w-full rounded-xl bg-[#B98768] px-6 py-4 text-base font-bold text-white transition-all hover:bg-[#a9785c] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "예약 중..." : "예약 확정하기"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
