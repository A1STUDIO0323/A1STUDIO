import { createClient } from "@/lib/supabase/server";

/**
 * 포인트 연산 결과
 */
export interface PointResult {
  success: boolean;
  newBalance: number;
  transactionId?: string;
  error?: string;
}

/** Supabase RPC `use_points` / `charge_points` / `refund_points` 공통 OUT 필드 (DB 정의와 맞출 것) */
interface PointsRpcRow {
  o_success?: boolean;
  o_new_balance?: number;
  o_transaction_id?: string;
}

function parseRpcRow(data: unknown): PointsRpcRow | null {
  if (data == null) return null;
  if (typeof data === "object" && !Array.isArray(data)) {
    return data as PointsRpcRow;
  }
  return null;
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
    const { data, error } = await supabase.rpc("use_points", {
      p_user_id: params.userId,
      p_points: params.points,
      p_description: params.description,
      p_reservation_id: params.reservationId ?? null,
    });

    if (error) {
      console.error("[Use Points Error]", error);
      return {
        success: false,
        newBalance: 0,
        error: error.message || "포인트 사용 실패",
      };
    }

    const row = parseRpcRow(data);
    if (!row?.o_success) {
      return {
        success: false,
        newBalance: 0,
        error: "포인트가 부족합니다",
      };
    }

    return {
      success: true,
      newBalance: row.o_new_balance ?? 0,
      transactionId: row.o_transaction_id,
    };
  } catch (err) {
    console.error("[Use Points Exception]", err);
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
  reservationId: string;
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
      p_reservation_id: params.reservationId,
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
