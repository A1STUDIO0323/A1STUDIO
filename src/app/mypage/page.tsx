"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { 
  Wallet, 
  Calendar, 
  User, 
  LogOut, 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

type Tab = "points" | "reservations" | "account";

interface PointTransaction {
  id: string;
  type: "charge" | "bonus" | "use" | "refund";
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

interface Reservation {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  points_used: number;
  status: "confirmed" | "cancelled" | "completed";
  created_at: string;
}

export default function MyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>("points");
  
  // 포인트 관련
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(true);
  
  // 예약 관련
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  useEffect(() => {
    const supabase = createClient();
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login?redirect=/mypage");
      } else {
        setUser(user);
        loadPointsData(user.id);
        loadReservations(user.id);
      }
    });
  }, [router]);

  const loadPointsData = async (userId: string) => {
    const supabase = createClient();
    
    // 포인트 잔액
    const { data: pointsData } = await supabase
      .from("user_points")
      .select("balance")
      .eq("user_id", userId)
      .single();
    
    setBalance(pointsData?.balance || 0);

    // 거래 내역
    const { data: transactionsData } = await supabase
      .from("point_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    
    setTransactions(transactionsData || []);
    setLoadingPoints(false);
  };

  const loadReservations = async (userId: string) => {
    const supabase = createClient();
    
    const { data } = await supabase
      .from("reservations")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("start_time", { ascending: false });
    
    setReservations(data || []);
    setLoadingReservations(false);
  };

  const handleCancelReservation = async () => {
    if (!selectedReservation) return;

    setCancellingId(selectedReservation.id);

    try {
      const response = await fetch("/api/reservations/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservation_id: selectedReservation.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "취소에 실패했습니다");
      }

      alert("예약이 취소되었습니다");
      setShowCancelModal(false);
      setSelectedReservation(null);
      
      // 데이터 새로고침
      if (user) {
        loadPointsData(user.id);
        loadReservations(user.id);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "취소에 실패했습니다");
    } finally {
      setCancellingId(null);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const canCancelReservation = (reservation: Reservation): boolean => {
    if (reservation.status !== "confirmed") return false;
    
    const reservationDateTime = new Date(`${reservation.date}T${reservation.start_time}`);
    const now = new Date();
    const hoursUntilReservation = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilReservation >= 2;
  };

  const getTransactionColor = (type: PointTransaction["type"]) => {
    switch (type) {
      case "charge":
      case "bonus":
        return "text-green-600";
      case "use":
        return "text-[#B98768]";
      case "refund":
        return "text-blue-600";
      default:
        return "text-[#3B342F]";
    }
  };

  const getTransactionIcon = (type: PointTransaction["type"]) => {
    switch (type) {
      case "charge":
      case "bonus":
        return <TrendingUp className="w-4 h-4" />;
      case "use":
        return <TrendingDown className="w-4 h-4" />;
      case "refund":
        return <RefreshCw className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTransactionLabel = (type: PointTransaction["type"]) => {
    switch (type) {
      case "charge":
        return "충전";
      case "bonus":
        return "보너스";
      case "use":
        return "사용";
      case "refund":
        return "환불";
      default:
        return type;
    }
  };

  const getStatusBadge = (status: Reservation["status"]) => {
    switch (status) {
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
            <CheckCircle className="w-3 h-3" />
            확정
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
            <XCircle className="w-3 h-3" />
            취소
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
            <CheckCircle className="w-3 h-3" />
            완료
          </span>
        );
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F7F3EB] flex items-center justify-center">
        <p className="text-[#6f655d]">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-extrabold text-[#3B342F]">마이페이지</h1>
          <p className="mt-2 text-[#6f655d]">{user.email}</p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="mb-8 border-b border-[#D8CCBC]">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("points")}
              className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors ${
                activeTab === "points"
                  ? "border-b-2 border-[#B98768] text-[#B98768]"
                  : "text-[#6f655d] hover:text-[#3B342F]"
              }`}
            >
              <Wallet className="w-5 h-5" />
              포인트 현황
            </button>
            <button
              onClick={() => setActiveTab("reservations")}
              className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors ${
                activeTab === "reservations"
                  ? "border-b-2 border-[#B98768] text-[#B98768]"
                  : "text-[#6f655d] hover:text-[#3B342F]"
              }`}
            >
              <Calendar className="w-5 h-5" />
              예약 내역
            </button>
            <button
              onClick={() => setActiveTab("account")}
              className={`flex items-center gap-2 px-6 py-3 font-semibold transition-colors ${
                activeTab === "account"
                  ? "border-b-2 border-[#B98768] text-[#B98768]"
                  : "text-[#6f655d] hover:text-[#3B342F]"
              }`}
            >
              <User className="w-5 h-5" />
              계정 정보
            </button>
          </div>
        </div>

        {/* 탭 1: 포인트 현황 */}
        {activeTab === "points" && (
          <div className="space-y-6">
            {/* 잔액 카드 */}
            <div className="rounded-2xl border border-[#D8CCBC] bg-white p-8 text-center">
              <p className="text-sm text-[#9b9189] mb-2">현재 보유 포인트</p>
              <p className="text-5xl font-bold text-[#B98768] mb-6">
                {balance.toLocaleString("ko-KR")}
                <span className="text-2xl ml-1">P</span>
              </p>
              <Link
                href="/charge"
                className="inline-flex items-center gap-2 rounded-full bg-[#B98768] px-8 py-3 font-bold text-white transition-all hover:bg-[#a9785c] active:scale-95"
              >
                <CreditCard className="w-5 h-5" />
                충전하기
              </Link>
            </div>

            {/* 거래 내역 */}
            <div className="rounded-2xl border border-[#D8CCBC] bg-white p-6">
              <h2 className="text-xl font-bold text-[#3B342F] mb-4">
                포인트 거래 내역
              </h2>

              {loadingPoints ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse h-16 bg-[#EFE7DA] rounded-lg" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-center text-[#9b9189] py-8">거래 내역이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-[#D8CCBC] hover:bg-[#F7F3EB] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`${getTransactionColor(tx.type)}`}>
                          {getTransactionIcon(tx.type)}
                        </div>
                        <div>
                          <p className="font-semibold text-[#3B342F]">
                            {tx.description}
                          </p>
                          <p className="text-sm text-[#9b9189]">
                            {format(new Date(tx.created_at), "yyyy.MM.dd HH:mm", { locale: ko })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${getTransactionColor(tx.type)}`}>
                          {tx.type === "use" ? "-" : "+"}{Math.abs(tx.amount).toLocaleString("ko-KR")}P
                        </p>
                        <p className="text-sm text-[#9b9189]">
                          잔액: {tx.balance_after.toLocaleString("ko-KR")}P
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 탭 2: 예약 내역 */}
        {activeTab === "reservations" && (
          <div className="space-y-6">
            {loadingReservations ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-32 bg-white rounded-2xl" />
                ))}
              </div>
            ) : reservations.length === 0 ? (
              <div className="rounded-2xl border border-[#D8CCBC] bg-white p-12 text-center">
                <Calendar className="w-16 h-16 text-[#D8CCBC] mx-auto mb-4" />
                <p className="text-[#9b9189] mb-6">예약 내역이 없습니다</p>
                <Link
                  href="/booking"
                  className="inline-flex items-center gap-2 rounded-full bg-[#B98768] px-6 py-3 font-bold text-white transition-all hover:bg-[#a9785c]"
                >
                  예약하러 가기
                </Link>
              </div>
            ) : (
              reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className="rounded-2xl border border-[#D8CCBC] bg-white p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-[#3B342F]">
                          {format(new Date(reservation.date), "yyyy년 M월 d일 (eee)", { locale: ko })}
                        </h3>
                        {getStatusBadge(reservation.status)}
                      </div>
                      <div className="flex items-center gap-2 text-[#6f655d]">
                        <Clock className="w-4 h-4" />
                        <span>
                          {reservation.start_time} ~ {reservation.end_time} ({reservation.duration_hours}시간)
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-[#9b9189] mb-1">사용 포인트</p>
                      <p className="text-2xl font-bold text-[#B98768]">
                        {reservation.points_used.toLocaleString("ko-KR")}P
                      </p>
                    </div>
                  </div>

                  {canCancelReservation(reservation) && (
                    <div className="pt-4 border-t border-[#D8CCBC]">
                      <button
                        onClick={() => {
                          setSelectedReservation(reservation);
                          setShowCancelModal(true);
                        }}
                        disabled={cancellingId === reservation.id}
                        className="w-full rounded-lg border border-red-300 px-4 py-2 font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancellingId === reservation.id ? "취소 중..." : "예약 취소"}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* 탭 3: 계정 정보 */}
        {activeTab === "account" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#D8CCBC] bg-white p-6">
              <h2 className="text-xl font-bold text-[#3B342F] mb-4">계정 정보</h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[#9b9189] mb-1">이메일</p>
                  <p className="text-lg font-semibold text-[#3B342F]">{user.email}</p>
                </div>

                <div>
                  <p className="text-sm text-[#9b9189] mb-1">가입일</p>
                  <p className="text-lg font-semibold text-[#3B342F]">
                    {format(new Date(user.created_at), "yyyy년 M월 d일", { locale: ko })}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#D8CCBC] px-6 py-4 font-semibold text-[#3B342F] transition-all hover:border-red-300 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              로그아웃
            </button>
          </div>
        )}
      </div>

      {/* 취소 확인 모달 */}
      {showCancelModal && selectedReservation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="max-w-md w-full rounded-2xl border border-[#D8CCBC] bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              <h3 className="text-xl font-bold text-[#3B342F]">예약 취소</h3>
            </div>

            <p className="text-[#6f655d] mb-2">
              다음 예약을 취소하시겠습니까?
            </p>

            <div className="rounded-lg bg-[#F7F3EB] p-4 mb-6">
              <p className="text-sm text-[#9b9189] mb-1">예약 날짜 및 시간</p>
              <p className="font-semibold text-[#3B342F] mb-3">
                {format(new Date(selectedReservation.date), "yyyy년 M월 d일 (eee)", { locale: ko })}<br />
                {selectedReservation.start_time} ~ {selectedReservation.end_time}
              </p>
              <p className="text-sm text-[#9b9189] mb-1">환불 포인트</p>
              <p className="text-lg font-bold text-[#B98768]">
                {selectedReservation.points_used.toLocaleString("ko-KR")}P
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 rounded-lg border border-[#D8CCBC] px-4 py-3 font-semibold text-[#3B342F] transition-colors hover:bg-[#F7F3EB]"
              >
                닫기
              </button>
              <button
                onClick={handleCancelReservation}
                disabled={cancellingId !== null}
                className="flex-1 rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancellingId ? "처리 중..." : "예약 취소"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
