"use client";

import { useState, useEffect, Suspense, type MouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  calcHourlyMixed,
  getPriceTypeName,
  calcPartyRoomPoints,
  calcStudioPackagePoints,
  PartyRoomPackage,
  PARTY_ROOM_PACKAGES,
  StudioPackage,
  STUDIO_PACKAGES,
} from "@/lib/pricing";
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isBefore, startOfToday } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Clock, Calendar, Sparkles, AlertCircle, Users, Coins, CreditCard, Check } from "lucide-react";

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
  // 연습실 모드: 'hourly' | 'day' | 'night' | 'allday'
  const [roomMode, setRoomMode] = useState<'hourly' | StudioPackage>('hourly');
  
  // Step 3: 예약 정보
  const [totalPoints, setTotalPoints] = useState(0);
  const [priceInfo, setPriceInfo] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"points" | "kakaopay">("points");

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
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              console.warn('[Booking] 포인트 조회 실패:', error);
            }
            setUserPoints(data?.balance || 0);
            setLoading(false);
          });
      }
    });
  }, [router]);

  const handlePartyRoomClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/members/profile", { cache: "no-store" });
      const data = await res.json();

      if (!data.success || !data.profile) {
        window.location.href = "/login?redirect=/party-room/booking";
        return;
      }

      const birthYear = data.profile.birthYear;

      if (!birthYear) {
        alert(
          "파티룸 예약을 위해 출생연도 정보가 필요합니다.\n출생연도를 입력해 주세요."
        );
        window.location.href =
          "/onboarding/profile?returnTo=/party-room/booking";
        return;
      }

      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;
      const isAdult = age >= 19;

      if (!isAdult) {
        alert("파티룸은 만 19세 이상 성인 회원만 예약할 수 있습니다.");
        return;
      }

      window.location.href = "/party-room/booking";
    } catch (error) {
      console.error("프로필 조회 에러:", error);
      alert("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  // 날짜 선택 시 예약된 시간 조회 및 시간 초기화
  useEffect(() => {
    if (!selectedDate) return;

    // 날짜 변경 시: 시간제 모드면 시간 초기화, 패키지 모드면 유지
    if (roomMode === 'hourly') {
      setStartTime("");
      setEndTime("");
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    fetch(`/api/reservations/available?date=${dateStr}`)
      .then((res) => res.json())
      .then((data) => {
        setReservedSlots(data.reserved || []);
      })
      .catch((err) => console.error("예약 조회 오류:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // 모드 변경 시 시간 선택 초기화
  useEffect(() => {
    if (selectedType !== 'room') return;
    if (roomMode === 'hourly') {
      setStartTime("");
      setEndTime("");
    } else {
      const pkg = STUDIO_PACKAGES[roomMode];
      setStartTime(pkg.start);
      setEndTime(pkg.end);
    }
  }, [selectedType, roomMode]);

  // 요금 계산 (연습실 — 시간제 또는 패키지)
  useEffect(() => {
    if (selectedType !== 'room' || !selectedDate) {
      if (selectedType === 'room') {
        setTotalPoints(0);
        setPriceInfo(null);
      }
      return;
    }

    if (roomMode === 'hourly') {
      if (!startTime || !endTime) {
        setTotalPoints(0);
        setPriceInfo(null);
        return;
      }
      const pricing = calcHourlyMixed(selectedDate, startTime, endTime);
      const points = pricing.isEvent ? pricing.eventPrice : pricing.originalPrice;
      setTotalPoints(points);
      setPriceInfo({
        kind: 'hourly',
        ...pricing,
        finalPrice: points,
      });
    } else {
      // 연습실 패키지
      const pkg = STUDIO_PACKAGES[roomMode];
      const pricing = calcStudioPackagePoints(selectedDate, roomMode);
      const points = pricing.isEvent ? pricing.eventPrice : pricing.originalPrice;
      setTotalPoints(points);
      setPriceInfo({
        kind: 'studio-package',
        ...pricing,
        packageName: pkg.label,
        packageTime: `${pkg.start} ~ ${pkg.end}`,
        hours: pkg.hours,
        finalPrice: points,
      });
    }
  }, [selectedType, selectedDate, startTime, endTime, roomMode]);

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
      packageName: selectedPackage === 'day' ? '데이 패키지' :
                   selectedPackage === 'night' ? '나잇 패키지' : '올데이 패키지',
      packageTime: PARTY_ROOM_PACKAGES[selectedPackage].start + ' ~ ' + PARTY_ROOM_PACKAGES[selectedPackage].end,
      finalPrice: points,
    });
  }, [selectedType, selectedDate, selectedPackage]);

  // 달력 날짜 생성
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // 첫 날의 요일 (0: 일요일 ~ 6: 토요일)
  const firstDayOfWeek = monthStart.getDay();
  
  // 빈 칸 배열 생성 (첫 날 이전)
  const emptyDays = Array(firstDayOfWeek).fill(null);

  // 시간 슬롯 생성 (1시간 단위)
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const now = new Date();
    const isSelectedToday = selectedDate && format(selectedDate, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");
    const currentHour = now.getHours();
    
    for (let hour = 0; hour < 24; hour++) {
      const time = `${hour.toString().padStart(2, "0")}:00`;
      
      // 예약된 시간인지 체크
      const isReserved = reservedSlots.some((slot) => {
        const slotStart = slot.start_time;
        const slotEnd = slot.end_time;
        return time >= slotStart && time < slotEnd;
      });
      
      // 과거 시간인지 체크 (오늘 날짜인 경우만)
      let isPastTime = false;
      if (isSelectedToday) {
        if (hour <= currentHour) {
          isPastTime = true;
        }
      }
      
      slots.push({ time, disabled: isReserved || isPastTime });
    }
    return slots;
  };

  const timeSlots = selectedDate ? generateTimeSlots() : [];

  const handlePointsReservation = async () => {
    if (!selectedDate) {
      alert("날짜를 선택해주세요");
      return;
    }

    if (selectedType === "room" && roomMode === 'hourly' && (!startTime || !endTime)) {
      alert("시간을 선택해주세요");
      return;
    }

    if (selectedType === "party-room" && !selectedPackage) {
      alert("패키지를 선택해주세요");
      return;
    }

    if (selectedType === "party-room" && !adultConfirmed) {
      alert("성인 확인 체크박스를 선택해주세요");
      return;
    }

    if (totalPoints > userPoints) {
      alert("포인트가 부족합니다");
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        date: format(selectedDate, "yyyy-MM-dd"),
        reservation_type: selectedType,
      };

      if (selectedType === "room") {
        if (roomMode === 'hourly') {
          payload.start_time = startTime;
          payload.end_time = endTime;
        } else {
          const pkg = STUDIO_PACKAGES[roomMode];
          payload.start_time = pkg.start;
          payload.end_time = pkg.end;
          payload.package_type = roomMode;
        }
      } else {
        payload.package_type = selectedPackage;
        const pkg = PARTY_ROOM_PACKAGES[selectedPackage!];
        payload.start_time = pkg.start;
        payload.end_time = pkg.end;
        payload.headcount = 10;
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

      router.push(
        `/booking/complete?id=${data.reservation_id}&points=${data.points_used}`
      );
    } catch (error) {
      console.error("예약 오류:", error);
      alert(error instanceof Error ? error.message : "예약에 실패했습니다");
      setSubmitting(false);
    }
  };

  const handleKakaoPayReservation = async () => {
    if (!selectedDate) {
      alert("날짜를 선택해주세요");
      return;
    }
    if (roomMode === 'hourly' && (!startTime || !endTime)) {
      alert("시간을 선택해주세요");
      return;
    }

    setSubmitting(true);
    try {
      const kakaoBody: Record<string, unknown> = {
        date: format(selectedDate, "yyyy-MM-dd"),
      };
      if (roomMode === 'hourly') {
        kakaoBody.startTime = startTime;
        kakaoBody.endTime = endTime;
      } else {
        const pkg = STUDIO_PACKAGES[roomMode];
        kakaoBody.startTime = pkg.start;
        kakaoBody.endTime = pkg.end;
        kakaoBody.packageType = roomMode;
      }

      const response = await fetch("/api/reservations/payments/kakao/ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kakaoBody),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && typeof data.retryAfter === "number") {
          const retryMinutes = Math.max(1, Math.ceil(data.retryAfter / 60));
          alert(
            `이미 진행 중인 결제가 있습니다.\n\n` +
              `약 ${retryMinutes}분 후 다시 시도해 주세요.\n` +
              `(또는 페이지를 새로고침한 뒤 다시 시도해 주세요)`
          );
        } else {
          alert(data.error || "결제 준비에 실패했습니다");
        }
        setSubmitting(false);
        return;
      }

      const isMobile =
        typeof navigator !== "undefined" &&
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const redirect = isMobile
        ? data.next_redirect_mobile_url || data.redirect_url
        : data.redirect_url || data.next_redirect_pc_url;

      if (!redirect) {
        throw new Error("결제 URL을 받지 못했습니다");
      }

      window.location.href = redirect;
    } catch (error) {
      console.error("[연습실 카카오페이] 오류:", error);
      alert(
        error instanceof Error
          ? error.message
          : "결제 요청 중 오류가 발생했습니다"
      );
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedType === "room" && paymentMethod === "kakaopay") {
      await handleKakaoPayReservation();
      return;
    }
    await handlePointsReservation();
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
            type="button"
            onClick={handlePartyRoomClick}
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
            {/* 첫 날 이전 빈 칸 */}
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} className="aspect-square" />
            ))}
            {/* 실제 날짜 */}
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
              // 연습실: 시간제 / 패키지 선택
              <>
                {/* 모드 선택 */}
                <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([
                    { id: 'hourly',  label: '시간제',        sub: '1시간부터' },
                    { id: 'day',     label: '데이 패키지',   sub: '10:00~17:00' },
                    { id: 'night',   label: '나잇 패키지',   sub: '00:00~07:00' },
                    { id: 'allday',  label: '올데이 패키지', sub: '10:00~22:00' },
                  ] as const).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRoomMode(m.id as 'hourly' | StudioPackage)}
                      className={`rounded-xl border-2 p-3 text-center transition-all ${
                        roomMode === m.id
                          ? 'border-[#B98768] bg-[#f5ede6]'
                          : 'border-[#D8CCBC] bg-white hover:bg-[#F7F3EB]'
                      }`}
                    >
                      <div className="font-semibold text-sm text-[#3B342F]">{m.label}</div>
                      <div className="text-xs text-[#9b9189] mt-0.5">{m.sub}</div>
                    </button>
                  ))}
                </div>

                {roomMode === 'hourly' && (
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
                          {slot.time} {slot.disabled ? "(예약됨 또는 지난 시간)" : ""}
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
                            {slot.time} {slot.disabled ? "(예약됨 또는 지난 시간)" : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {priceInfo && priceInfo.kind === 'hourly' && (
                  <div className="rounded-lg bg-[#f5ede6] border border-[#B98768]/20 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#6f655d]">
                        {priceInfo.duration}시간 이용
                      </span>
                      {priceInfo.isEvent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#B98768]/20 px-2 py-0.5 text-xs font-semibold text-[#B98768]">
                          <Sparkles className="w-3 h-3" />
                          이벤트 할인
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 mb-2 text-sm text-[#6f655d]">
                      {priceInfo.breakdown.map((seg: { priceType: string; hours: number; originalPrice: number; eventPrice: number }, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span>{getPriceTypeName(seg.priceType as never)} {seg.hours}시간</span>
                          <span className="font-medium">
                            {(priceInfo.isEvent ? seg.eventPrice : seg.originalPrice).toLocaleString("ko-KR")}P
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="text-2xl font-bold text-[#B98768] mt-2">
                      합계 {totalPoints.toLocaleString("ko-KR")}P
                    </p>
                    {priceInfo.isEvent && (
                      <p className="text-sm text-[#9b9189] mt-1">
                        <span className="line-through text-[#9b9189]">
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
                )}

                {roomMode !== 'hourly' && priceInfo && priceInfo.kind === 'studio-package' && (
                  <div className="rounded-lg bg-[#f5ede6] border border-[#B98768]/20 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[#6f655d]">
                        {priceInfo.packageName} · {priceInfo.dayType === 'weekend' ? '주말·공휴일' : '평일'} · {priceInfo.packageTime}
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
                    <p className="text-xs text-[#9b9189] mt-2">
                      기본 포함 인원 8인 · 기준 인원 초과 시 사전 문의
                    </p>
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
                        {pkg === 'day' && '데이 패키지'}
                        {pkg === 'night' && '나잇 패키지'}
                        {pkg === 'allday' && '올데이 패키지'}
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
                      기본 포함 인원 10인 · 기준 인원 초과 시 사전 문의
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3: 확인 및 결제 */}
        {selectedDate && priceInfo && (
          (selectedType === 'room' && roomMode === 'hourly' && startTime && endTime) ||
          (selectedType === 'room' && roomMode !== 'hourly') ||
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
                  {selectedType === 'room' && roomMode === 'hourly' && (
                    `${startTime} ~ ${endTime}`
                  )}
                  {selectedType === 'room' && roomMode !== 'hourly' && (
                    `${STUDIO_PACKAGES[roomMode].label} (${STUDIO_PACKAGES[roomMode].start} ~ ${STUDIO_PACKAGES[roomMode].end})`
                  )}
                  {selectedType === 'party-room' && (
                    `${priceInfo.packageName} (${priceInfo.packageTime})`
                  )}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-[#D8CCBC]">
                <span className="text-[#6f655d]">
                  {selectedType === "room" && paymentMethod === "kakaopay"
                    ? "결제 금액"
                    : "사용 포인트"}
                </span>
                <span className="font-bold text-[#B98768] text-lg">
                  {totalPoints.toLocaleString("ko-KR")}
                  {selectedType === "room" && paymentMethod === "kakaopay"
                    ? "원"
                    : selectedType === "room"
                      ? "P"
                      : "원"}
                </span>
              </div>
              {(selectedType === "party-room" ||
                (selectedType === "room" && paymentMethod === "points")) && (
                <div className="flex justify-between py-2">
                  <span className="text-[#6f655d]">예약 후 잔액</span>
                  <span className="font-semibold text-[#3B342F]">
                    {(userPoints - totalPoints).toLocaleString("ko-KR")}P
                  </span>
                </div>
              )}
            </div>

            {selectedType === "room" && (
              <div className="mb-6 space-y-4">
                <h3 className="font-semibold text-lg text-[#3B342F]">
                  결제 수단 선택
                </h3>
                <div className="grid gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("points")}
                    className={`p-4 border-2 rounded-xl transition-all text-left ${
                      paymentMethod === "points"
                        ? "border-[#B98768] bg-[#B98768]/5"
                        : "border-[#D8CCBC] hover:border-[#B98768]/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Coins className="w-5 h-5 text-[#B98768] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[#3B342F]">
                          포인트 결제
                        </div>
                        <div className="text-sm text-[#6f655d]">
                          현재 잔액: {userPoints.toLocaleString("ko-KR")}P
                        </div>
                      </div>
                      {paymentMethod === "points" && (
                        <Check className="w-5 h-5 text-[#B98768] shrink-0" />
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("kakaopay")}
                    className={`p-4 border-2 rounded-xl transition-all text-left ${
                      paymentMethod === "kakaopay"
                        ? "border-[#B98768] bg-[#B98768]/5"
                        : "border-[#D8CCBC] hover:border-[#B98768]/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-[#B98768] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[#3B342F]">
                          카카오페이
                        </div>
                        <div className="text-sm text-[#6f655d]">
                          신용/체크카드 및 카카오페이머니
                        </div>
                      </div>
                      {paymentMethod === "kakaopay" && (
                        <Check className="w-5 h-5 text-[#B98768] shrink-0" />
                      )}
                    </div>
                  </button>
                </div>
              </div>
            )}

            {selectedType === "room" && (
              <div className="mb-6 rounded-xl border border-[#D8CCBC] bg-[#EFE7DA] p-6">
                <h3 className="text-lg font-semibold text-[#3B342F] mb-4">
                  예약 전 안내
                </h3>
                <div className="space-y-3 text-sm text-[#6f655d]">
                  <div>
                    <strong className="text-[#3B342F]">환불 규정</strong>
                    <ul className="mt-2 space-y-1 ml-4 list-disc">
                      <li>이용 3일 전: 100% 환불</li>
                      <li>이용 2일 전: 50% 환불</li>
                      <li>이용 전날: 취소 불가</li>
                      <li>이용 당일: 취소 불가</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-[#3B342F]">예약 확정</strong>
                    <p className="mt-1">
                      {paymentMethod === "kakaopay"
                        ? "카카오페이 결제가 완료되면 예약이 확정되며, 예약 확인 문자가 발송됩니다."
                        : "포인트 결제 즉시 예약이 확정되며, 예약 확인 문자가 발송됩니다."}
                    </p>
                  </div>
                  <div>
                    <strong className="text-[#3B342F]">예약 변경</strong>
                    <p className="mt-1">
                      예약 변경은 취소 후 재예약으로 진행됩니다. (환불 규정 적용)
                    </p>
                  </div>
                </div>
              </div>
            )}

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

            {selectedType === "room" &&
              paymentMethod === "points" &&
              totalPoints > userPoints && (
                <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-700 mb-1">
                      포인트가 부족합니다
                    </p>
                    <p className="text-sm text-red-600">
                      {(totalPoints - userPoints).toLocaleString("ko-KR")}P가
                      부족합니다
                    </p>
                  </div>
                </div>
              )}

            <div className="space-y-3">
              {selectedType === "room" &&
              paymentMethod === "points" &&
              totalPoints > userPoints ? (
                <button
                  type="button"
                  onClick={() => router.push("/charge")}
                  className="w-full rounded-xl bg-[#B98768] px-6 py-4 text-base font-bold text-white transition-all hover:bg-[#a9785c] active:scale-95"
                >
                  포인트 충전하기
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    submitting ||
                    (selectedType === "party-room" && !adultConfirmed)
                  }
                  className="w-full rounded-xl bg-[#B98768] px-6 py-4 text-base font-bold text-white transition-all hover:bg-[#a9785c] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? "처리 중..."
                    : selectedType === "room" && paymentMethod === "kakaopay"
                      ? `카카오페이로 결제하기 (${totalPoints.toLocaleString("ko-KR")}원)`
                      : selectedType === "room"
                        ? `포인트로 예약하기 (${totalPoints.toLocaleString("ko-KR")}P)`
                        : "예약 확정하기"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
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
