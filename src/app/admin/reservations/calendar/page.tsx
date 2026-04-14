"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, User, Phone, Package, DollarSign, Filter, RefreshCw } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from "date-fns";
import { ko } from "date-fns/locale";

interface Reservation {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  type: string;
  source: string;
  room_name: string;
  status: string;
  guest_name?: string;
  guest_phone?: string;
  headcount?: number;
  points_used?: number;
  payment_method?: string;
  memo?: string;
  package_type?: string;
  platform?: string;
}

interface Stats {
  total: number;
  practiceRoom: number;
  partyRoom: number;
  external: number;
}

export default function AdminReservationCalendarPage() {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reservationsByDate, setReservationsByDate] = useState<Record<string, Reservation[]>>({});
  const [stats, setStats] = useState<Stats>({ total: 0, practiceRoom: 0, partyRoom: 0, external: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all"); // 'all', 'practice-room', 'party-room', 'external'

  useEffect(() => {
    fetchReservations();
  }, [currentMonth]);

  const fetchReservations = async () => {
    setIsLoading(true);
    try {
      const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");

      const response = await fetch(`/api/admin/reservations/calendar?start=${start}&end=${end}`);
      
      if (response.status === 403) {
        alert("관리자 권한이 필요합니다");
        router.push("/");
        return;
      }

      if (!response.ok) {
        throw new Error("예약 조회 실패");
      }

      const data = await response.json();
      setReservations(data.reservations || []);
      setReservationsByDate(data.reservationsByDate || {});
      setStats(data.stats || { total: 0, practiceRoom: 0, partyRoom: 0, external: 0 });
    } catch (error) {
      console.error("예약 조회 오류:", error);
      alert("예약 조회에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const firstDayOfWeek = startOfMonth(currentMonth).getDay();
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const getReservationsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayReservations = reservationsByDate[dateStr] || [];
    
    if (filter === "all") {
      return dayReservations;
    }
    
    return dayReservations.filter((r) => {
      if (filter === "practice-room") return r.type === "practice-room";
      if (filter === "party-room") return r.type === "party-room";
      if (filter === "external") return r.source === "external";
      return true;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
      case "CONFIRMED":
        return "bg-green-100 text-green-800 border-green-300";
      case "HOLD":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "practice-room":
        return "bg-blue-50 border-blue-200";
      case "party-room":
        return "bg-purple-50 border-purple-200";
      default:
        return "bg-orange-50 border-orange-200";
    }
  };

  const selectedDateReservations = selectedDate ? reservationsByDate[selectedDate] || [] : [];

  return (
    <div className="min-h-screen bg-[#F5F0E8] py-8">
      <div className="mx-auto max-w-7xl px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#3B342F] mb-2">예약 총괄 관리</h1>
          <p className="text-[#6f655d]">모든 예약을 한눈에 확인하고 관리합니다</p>
        </div>

        {/* 통계 카드 */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 border border-[#D8CCBC]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6f655d] mb-1">전체 예약</p>
                <p className="text-2xl font-bold text-[#3B342F]">{stats.total}</p>
              </div>
              <Calendar className="w-10 h-10 text-[#B98768]" />
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 border border-[#D8CCBC]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6f655d] mb-1">연습실</p>
                <p className="text-2xl font-bold text-blue-600">{stats.practiceRoom}</p>
              </div>
              <Package className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 border border-[#D8CCBC]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6f655d] mb-1">파티룸</p>
                <p className="text-2xl font-bold text-purple-600">{stats.partyRoom}</p>
              </div>
              <Package className="w-10 h-10 text-purple-600" />
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 border border-[#D8CCBC]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#6f655d] mb-1">외부 플랫폼</p>
                <p className="text-2xl font-bold text-orange-600">{stats.external}</p>
              </div>
              <DollarSign className="w-10 h-10 text-orange-600" />
            </div>
          </div>
        </div>

        {/* 필터 및 컨트롤 */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-[#6f655d]" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-[#D8CCBC] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B98768]"
            >
              <option value="all">전체 보기</option>
              <option value="practice-room">연습실만</option>
              <option value="party-room">파티룸만</option>
              <option value="external">외부 플랫폼만</option>
            </select>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevMonth}
              className="rounded-lg bg-white border border-[#D8CCBC] px-4 py-2 text-sm font-medium hover:bg-[#EFE7DA] transition"
            >
              이전 달
            </button>
            <button
              onClick={handleToday}
              className="rounded-lg bg-[#B98768] px-4 py-2 text-sm font-medium text-white hover:bg-[#a67659] transition"
            >
              오늘
            </button>
            <button
              onClick={handleNextMonth}
              className="rounded-lg bg-white border border-[#D8CCBC] px-4 py-2 text-sm font-medium hover:bg-[#EFE7DA] transition"
            >
              다음 달
            </button>
            <button
              onClick={fetchReservations}
              disabled={isLoading}
              className="rounded-lg bg-white border border-[#D8CCBC] p-2 hover:bg-[#EFE7DA] transition disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* 현재 월 표시 */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-[#3B342F]">
            {format(currentMonth, "yyyy년 M월", { locale: ko })}
          </h2>
        </div>

        {/* 캘린더 */}
        <div className="mb-8 rounded-2xl bg-white p-6 border border-[#D8CCBC]">
          {/* 요일 헤더 */}
          <div className="mb-4 grid grid-cols-7 gap-2">
            {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
              <div
                key={day}
                className={`text-center text-sm font-bold ${
                  idx === 0 ? "text-red-600" : idx === 6 ? "text-blue-600" : "text-[#3B342F]"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-2">
            {emptyDays.map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square" />
            ))}
            {daysInMonth.map((day) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayReservations = getReservationsForDate(day);
              const isSelected = selectedDate === dateStr;
              const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`aspect-square rounded-lg border p-2 text-left transition ${
                    isSelected
                      ? "border-[#B98768] bg-[#B98768]/10 ring-2 ring-[#B98768]"
                      : "border-[#D8CCBC] hover:bg-[#EFE7DA]"
                  } ${isToday ? "font-bold" : ""}`}
                >
                  <div className="mb-1 text-sm">{format(day, "d")}</div>
                  {dayReservations.length > 0 && (
                    <div className="space-y-0.5">
                      {dayReservations.slice(0, 3).map((r) => (
                        <div
                          key={r.id}
                          className={`rounded px-1 py-0.5 text-xs truncate border ${getTypeColor(r.type)}`}
                        >
                          {r.start_time.slice(0, 5)}
                        </div>
                      ))}
                      {dayReservations.length > 3 && (
                        <div className="text-xs text-[#6f655d] text-center">
                          +{dayReservations.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 선택한 날짜의 예약 상세 */}
        {selectedDate && (
          <div className="rounded-2xl bg-white p-6 border border-[#D8CCBC]">
            <h3 className="text-xl font-bold text-[#3B342F] mb-4">
              {format(new Date(selectedDate), "yyyy년 M월 d일 (EEEE)", { locale: ko })} 예약 목록
            </h3>
            
            {selectedDateReservations.length === 0 ? (
              <p className="text-center text-[#6f655d] py-8">이 날짜에는 예약이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {selectedDateReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className={`rounded-lg border p-4 ${getTypeColor(reservation.type)}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-[#3B342F]">{reservation.room_name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(reservation.status)}`}>
                            {reservation.status}
                          </span>
                          {reservation.source === "external" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300">
                              외부
                            </span>
                          )}
                        </div>
                        {reservation.package_type && (
                          <p className="text-sm text-[#6f655d]">
                            {reservation.package_type === "day" && "낮 패키지"}
                            {reservation.package_type === "night" && "야간 패키지"}
                            {reservation.package_type === "allday" && "종일 패키지"}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-[#3B342F] font-medium">
                          <Clock className="w-4 h-4" />
                          <span>{reservation.start_time} - {reservation.end_time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm">
                      {reservation.guest_name && (
                        <div className="flex items-center gap-2 text-[#6f655d]">
                          <User className="w-4 h-4" />
                          <span>{reservation.guest_name}</span>
                          {reservation.headcount && <span>({reservation.headcount}명)</span>}
                        </div>
                      )}
                      {reservation.guest_phone && (
                        <div className="flex items-center gap-2 text-[#6f655d]">
                          <Phone className="w-4 h-4" />
                          <span>{reservation.guest_phone}</span>
                        </div>
                      )}
                      {reservation.points_used && (
                        <div className="flex items-center gap-2 text-[#6f655d]">
                          <DollarSign className="w-4 h-4" />
                          <span>{reservation.points_used.toLocaleString()}P</span>
                          {reservation.payment_method && (
                            <span className="text-xs">({reservation.payment_method})</span>
                          )}
                        </div>
                      )}
                      {reservation.memo && (
                        <div className="text-[#6f655d] mt-2 p-2 bg-white/50 rounded">
                          <p className="text-xs">메모: {reservation.memo}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
