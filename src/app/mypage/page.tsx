"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { formatPhoneNumber } from "@/lib/phone-utils";
import { 
  calculatePracticeRoomRefundRate, 
  calculatePartyRoomRefundRate 
} from "@/lib/refund-policy";
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
  status: "HOLD" | "PAID" | "CANCELLED" | "EXPIRED" | "REFUNDED" | "CONFIRMED" | "confirmed" | "cancelled" | "completed";
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
  const searchParams = useSearchParams();
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

  // 계정 정보 관련
  const [profileData, setProfileData] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editingBirthDate, setEditingBirthDate] = useState(false);
  const [birthDateInput, setBirthDateInput] = useState("");
  const [savingBirthDate, setSavingBirthDate] = useState(false);

  // 계정 탈퇴 관련
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    const supabase = createClient();
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login?redirect=/mypage");
      } else {
        setUser(user);
        loadPointsData(user.id);
        loadReservations(user.id);
        loadProfile(); // 프로필 정보 로드
      }
    });
  }, [router]);

  // URL 파라미터로 탭 설정
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "account" || tab === "points" || tab === "reservations") {
      setActiveTab(tab as Tab);
    }
  }, [searchParams]);

  const loadProfile = async () => {
    try {
      const res = await fetch("/api/members/profile");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProfileData(data.profile);
        }
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadPointsData = async (userId: string) => {
    const supabase = createClient();
    
    // 포인트 잔액
    const { data: pointsData, error: pointsError } = await supabase
      .from("user_points")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (pointsError) {
      console.warn('[MyPage] 포인트 조회 실패:', pointsError);
    }
    setBalance(pointsData?.balance || 0);

    // 거래 내역
    const { data: transactionsData, error: transactionsError } = await supabase
      .from("point_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (transactionsError) {
      console.warn('[MyPage] 거래내역 조회 실패:', transactionsError);
    }
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
      ...(roomReservations || []).map((r: any) => ({ 
        ...r, 
        reservation_type: 'room',
        points_used: r.total_amount, // total_amount를 points_used로 매핑
      })),
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

  const handleDeleteAccount = async () => {
    if (isDeleting) return;

    // 확인 텍스트 검증
    if (deleteConfirmText !== "모든 유의사항을 읽었으며 탈퇴합니다") {
      alert("정확한 문구를 입력해주세요:\n모든 유의사항을 읽었으며 탈퇴합니다");
      return;
    }

    try {
      setIsDeleting(true);

      const res = await fetch("/api/account/delete", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || data.error || "계정 탈퇴에 실패했습니다");
        setIsDeleting(false);
        return;
      }

      // 탈퇴 성공 - 클라이언트 측 로그아웃 처리
      const supabase = createClient();
      await supabase.auth.signOut();

      // 성공 메시지 (상세 정보 포함)
      let message = "회원 탈퇴가 완료되었습니다.\n\n";
      
      if (data.deleted) {
        if (data.deleted.points_forfeited > 0) {
          message += `• 소멸된 포인트: ${data.deleted.points_forfeited.toLocaleString()}P\n`;
        }
        if (data.deleted.cancelled_reservations > 0) {
          message += `• 취소된 예약: ${data.deleted.cancelled_reservations}건\n`;
        }
        message += "\n";
      }
      
      message += "그동안 이용해주셔서 감사합니다.";
      
      alert(message);
      
      // 메인 페이지로 이동 후 새로고침 (완전한 세션 정리)
      window.location.href = "/";
    } catch (error) {
      console.error("계정 탈퇴 오류:", error);
      alert("계정 탈퇴 처리 중 오류가 발생했습니다");
      setIsDeleting(false);
    }
  };

  const handleSaveBirthDate = async () => {
    if (!birthDateInput) {
      alert("생년월일을 입력해주세요");
      return;
    }

    try {
      setSavingBirthDate(true);
      const res = await fetch("/api/members/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate: birthDateInput }),
      });

      const data = await res.json();
      
      if (!res.ok || !data.success) {
        alert(data.error || "생년월일 저장에 실패했습니다");
        return;
      }

      // 프로필 재로드
      await loadProfile();
      setEditingBirthDate(false);
      setBirthDateInput("");
      alert("생년월일이 저장되었습니다");
    } catch (error) {
      console.error("생년월일 저장 오류:", error);
      alert("생년월일 저장 중 오류가 발생했습니다");
    } finally {
      setSavingBirthDate(false);
    }
  };

  const canCancelReservation = (reservation: Reservation): boolean => {
    // PAID, CONFIRMED, confirmed 상태의 예약만 취소 가능
    const cancellableStatuses = ["PAID", "CONFIRMED", "confirmed"];
    if (!cancellableStatuses.includes(reservation.status)) return false;
    
    const reservationDateTime = new Date(`${reservation.date}T${reservation.start_time}`);
    const now = new Date();
    const diffMs = reservationDateTime.getTime() - now.getTime();
    
    // 연습실: 2일 전까지, 파티룸: 3일 전까지 취소 가능
    const isPartyRoom = reservation.reservation_type === 'party-room';
    const daysUntilReservation = diffMs / (1000 * 60 * 60 * 24);
    const minDays = isPartyRoom ? 3 : 2;
    
    return daysUntilReservation >= minDays;
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
      case "PAID":
      case "CONFIRMED":
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
            <CheckCircle className="w-3 h-3" />
            확정
          </span>
        );
      case "CANCELLED":
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
                // 표시할 금액 및 레이블 결정
                const displayAmount = reservation.total_amount || 0;
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
              
              {loadingProfile ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse h-14 bg-[#EFE7DA] rounded-lg" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-[#9b9189] mb-1">이메일</p>
                    <p className="text-lg font-semibold text-[#3B342F]">{user.email}</p>
                  </div>

                  <div>
                    <p className="text-sm text-[#9b9189] mb-1">생년월일</p>
                    {editingBirthDate ? (
                      <div className="space-y-2">
                        <input
                          type="date"
                          value={birthDateInput}
                          onChange={(e) => setBirthDateInput(e.target.value)}
                          className="w-full rounded-lg border border-[#D8CCBC] bg-[#F7F3EB] px-3 py-2 text-[#3B342F] focus:border-[#B98768] focus:outline-none"
                          max={format(new Date(), "yyyy-MM-dd")}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleSaveBirthDate}
                            disabled={savingBirthDate}
                            className="flex-1 rounded-lg bg-[#B98768] px-4 py-2 text-sm font-semibold text-white hover:bg-[#a9785c] disabled:opacity-50"
                          >
                            {savingBirthDate ? "저장 중..." : "저장"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingBirthDate(false);
                              setBirthDateInput("");
                            }}
                            className="flex-1 rounded-lg border border-[#D8CCBC] px-4 py-2 text-sm font-semibold text-[#6f655d] hover:bg-[#EFE7DA]"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : profileData?.birthDate ? (
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-semibold text-[#3B342F]">
                          {format(new Date(profileData.birthDate), "yyyy년 M월 d일", { locale: ko })}
                        </p>
                        <button
                          onClick={() => {
                            setBirthDateInput(profileData.birthDate);
                            setEditingBirthDate(true);
                          }}
                          className="text-sm text-[#B98768] hover:underline"
                        >
                          수정
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="text-[#9b9189]">미입력</p>
                          <button
                            onClick={() => setEditingBirthDate(true)}
                            className="text-sm text-[#B98768] hover:underline font-semibold"
                          >
                            입력하기
                          </button>
                        </div>
                        <p className="text-xs text-amber-600 leading-relaxed">
                          파티룸 예약을 위해서는 생년월일(만 19세 이상) 확인이 필요합니다.
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-[#9b9189] mb-1">휴대폰 번호</p>
                    {user.phone || profileData?.phone ? (
                      <p className="text-lg font-semibold text-[#3B342F]">
                        {formatPhoneNumber(user.phone || profileData?.phone) || user.phone || profileData?.phone}
                      </p>
                    ) : (
                      <p className="text-[#9b9189]">미입력</p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-[#9b9189] mb-1">가입일</p>
                    <p className="text-lg font-semibold text-[#3B342F]">
                      {format(new Date(user.created_at), "yyyy년 M월 d일", { locale: ko })}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#D8CCBC] px-6 py-4 font-semibold text-[#3B342F] transition-all hover:border-red-300 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              로그아웃
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 px-6 py-4 font-semibold text-red-600 transition-all hover:border-red-400 hover:bg-red-50"
            >
              <AlertCircle className="w-5 h-5" />
              계정 탈퇴
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

              {/* 환불 정책 안내 */}
              {(() => {
                const startDateTime = new Date(`${selectedReservation.date}T${selectedReservation.start_time}`);
                const isPartyRoom = selectedReservation.reservation_type === 'party-room';
                const isKakaoPay = selectedReservation.payment_method === 'kakaopay';
                
                // 환불율 계산
                const refundPolicy = isPartyRoom 
                  ? calculatePartyRoomRefundRate(startDateTime)
                  : calculatePracticeRoomRefundRate(startDateTime);
                
                const originalAmount = selectedReservation.total_amount || 0;
                const refundAmount = Math.floor(originalAmount * refundPolicy.refundRate);

                // 결제 금액 표시
                if (isPartyRoom && isKakaoPay) {
                  return (
                    <>
                      <p className="text-sm text-[#9b9189] mb-1">결제금액</p>
                      <p className="font-semibold text-[#3B342F] mb-3">
                        {originalAmount.toLocaleString("ko-KR")}원
                      </p>
                      
                      {/* 환불 안내 */}
                      <div className={`mb-3 rounded-lg border p-3 text-sm ${
                        refundPolicy.refundRate === 1.0 
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : refundPolicy.refundRate === 0.5
                          ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                          : 'bg-red-50 border-red-200 text-red-700'
                      }`}>
                        <p className="font-semibold mb-1">{refundPolicy.description}</p>
                        {refundPolicy.refundRate === 1.0 ? (
                          <p>카드로 {refundAmount.toLocaleString("ko-KR")}원 환불</p>
                        ) : refundPolicy.refundRate === 0.5 ? (
                          <p className="text-xs">⚠️ 카드 전액 취소 후 {refundAmount.toLocaleString("ko-KR")}원이 포인트로 적립됩니다.</p>
                        ) : (
                          <p>환불 불가</p>
                        )}
                      </div>
                    </>
                  );
                } else {
                  // 포인트 결제
                  return (
                    <>
                      <p className="text-sm text-[#9b9189] mb-1">환불 포인트</p>
                      <div className={`rounded-lg border p-3 ${
                        refundPolicy.refundRate === 1.0 
                          ? 'bg-green-50 border-green-200'
                          : refundPolicy.refundRate === 0.5
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <p className="text-sm font-semibold text-[#3B342F] mb-1">
                          {refundPolicy.description}
                        </p>
                        <p className="text-lg font-bold text-[#B98768]">
                          {refundAmount.toLocaleString("ko-KR")}P
                        </p>
                        {refundPolicy.refundRate < 1.0 && (
                          <p className="text-xs text-[#9b9189] mt-1">
                            원금: {originalAmount.toLocaleString("ko-KR")}P
                          </p>
                        )}
                      </div>
                    </>
                  );
                }
              })()}
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

      {/* 계정 탈퇴 확인 모달 */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => {
            if (!isDeleting) {
              setShowDeleteModal(false);
              setDeleteConfirmText("");
            }
          }}
        >
          <div
            className="max-w-md w-full rounded-2xl border border-red-300 bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-xl font-bold text-[#3B342F]">계정 탈퇴</h3>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-[#3B342F] font-semibold">
                정말로 계정을 탈퇴하시겠습니까?
              </p>

              <div className="rounded-lg bg-red-50 border border-red-200 p-4 space-y-2">
                <p className="text-sm font-semibold text-red-900">⚠️ 탈퇴 시 유의사항</p>
                <ul className="text-sm text-red-800 space-y-1.5 list-disc list-inside">
                  <li>모든 개인정보가 삭제되며 복구할 수 없습니다</li>
                  <li className={balance > 0 ? 'font-bold text-red-900' : ''}>
                    <strong>남은 포인트({balance.toLocaleString()}P)는 모두 소멸됩니다</strong>
                    {balance > 0 && ' ← 환불 불가!'}
                  </li>
                  <li className={reservations.filter(r => 
                    (r.status === "PAID" || r.status === "CONFIRMED") && 
                    new Date(r.date) >= new Date()
                  ).length > 0 ? 'font-bold text-orange-900' : ''}>
                    활성화된 예약({reservations.filter(r => 
                      (r.status === "PAID" || r.status === "CONFIRMED") && 
                      new Date(r.date) >= new Date()
                    ).length}건)은 자동으로 취소됩니다
                  </li>
                  <li>예약 내역은 비식별화되어 보관됩니다</li>
                  <li>동일한 계정으로 재가입할 수 없습니다</li>
                </ul>
              </div>

              <div className="rounded-lg bg-[#F7F3EB] p-4">
                <p className="text-sm text-[#6f655d] mb-2">현재 상태</p>
                <div className="space-y-1 text-sm">
                  <p className="text-[#3B342F]">
                    <span className="text-[#9b9189]">포인트:</span>{" "}
                    <span className={`font-semibold ${balance > 0 ? 'text-red-600' : ''}`}>
                      {balance.toLocaleString()}P
                      {balance > 0 && ' (소멸 예정)'}
                    </span>
                  </p>
                  <p className="text-[#3B342F]">
                    <span className="text-[#9b9189]">활성 예약:</span>{" "}
                    <span className={`font-semibold ${
                      reservations.filter(r => 
                        (r.status === "PAID" || r.status === "CONFIRMED") && 
                        new Date(r.date) >= new Date()
                      ).length > 0 ? 'text-orange-600' : ''
                    }`}>
                      {reservations.filter(r => 
                        (r.status === "PAID" || r.status === "CONFIRMED") && 
                        new Date(r.date) >= new Date()
                      ).length}건
                      {reservations.filter(r => 
                        (r.status === "PAID" || r.status === "CONFIRMED") && 
                        new Date(r.date) >= new Date()
                      ).length > 0 && ' (자동 취소 예정)'}
                    </span>
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#9b9189]">
                아래에 정확히 입력하여 탈퇴를 확인해주세요:
              </p>
              
              <div className="rounded-lg bg-white border-2 border-[#D8CCBC] p-4">
                <p className="text-sm font-mono text-center text-[#3B342F] mb-3">
                  "모든 유의사항을 읽었으며 탈퇴합니다"
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="위 문구를 정확히 입력해주세요"
                  disabled={isDeleting}
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#D8CCBC] focus:border-red-400 focus:outline-none text-center disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                }}
                disabled={isDeleting}
                className="flex-1 rounded-lg border border-[#D8CCBC] px-4 py-3 font-semibold text-[#3B342F] transition-colors hover:bg-[#F7F3EB] disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== "모든 유의사항을 읽었으며 탈퇴합니다"}
                className="flex-1 rounded-lg bg-red-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "처리 중..." : "계정 탈퇴"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
