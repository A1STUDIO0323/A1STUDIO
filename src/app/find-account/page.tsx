'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type AccountRow = {
  email: string;
  provider: string;
  createdAt: string;
};

export default function FindAccountPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code' | 'result'>('phone');
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimerInterval = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  useEffect(() => () => clearTimerInterval(), []);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7)
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const sendCode = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/sms/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/[^0-9]/g, '') }),
      });

      const data = await res.json();

      if (data.success) {
        clearTimerInterval();
        setStep('code');
        setTimer(180);
        timerIntervalRef.current = setInterval(() => {
          setTimer((prev) => {
            if (prev <= 1) {
              clearTimerInterval();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setError(data.error || '인증번호 발송에 실패했습니다');
      }
    } catch {
      setError('인증번호 발송 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const findAccount = async () => {
    setError('');
    setLoading(true);

    try {
      const params = new URLSearchParams({
        phone: phone.replace(/[^0-9]/g, ''),
        code,
      });
      const res = await fetch(`/api/find-account?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setAccounts(data.accounts);
        setStep('result');
        clearTimerInterval();
      } else {
        setError(data.error || '계정 조회에 실패했습니다');
      }
    } catch {
      setError('계정 조회 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const getProviderName = (provider: string) => {
    const map: Record<string, string> = {
      kakao: '카카오',
      google: '구글',
      email: '이메일',
    };
    return map[provider] || provider;
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="mb-8">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            로그인으로 돌아가기
          </Link>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">
            아이디 찾기
          </h1>
          <p className="text-[var(--color-text-muted)] mt-2">
            가입 시 입력한 전화번호로 계정을 찾을 수 있습니다
          </p>
        </div>

        <div className="bg-[var(--color-surface)] rounded-2xl p-6 border border-[var(--color-border)]">
          {step === 'phone' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  전화번호
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="010-1234-5678"
                  className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-[var(--color-text)]"
                  maxLength={13}
                />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                type="button"
                onClick={sendCode}
                disabled={
                  loading || phone.replace(/[^0-9]/g, '').length !== 11
                }
                className="w-full py-3 bg-[var(--color-accent)] text-white rounded-xl hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '발송 중...' : '인증번호 받기'}
              </button>
            </div>
          )}

          {step === 'code' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  인증번호
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
                  }
                  placeholder="6자리 숫자"
                  className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-[var(--color-text)]"
                  maxLength={6}
                />
                {timer > 0 && (
                  <p className="text-sm text-[var(--color-text-muted)] mt-2">
                    남은 시간: {formatTimer(timer)}
                  </p>
                )}
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={findAccount}
                  disabled={loading || code.length !== 6 || timer === 0}
                  className="w-full py-3 bg-[var(--color-accent)] text-white rounded-xl hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '확인 중...' : '계정 찾기'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    clearTimerInterval();
                    setStep('phone');
                    setCode('');
                    setError('');
                    setTimer(0);
                  }}
                  className="w-full py-3 border border-[var(--color-border)] text-[var(--color-text)] rounded-xl hover:bg-[var(--color-bg)] transition-colors"
                >
                  다시 입력
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCode('');
                    setError('');
                    void sendCode();
                  }}
                  disabled={loading}
                  className="w-full py-2 text-sm text-[var(--color-accent)] hover:underline disabled:opacity-50"
                >
                  인증번호 재발송
                </button>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-4">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-[var(--color-text)] mb-2">
                  가입된 계정
                </h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {phone}로 가입된 계정입니다
                </p>
              </div>

              <div className="space-y-3">
                {accounts.map((account, index) => (
                  <div
                    key={`${account.email}-${account.provider}-${index}`}
                    className="p-4 bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[var(--color-text)]">
                        {getProviderName(account.provider)}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {new Date(account.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    <p className="text-[var(--color-text)] font-mono">
                      {account.email}
                    </p>
                  </div>
                ))}
              </div>

              <Link
                href="/login"
                className="block w-full py-3 bg-[var(--color-accent)] text-white text-center rounded-xl hover:bg-[var(--color-accent-hover)] transition-colors"
              >
                로그인하기
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
