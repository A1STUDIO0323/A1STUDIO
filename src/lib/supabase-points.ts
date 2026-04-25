import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

/**
 * 포인트 연산 결과
 */
export interface PointResult {
  success: boolean;
  newBalance: number;
  transactionId?: string;
  error?: string;
}

/** Supabase RPC `charge_points` / `refund_points` OUT 파라미터 행 */
interface PointsOutRpcRow {
  o_success?: boolean;
  o_new_balance?: number;
  o_transaction_id?: string;
}

/** PostgREST가 단일 행을 배열로 줄 때 첫 행만 사용 */
function unwrapRpcFirstRow(data: unknown): Record<string, unknown> | null {
  if (data == null) return null;
  if (Array.isArray(data)) {
    const first = data[0];
    if (first != null && typeof first === "object" && !Array.isArray(first)) {
      return first as Record<string, unknown>;
    }
    return null;
  }
  if (typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return null;
}

function parseRpcRow(data: unknown): PointsOutRpcRow | null {
  const row = unwrapRpcFirstRow(data);
  if (!row) return null;
  return row as unknown as PointsOutRpcRow;
}

/**
 * 포인트 사용 (차감)
 * Supabase RPC 함수 use_points 호출
 */
export async function deductPointsDB(params: {
  userId: string;
  points: number;
  description: string;
  reservationId?: string;
}): Promise<PointResult> {
  const supabase = await createClient();

  if (params.points <= 0) {
    return {
      success: false,
      newBalance: 0,
      error: "사용 포인트는 0보다 커야 합니다",
    };
  }

  try {
    console.log("[Deduct Points] Calling use_points RPC:", {
      userId: params.userId,
      points: params.points,
      reservationId: params.reservationId,
      description: params.description,
    });

    const { data, error } = await supabase.rpc("use_points", {
      p_user_id: params.userId,
      p_points: params.points,
      p_description: params.description,
      p_reservation_id: params.reservationId ?? null,
    });

    console.log("[Deduct Points] RPC raw response:", { data, error });

    if (error) {
      console.error("[Deduct Points Error]", error);
      return {
        success: false,
        newBalance: 0,
        error: error.message || "포인트 사용 실패",
      };
    }

    console.log("[Deduct Points] Parsing response...");
    console.log("[Deduct Points] data type:", typeof data);
    console.log("[Deduct Points] data is array:", Array.isArray(data));
    if (Array.isArray(data)) {
      console.log("[Deduct Points] data[0]:", data[0]);
    }

    const row = unwrapRpcFirstRow(data);
    console.log("[Deduct Points] Parsed row:", row);

    if (!row) {
      console.error("[Deduct Points] Empty or unparseable RPC data");
      return {
        success: false,
        newBalance: 0,
        error: "포인트 차감 실패",
      };
    }

    const rpcSuccess = Boolean(row.success ?? row.o_success);
    if (!rpcSuccess) {
      console.error("[Deduct Points] RPC returned success=false:", row);
      const errMsg =
        typeof row.error === "string" && row.error
          ? row.error
          : "포인트가 부족합니다";
      return {
        success: false,
        newBalance: 0,
        error: errMsg,
      };
    }

    const newBal = Number(row.new_balance ?? row.o_new_balance ?? 0);
    const txIdRaw = row.transaction_id ?? row.o_transaction_id;
    const txId = typeof txIdRaw === "string" ? txIdRaw : undefined;

    console.log("[Deduct Points] Success! New balance:", newBal);

    return {
      success: true,
      newBalance: newBal,
      transactionId: txId,
    };
  } catch (err) {
    console.error("[Deduct Points Exception]", err);
    return {
      success: false,
      newBalance: 0,
      error: err instanceof Error ? err.message : "포인트 사용 중 오류 발생",
    };
  }
}

/**
 * 포인트 충전
 * Supabase RPC 함수 charge_points 호출
 */
export async function chargePointsDB(params: {
  userId: string;
  points: number;
  bonusPoints?: number;
  description?: string;
}): Promise<PointResult> {
  const supabase = await createClient();

  if (params.points <= 0) {
    return {
      success: false,
      newBalance: 0,
      error: "충전 포인트는 0보다 커야 합니다",
    };
  }

  try {
    const { data, error } = await supabase.rpc("charge_points", {
      p_user_id: params.userId,
      p_points: params.points,
      p_bonus_points: params.bonusPoints ?? 0,
      p_description: params.description ?? "포인트 충전",
    });

    if (error) {
      console.error("[Charge Points Error]", error);
      return {
        success: false,
        newBalance: 0,
        error: error.message || "포인트 충전 실패",
      };
    }

    const row = parseRpcRow(data);
    if (!row?.o_success) {
      return {
        success: false,
        newBalance: 0,
        error: "포인트 충전 실패",
      };
    }

    return {
      success: true,
      newBalance: row.o_new_balance ?? 0,
    };
  } catch (err) {
    console.error("[Charge Points Exception]", err);
    return {
      success: false,
      newBalance: 0,
      error: err instanceof Error ? err.message : "포인트 충전 중 오류 발생",
    };
  }
}

/**
 * 포인트 환불
 * Supabase RPC 함수 refund_points 호출
 */
export async function refundPointsDB(params: {
  userId: string;
  points: number;
  description: string;
  /** 예약 미생성 시 환불 등 — RPC가 NULL 허용 시 생략 */
  reservationId?: string | null;
}): Promise<PointResult> {
  const supabase = await createClient();

  if (params.points <= 0) {
    return {
      success: false,
      newBalance: 0,
      error: "환불 포인트는 0보다 커야 합니다",
    };
  }

  try {
    const { data, error } = await supabase.rpc("refund_points", {
      p_user_id: params.userId,
      p_points: params.points,
      p_description: params.description,
      p_reservation_id: params.reservationId ?? null,
    });

    if (error) {
      console.error("[Refund Points Error]", error);
      return {
        success: false,
        newBalance: 0,
        error: error.message || "포인트 환불 실패",
      };
    }

    const row = parseRpcRow(data);
    if (!row?.o_success) {
      return {
        success: false,
        newBalance: 0,
        error: "포인트 환불 실패",
      };
    }

    return {
      success: true,
      newBalance: row.o_new_balance ?? 0,
    };
  } catch (err) {
    console.error("[Refund Points Exception]", err);
    return {
      success: false,
      newBalance: 0,
      error: err instanceof Error ? err.message : "포인트 환불 중 오류 발생",
    };
  }
}

function createServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseJsClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * 관리자 취소 등 — 요청에 사용자 세션이 없을 때 `refund_points` RPC (service role)
 */
export async function refundPointsDBServiceRole(params: {
  userId: string;
  points: number;
  description: string;
  reservationId: string;
}): Promise<PointResult> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) {
    return {
      success: false,
      newBalance: 0,
      error: "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다",
    };
  }

  if (params.points <= 0) {
    return {
      success: false,
      newBalance: 0,
      error: "환불 포인트는 0보다 커야 합니다",
    };
  }

  try {
    const { data, error } = await supabase.rpc("refund_points", {
      p_user_id: params.userId,
      p_points: params.points,
      p_description: params.description,
      p_reservation_id: params.reservationId,
    });

    if (error) {
      console.error("[Refund Points Service Role Error]", error);
      return {
        success: false,
        newBalance: 0,
        error: error.message || "포인트 환불 실패",
      };
    }

    const row = parseRpcRow(data);
    if (!row?.o_success) {
      return {
        success: false,
        newBalance: 0,
        error: "포인트 환불 실패",
      };
    }

    return {
      success: true,
      newBalance: row.o_new_balance ?? 0,
    };
  } catch (err) {
    console.error("[Refund Points Service Role Exception]", err);
    return {
      success: false,
      newBalance: 0,
      error: err instanceof Error ? err.message : "포인트 환불 중 오류 발생",
    };
  }
}

