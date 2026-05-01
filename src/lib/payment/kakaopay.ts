type KakaoReadyPayload = {
  orderId: string;
  partnerUserId: string;
  itemName: string;
  quantity: number;
  totalAmount: number;
  approvalUrl: string;
  cancelUrl: string;
  failUrl: string;
};

type ReadyResponse = {
  tid: string;
  next_redirect_pc_url?: string;
  next_redirect_mobile_url?: string;
  created_at: string;
};

type ApproveResponse = {
  aid: string;
  tid: string;
  cid: string;
  partner_order_id: string;
  partner_user_id: string;
  payment_method_type: string;
  amount: {
    total: number;
  };
  approved_at: string;
};

const KAKAOPAY_API_BASE = "https://open-api.kakaopay.com/online/v1/payment";

declare global {
   
  var __a1KakaoTidMap: Map<string, string> | undefined;
}

const tidMap = globalThis.__a1KakaoTidMap ?? new Map<string, string>();
if (!globalThis.__a1KakaoTidMap) {
  globalThis.__a1KakaoTidMap = tidMap;
}

function getSecretKey() {
  const key = process.env.KAKAOPAY_SECRET_KEY;
  if (!key) throw new Error("KAKAOPAY_SECRET_KEY is not set");
  return key;
}

function getCid() {
  return process.env.KAKAOPAY_CID ?? "TC0ONETIME";
}

async function kakaoRequest<T>(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${KAKAOPAY_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `SECRET_KEY ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.msg ?? data?.error_message ?? "KakaoPay API request failed");
  }
  return data as T;
}

export async function requestKakaoPayReady(payload: KakaoReadyPayload) {
  const data = await kakaoRequest<ReadyResponse>("/ready", {
    cid: getCid(),
    partner_order_id: payload.orderId,
    partner_user_id: payload.partnerUserId,
    item_name: payload.itemName,
    quantity: payload.quantity,
    total_amount: payload.totalAmount,
    vat_amount: 0,
    tax_free_amount: 0,
    approval_url: payload.approvalUrl,
    cancel_url: payload.cancelUrl,
    fail_url: payload.failUrl,
  });

  tidMap.set(payload.orderId, data.tid);
  return data;
}

export async function requestKakaoPayApprove(params: {
  orderId: string;
  partnerUserId: string;
  pgToken: string;
}) {
  const tid = tidMap.get(params.orderId);
  if (!tid) {
    throw new Error("결제 세션이 만료되었습니다. 다시 결제를 시도해주세요.");
  }

  const data = await kakaoRequest<ApproveResponse>("/approve", {
    cid: getCid(),
    tid,
    partner_order_id: params.orderId,
    partner_user_id: params.partnerUserId,
    pg_token: params.pgToken,
  });

  tidMap.delete(params.orderId);
  return data;
}
