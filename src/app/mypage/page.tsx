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
  duration_hours?: number;
  points_used: number;
  status: "confirmed" | "cancelled" | "completed";
  created_at: string;
  reservation_type?: string;
  package_type?: string;
  // 파티룸 전용 필드
  total_amount?: number;
  payment_method?: string;
  price_type?: string;
  end_date?: string;
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
    
    // 연습실 예약
    const { data: roomReservations } = await supabase
      .from("reservations")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("start_time", { ascending: false });

    // 파티룸 예약
    const { data: partyReservations } = await supabase
      .from("party_reservations")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    // 두 예약을 합쳐서 날짜순 정렬
    const allReservations = [
      ...(roomReservations || []).map((r: any) => ({ ...r, reservation_type: 'room' })),
      ...(partyReservations || []).map((r: any) => ({ 
        ...r, 
        reservation_type: 'party-room',
        points_used: r.payment_method === 'points' ? r.total_amount : 0,
      })),
    ].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
    
    setReservations(allReservations);
    setLoadingReservations(false);
  };

  const handleCancelReservation = async () => {
    if (!selectedReservation) return;

    setCancellingId(selectedReservation.id);

    try {
      // 파티룸 예약인지 연습실 예약인지 확인
      const isPartyRoom = selectedReservation.reservation_type === 'party-room';
      const apiUrl = isPartyRoom 
        ? "/api/party-room/reservations/cancel" 
        : "/api/reservations/cancel";

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservation_id: selectedReservation.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "취소에 실패했습니다");
      }

      // 파티룸이고 50% 환불인 경우 추가 안내
      if (isPartyRoom && data.refund_rate === 0.5 && data.payment_method === 'kakaopay') {
        alert(`예약이 취소되었습니다.\n\n카드 전액 취소 후 ${data.refund_points.toLocaleString("ko-KR")}P가 포인트로 적립되었습니다.\n포인트는 마이페이지에서 확인하실 수 있습니다.`);
      } else {
        alert("예약이 취소되었습니다");
      }
      
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
              reservations.map((reservation) => {
                const isPartyRoom = reservation.reservation_type === 'party-room';
                const displayAmount = isPartyRoom 
                  ? (reservation.payment_method === 'points' ? reservation.total_amount : reservation.total_amount)
                  : reservation.points_used;
                const displayLabel = isPartyRoom && reservation.payment_method === 'kakaopay' 
                  ? '결제금액' 
                  : '사용 포인트';
                const displayUnit = isPartyRoom && reservation.payment_method === 'kakaopay' ? '원' : 'P';

                return (
                  <div
                    key={reservation.id}
                    className="rounded-2xl border border-[#D8CCBC] bg-white p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-xl font-bold text-[#3B342F]">
                            {format(new Date(reservation.date), "yyyy년 M월 d일 (eee)", { locale: ko })}
                          </h3>
                          {getStatusBadge(reservation.status)}
                          {/* 예약 타입 배지 */}
                          {isPartyRoom ? (
                            <span className="rounded-full bg-[#B98768] px-3 py-1 text-xs font-semibold text-white">
                              파티룸
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#EFE7DA] px-3 py-1 text-xs font-semibold text-[#3B342F]">
                              연습실
                            </span>
                          )}
                          {/* 패키지 타입 배지 */}
                          {reservation.package_type && (
                            <span className="rounded-full bg-[#f5ede6] border border-[#B98768]/30 px-3 py-1 text-xs font-semibold text-[#B98768]">
                              {reservation.package_type === 'day' && '낮 패키지'}
                              {reservation.package_type === 'night' && '야간 패키지'}
                              {reservation.package_type === 'allday' && '종일권'}
                            </span>
                          )}
                          {/* 결제수단 배지 (파티룸만) */}
                          {isPartyRoom && reservation.payment_method === 'kakaopay' && (
                            <span className="rounded-full bg-[#FEE500] px-3 py-1 text-xs font-semibold text-[#3B342F]">
                              카카오페이
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[#6f655d]">
                          <Clock className="w-4 h-4" />
                          <span>
                            {reservation.start_time} ~ {reservation.end_time}
                            {reservation.duration_hours && ` (${reservation.duration_hours}시간)`}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-[#9b9189] mb-1">{displayLabel}</p>
                        <p className="text-2xl font-bold text-[#B98768]">
                          {(displayAmount || 0).toLocaleString("ko-KR")}{displayUnit}
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
                );
              })
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

      {/* 취소 확인 모달 (2/3: 카드 50% 환불 안내) */}
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

              {selectedReservation.reservation_type === 'party-room' && selectedReservation.payment_method === 'kakaopay' && (
                <>
                  <p className="text-sm text-[#9b9189] mb-1">결제금액</p>
                  <p className="font-semibold text-[#3B342F] mb-3">
                    {selectedReservation.total_amount?.toLocaleString("ko-KR")}원
                  </p>
                  
                  {/* 파티룸 카드 결제 취소 안내 (3/3) */}
                  {(() => {
                    const startDateTime = new Date(`${selectedReservation.date}T${selectedReservation.start_time}`);
                    const now = new Date();
                    const diffMs = startDateTime.getTime() - now.getTime();
                    const diffDays = diffMs / (1000 * 60 * 60 * 24);
                    
                    if (diffDays >= 7) {
                      return (
                        <div className="mb-3 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                          전액 환불: 카드로 {selectedReservation.total_amount?.toLocaleString("ko-KR")}원 환불
                        </div>
                      );
                    } else if (diffDays >= 3) {
                      const halfAmount = Math.floor((selectedReservation.total_amount || 0) * 0.5);
                      return (
                        <div className="mb-3 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-800">
                          ⚠️ 50% 환불 정책: 카드 전액 취소 후 {halfAmount.toLocaleString("ko-KR")}원이 포인트로 적립됩니다.
                        </div>
                      );
                    }
                  })()}
                </>
              )}

              {(selectedReservation.reservation_type !== 'party-room' || selectedReservation.payment_method === 'points') && (
                <>
                  <p className="text-sm text-[#9b9189] mb-1">환불 포인트</p>
                  <p className="text-lg font-bold text-[#B98768]">
                    {(selectedReservation.points_used || selectedReservation.total_amount || 0).toLocaleString("ko-KR")}P
                  </p>
                </>
              )}
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
