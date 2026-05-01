type OtpEntry = {
  code: string;
  expiresAt: number;
  attempts: number;
};

const OTP_TTL_MS = 3 * 60 * 1000; // 3분
const MAX_VERIFY_ATTEMPTS = 5;

declare global {
   
  var __a1SmsOtpStore: Map<string, OtpEntry> | undefined;
}

const otpStore = globalThis.__a1SmsOtpStore ?? new Map<string, OtpEntry>();
if (!globalThis.__a1SmsOtpStore) {
  globalThis.__a1SmsOtpStore = otpStore;
}

function cleanup(phone: string) {
  const entry = otpStore.get(phone);
  if (!entry) return;
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
  }
}

export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function isValidKoreanMobile(phone: string) {
  return /^01[016789]\d{7,8}$/.test(phone);
}

export function createOtp(phone: string) {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(phone, {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });
  return code;
}

export function verifyOtp(phone: string, inputCode: string) {
  cleanup(phone);
  const entry = otpStore.get(phone);
  if (!entry) {
    return { ok: false as const, error: "인증코드가 만료되었거나 발급되지 않았습니다." };
  }
  if (entry.attempts >= MAX_VERIFY_ATTEMPTS) {
    otpStore.delete(phone);
    return { ok: false as const, error: "인증 시도 횟수를 초과했습니다. 다시 요청해주세요." };
  }
  if (entry.code !== inputCode) {
    entry.attempts += 1;
    otpStore.set(phone, entry);
    return { ok: false as const, error: "인증코드가 일치하지 않습니다." };
  }
  otpStore.delete(phone);
  return { ok: true as const };
}