/** service role로 잔액 조회 (관리자 취소 응답용) */
export async function getPointBalanceServiceRole(userId: string): Promise<number> {
  const supabase = createServiceRoleSupabase();
  if (!supabase) return 0;
  try {
    const { data } = await supabase
      .from("user_points")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    return data?.balance ?? 0;
  } catch {
    return 0;
  }
}

/**
 * 포인트 잔액 조회
 */
export async function getPointBalance(userId: string): Promise<number> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("user_points")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[Get Balance Error]", error);
      return 0;
    }

    return data?.balance ?? 0;
  } catch (err) {
    console.error("[Get Balance Exception]", err);
    return 0;
  }
}

/**
 * 포인트 트랜잭션 내역 조회
 */
export async function getPointTransactions(params: {
  userId: string;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    description: string | null;
    createdAt: string;
  }>
> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("point_transactions")
      .select("id, type, amount, balance_after, description, created_at")
      .eq("user_id", params.userId)
      .order("created_at", { ascending: false })
      .limit(params.limit ?? 50);

    if (error) {
      console.error("[Get Transactions Error]", error);
      return [];
    }

    return (data ?? []).map((tx) => ({
      id: String(tx.id),
      type: String(tx.type),
      amount: Number(tx.amount),
      balanceAfter: Number(tx.balance_after),
      description: tx.description ?? null,
      createdAt:
        typeof tx.created_at === "string"
          ? tx.created_at
          : String(tx.created_at ?? ""),
    }));
  } catch (err) {
    console.error("[Get Transactions Exception]", err);
    return [];
  }
}
