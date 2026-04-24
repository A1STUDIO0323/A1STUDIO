import { prisma } from "./db";

/**
 * 사용자 존재 여부 검증 (2층 안전망)
 * @param userId - 검증할 사용자 ID (null 허용)
 * @returns 유효한 사용자 또는 null이면 true
 */
export async function validateUserExists(
  userId: string | null | undefined
): Promise<boolean> {
  // null/undefined는 허용 (비회원 예약)
  if (!userId) return true;

  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true }, // 최소 필드만 조회
    });

    return !!user;
  } catch (error) {
    console.error("[validateUserExists] Error:", error);
    return false;
  }
}

/**
 * 사용자 검증 실패 시 표준 에러 응답
 */
export const USER_NOT_FOUND_ERROR = {
  error: "존재하지 않는 사용자입니다",
  code: "USER_NOT_FOUND",
} as const;
