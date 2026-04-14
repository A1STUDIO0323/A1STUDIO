import { createClient } from "@/lib/supabase/server";

/**
 * 결제 락 획득 (중복 결제 방지)
 */
export async function acquirePaymentLock(
  userId: string,
  lockType: string,
  lockKey: string,
  durationSeconds: number = 300 // 기본 5분
): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // 만료된 락 정리
    await supabase
      .from("payment_locks")
      .delete()
      .lt("expires_at", new Date().toISOString());

    // 기존 락 확인
    const { data: existingLock } = await supabase
      .from("payment_locks")
      .select("id")
      .eq("user_id", userId)
      .eq("lock_type", lockType)
      .eq("lock_key", lockKey)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (existingLock) {
      console.log(`[PaymentLock] 이미 진행 중인 결제가 있습니다: ${lockType}/${lockKey}`);
      return false;
    }

    // 새 락 생성
    const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();
    const { error } = await supabase
      .from("payment_locks")
      .insert({
        user_id: userId,
        lock_type: lockType,
        lock_key: lockKey,
        expires_at: expiresAt,
      });

    if (error) {
      console.error("[PaymentLock] 락 생성 오류:", error);
      return false;
    }

    console.log(`[PaymentLock] 락 획득 성공: ${lockType}/${lockKey}`);
    return true;
  } catch (error) {
    console.error("[PaymentLock] 락 획득 오류:", error);
    return false;
  }
}

/**
 * 결제 락 해제
 */
export async function releasePaymentLock(
  userId: string,
  lockType: string,
  lockKey: string
): Promise<void> {
  try {
    const supabase = await createClient();
    
    await supabase
      .from("payment_locks")
      .delete()
      .eq("user_id", userId)
      .eq("lock_type", lockType)
      .eq("lock_key", lockKey);

    console.log(`[PaymentLock] 락 해제: ${lockType}/${lockKey}`);
  } catch (error) {
    console.error("[PaymentLock] 락 해제 오류:", error);
  }
}

/**
 * 사용자의 모든 만료되지 않은 락 조회
 */
export async function getUserActiveLocks(userId: string): Promise<any[]> {
  try {
    const supabase = await createClient();
    
    const { data } = await supabase
      .from("payment_locks")
      .select("*")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString());

    return data || [];
  } catch (error) {
    console.error("[PaymentLock] 락 조회 오류:", error);
    return [];
  }
}
