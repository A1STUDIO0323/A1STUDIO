/**
 * 프로덕션 안전 로거
 * 개발: 모든 로그 출력
 * 프로덕션: 에러만 출력, 민감 정보 제거
 */

const isDev = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
  /**
   * 일반 로그 (개발만)
   */
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * 에러 로그 (항상 출력)
   */
  error: (...args: unknown[]) => {
    console.error(...args);
  },

  /**
   * 경고 (항상 출력)
   */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  /**
   * 정보 로그 (프로덕션: 단순화)
   */
  info: (message: string, meta?: Record<string, unknown>) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, meta);
    } else if (isProduction) {
      // 프로덕션: 메시지만
      console.log(`[INFO] ${message}`);
    }
  },

  /**
   * 디버그 (개발만)
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * 결제 관련 로그 (민감 정보 제거)
   */
  payment: (action: string, data?: Record<string, unknown>) => {
    if (isDev) {
      console.log(`[Payment] ${action}`, data);
    } else if (isProduction) {
      // 프로덕션: 액션만
      console.log(`[Payment] ${action}`);
    }
  },
};
