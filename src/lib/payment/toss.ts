import type {
  PaymentProvider,
  ConfirmParams,
  ConfirmResult,
  CancelParams,
  CancelResult,
  PaymentInfo,
} from "./interface";

const TOSS_API_BASE = "https://api.tosspayments.com/v1";

function getAuthHeader(): string {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) throw new Error("TOSS_SECRET_KEY is not set");
  return "Basic " + Buffer.from(secretKey + ":").toString("base64");
}

async function tossRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${TOSS_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      `TossPayments API Error [${res.status}]: ${data?.message ?? "Unknown error"}`
    );
  }

  return data as T;
}

export const tossPaymentsProvider: PaymentProvider = {
  getClientKey() {
    const key = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!key) throw new Error("NEXT_PUBLIC_TOSS_CLIENT_KEY is not set");
    return key;
  },

  async confirmPayment(params: ConfirmParams): Promise<ConfirmResult> {
    const data = await tossRequest<{
      paymentKey: string;
      orderId: string;
      totalAmount: number;
      approvedAt: string;
    }>("/payments/confirm", {
      method: "POST",
      body: JSON.stringify({
        paymentKey: params.paymentKey,
        orderId: params.orderId,
        amount: params.amount,
      }),
    });

    return {
      success: true,
      paymentKey: data.paymentKey,
      orderId: data.orderId,
      amount: data.totalAmount,
      approvedAt: data.approvedAt,
      raw: data,
    };
  },

  async cancelPayment(params: CancelParams): Promise<CancelResult> {
    const body: Record<string, unknown> = {
      cancelReason: params.cancelReason,
    };
    if (params.cancelAmount !== undefined) {
      body.cancelAmount = params.cancelAmount;
    }

    const data = await tossRequest<{ cancels: Array<{ cancelAmount: number }> }>(
      `/payments/${params.paymentKey}/cancel`,
      { method: "POST", body: JSON.stringify(body) }
    );

    const cancelled = data.cancels?.at(-1);
    return {
      success: true,
      cancelledAmount: cancelled?.cancelAmount ?? params.cancelAmount ?? 0,
      raw: data,
    };
  },

  async getPayment(paymentKey: string): Promise<PaymentInfo> {
    const data = await tossRequest<{
      paymentKey: string;
      orderId: string;
      totalAmount: number;
      status: string;
      approvedAt?: string;
    }>(`/payments/${paymentKey}`);

    return {
      paymentKey: data.paymentKey,
      orderId: data.orderId,
      amount: data.totalAmount,
      status: data.status,
      approvedAt: data.approvedAt,
      raw: data,
    };
  },
};
