/**
 * 전화번호 유틸리티 함수
 */

/**
 * 전화번호를 한국 형식으로 정규화
 * @example "821054010732" -> "01054010732"
 * @example "010-5401-0732" -> "01054010732"
 * @example "+82 10-5401-0732" -> "01054010732"
 */
export function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  // 숫자만 추출
  const digits = phone.replace(/[^0-9]/g, '');
  
  // 빈 문자열 체크
  if (!digits) return null;
  
  // 국제 형식 (82로 시작) → 한국 형식 (0으로 시작)
  if (digits.startsWith('82')) {
    return '0' + digits.substring(2);
  }
  
  // 이미 0으로 시작하면 그대로 반환
  if (digits.startsWith('0')) {
    return digits;
  }
  
  // 그 외의 경우 0을 앞에 붙임
  return '0' + digits;
}

/**
 * 전화번호 유효성 검사
 * @returns true if valid Korean phone number
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  if (!phone) return false;
  
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return false;
  
  // 한국 휴대폰 번호: 010, 011, 016, 017, 018, 019로 시작하는 10~11자리
  return /^01[0-9]{8,9}$/.test(normalized);
}

/**
 * 전화번호를 표시 형식으로 포맷팅
 * @example "01054010732" -> "010-5401-0732"
 * @example "821054010732" -> "010-5401-0732"
 */
export function formatPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return null;
  
  // 010-1234-5678 형식
  if (normalized.length === 11) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7)}`;
  }
  
  // 010-123-4567 형식 (10자리)
  if (normalized.length === 10) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
  
  return normalized;
}
