/**
 * 카카오페이 결제 API 유틸리티
 */

const KAKAO_PAY_BASE_URL = "https://open-api.kakaopay.com";

interface ReadyPaymentParams {
  partner_order_id: string;
  partner_user_id: string;
  item_name: string;
  quantity: number;
  total_amount: number;
  tax_free_amount?: number;
}

interface ReadyPaymentResponse {
  tid: string;
  next_redirect_mobile_url: string;
  next_redirect_pc_url: string;
  created_at: string;
}

interface ApprovePaymentParams {
  tid: string;
  partner_order_id: string;
  partner_user_id: string;
  pg_token: string;
}

interface ApprovePaymentResponse {
  aid: string;
  tid: string;
  cid: string;
  partner_order_id: string;
  partner_user_id: string;
  payment_method_type: string;
  item_name: string;
  item_code: string;
  quantity: number;
  amount: {
    total: number;
    tax_free: number;
    vat: number;
    point: number;
    discount: number;
  };
  created_at: string;
  approved_at: string;
}

interface CancelPaymentParams {
  tid: string;
  cancel_amount: number;
  cancel_tax_free_amount?: number;
}

interface CancelPaymentResponse {
  aid: string;
  tid: string;
  cid: string;
  status: string;
  partner_order_id: string;
  partner_user_id: string;
  payment_method_type: string;
  amount: {
    total: number;
    tax_free: number;
    vat: number;
    point: number;
    discount: number;
  };
  canceled_amount: {
    total: number;
    tax_free: number;
    vat: number;
    point: number;
    discount: number;
  };
  canceled_at: string;
}

const getHeaders = () => ({
  "Authorization": `SECRET_KEY ${process.env.KAKAOPAY_SECRET_KEY}`,
  "Content-Type": "application/json",
});

/**
 * 결제 준비
 */
export async function readyPayment(params: ReadyPaymentParams): Promise<ReadyPaymentResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  
  const body = {
    cid: process.env.KAKAOPAY_CID,
    partner_order_id: params.partner_order_id,
    partner_user_id: params.partner_user_id,
    item_name: params.item_name,
    quantity: params.quantity,
    total_amount: params.total_amount,
    tax_free_amount: params.tax_free_amount || 0,
    approval_url: `${baseUrl}/api/charge/approve`,
    cancel_url: `${baseUrl}/charge/cancel`,
    fail_url: `${baseUrl}/charge/fail`,
  };

  const response = await fetch(`${KAKAO_PAY_BASE_URL}/online/v1/payment/ready`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("[KakaoPay] Ready payment failed:");
    console.error("[KakaoPay] Status:", response.status);
    console.error("[KakaoPay] Error:", error);
    console.error("[KakaoPay] Request body:", body);
    console.error("[KakaoPay] CID:", process.env.KAKAOPAY_CID);
    console.error("[KakaoPay] Secret Key exists:", !!process.env.KAKAOPAY_SECRET_KEY);
    console.error("[KakaoPay] Secret Key length:", process.env.KAKAOPAY_SECRET_KEY?.length);
    throw new Error(`카카오페이 결제 준비 실패: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * 결제 승인
 */
export async function approvePayment(params: ApprovePaymentParams): Promise<ApprovePaymentResponse> {
  const body = {
    cid: process.env.KAKAOPAY_CID,
    tid: params.tid,
    partner_order_id: params.partner_order_id,
    partner_user_id: params.partner_user_id,
    pg_token: params.pg_token,
  };

  const response = await fetch(`${KAKAO_PAY_BASE_URL}/online/v1/payment/approve`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`카카오페이 결제 승인 실패: ${error.msg || response.statusText}`);
  }

  return response.json();
}

/**
 * 결제 취소 (환불)
 */
export async function cancelPayment(params: CancelPaymentParams): Promise<CancelPaymentResponse> {
  const body = {
    cid: process.env.KAKAOPAY_CID,
    tid: params.tid,
    cancel_amount: params.cancel_amount,
    cancel_tax_free_amount: params.cancel_tax_free_amount || 0,
  };

  const response = await fetch(`${KAKAO_PAY_BASE_URL}/online/v1/payment/cancel`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`카카오페이 결제 취소 실패: ${error.msg || response.statusText}`);
  }

  return response.json();
}

// =============================================
// 파티룸 직접 결제용 (포인트 충전과 별개)
// =============================================

interface PartyRoomPaymentParams {
  userId: string;
  orderId: string;
  packageType: string;
  packageDate: string;
  amount: number;
}

/**
 * 카카오페이 결제 준비 (파티룸용)
 */
export async function readyPartyRoomPayment(params: PartyRoomPaymentParams): Promise<ReadyPaymentResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const packageNames = {
    day: '낮 패키지',
    night: '야간 패키지',
    allday: '종일권'
  };
  
  const body = {
    cid: process.env.KAKAOPAY_PARTY_CID || process.env.KAKAOPAY_CID,
    partner_order_id: params.orderId,
    partner_user_id: params.userId,
    item_name: `A1 파티룸 ${packageNames[params.packageType as keyof typeof packageNames]} (${params.packageDate})`,
    quantity: 1,
    total_amount: params.amount,
    tax_free_amount: 0,
    approval_url: `${baseUrl}/api/party-room/payments/kakao/approve`,
    cancel_url: `${baseUrl}/party-room/booking?cancelled=true`,
    fail_url: `${baseUrl}/party-room/booking?failed=true`,
  };

  const response = await fetch(`${KAKAO_PAY_BASE_URL}/online/v1/payment/ready`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`카카오페이 결제 준비 실패: ${error.msg || response.statusText}`);
  }

  return response.json();
}

/**
 * 카카오페이 결제 승인 (파티룸용)
 */
export async function approvePartyRoomPayment(params: ApprovePaymentParams): Promise<ApprovePaymentResponse> {
  const body = {
    cid: process.env.KAKAOPAY_PARTY_CID || process.env.KAKAOPAY_CID,
    tid: params.tid,
    partner_order_id: params.partner_order_id,
    partner_user_id: params.partner_user_id,
    pg_token: params.pg_token,
  };

  const response = await fetch(`${KAKAO_PAY_BASE_URL}/online/v1/payment/approve`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`카카오페이 결제 승인 실패: ${error.msg || response.statusText}`);
  }

  return response.json();
}

/**
 * 카카오페이 결제 취소 (파티룸 환불용)
 */
export async function cancelPartyRoomPayment(params: {
  tid: string;
  cancelAmount: number;
  cancelTaxFreeAmount?: number;
  reason: string;
}): Promise<CancelPaymentResponse> {
  const body = {
    cid: process.env.KAKAOPAY_PARTY_CID || process.env.KAKAOPAY_CID,
    tid: params.tid,
    cancel_amount: params.cancelAmount,
    cancel_tax_free_amount: params.cancelTaxFreeAmount || 0,
  };

  const response = await fetch(`${KAKAO_PAY_BASE_URL}/online/v1/payment/cancel`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`카카오페이 결제 취소 실패: ${error.msg || response.statusText}`);
  }

  return response.json();
}
