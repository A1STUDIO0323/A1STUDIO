import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getAdminClient } from '@/lib/supabase/admin';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';

/**
 * 신규 가입 도중 거절된 사용자 정리:
 *  - 카카오/구글 콜백에서 휴대폰 중복 등의 사유로 가입을 막을 때,
 *    이미 생성된 auth.users + public.users 행이 "빈 프로필"로 남아
 *    로그인 상태가 유지되는 문제를 막는다.
 *  - service_role 로 새로 생성된 auth.users 를 삭제하고 세션도 종료한다.
 */
async function rejectNewSignup(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  reason: string
) {
  console.warn(`[auth/callback] 신규 가입 거절 정리 시작 userId=${userId} reason=${reason}`);
  try {
    // 1) public.users 정리 — 트리거가 자동 생성했을 수 있으므로 본인 행만 삭제
    await prisma.users.deleteMany({ where: { id: userId } }).catch((e) => {
      console.error('[auth/callback] public.users 삭제 실패', e);
    });
    // 2) auth.users 정리 — service_role 필요
    const admin = getAdminClient();
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error('[auth/callback] auth.users 삭제 실패', delErr);
    }
  } catch (e) {
    console.error('[auth/callback] 가입 거절 정리 중 예외', e);
  }
  // 3) 현재 세션 종료 (쿠키 제거)
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error('[auth/callback] signOut 실패', e);
  }
  console.warn(`[auth/callback] 신규 가입 거절 정리 완료 userId=${userId}`);
}

function prismaPayloadFromAuthUser(user: SupabaseAuthUser) {
  const email = (user.email ?? '').trim().toLowerCase() || null;
  const userName =
    typeof user.user_metadata?.name === 'string'
      ? user.user_metadata.name
      : typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : null;
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === 'string'
      ? user.user_metadata.avatar_url
      : typeof user.user_metadata?.picture === 'string'
        ? user.user_metadata.picture
        : null;
  const provider =
    typeof user.app_metadata?.provider === 'string'
      ? user.app_metadata.provider
      : null;
  return { email, userName, avatarUrl, provider };
}

function sanitizePostAuthRedirect(next: string | null): string {
  if (!next) return '/';
  if (next.startsWith('/') && !next.startsWith('//')) return next;
  return '/';
}

const SIGNUP_CONSENT_COOKIE = 'a1_signup_consent';

/**
 * 약관 동의 게이트.
 *  - 회원가입 페이지에서 약관에 동의하면 OAuth 직전에 `a1_signup_consent` 쿠키에
 *    동의 내용을 담아 보낸다. 콜백에서 이 쿠키를 읽어 DB에 영구 저장한다.
 *  - 쿠키가 없고 DB에도 필수약관 동의 기록이 없으면 = 약관 동의를 거치지 않은
 *    신규 사용자(로그인 버튼으로 우회)로 보고, 회원가입 페이지(`/signup?needConsent=1`)로
 *    유도한다. 세션은 유지한 채 약관 동의만 추가로 받는다.
 *  - 반환값: { redirect } 가 있으면 호출부에서 즉시 그 경로로 리다이렉트해야 한다.
 */
async function resolveTermsConsent(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  user: SupabaseAuthUser
): Promise<{ redirect?: string }> {
  const raw = cookieStore.get(SIGNUP_CONSENT_COOKIE)?.value;

  // 1) 회원가입 페이지에서 보낸 동의 쿠키 처리
  if (raw) {
    try {
      const parsed = JSON.parse(decodeURIComponent(raw)) as {
        privacy?: boolean;
        terms?: boolean;
        marketing?: boolean;
      };

      if (parsed?.privacy === true && parsed?.terms === true) {
        const marketing = parsed.marketing === true;
        await prisma.users.upsert({
          where: { id: user.id },
          create: {
            id: user.id,
            email: user.email ?? null,
            provider: user.app_metadata?.provider ?? null,
            privacy_agreed: true,
            terms_agreed: true,
            marketing_agreed: marketing,
            terms_agreed_at: new Date(),
            updated_at: new Date(),
          },
          update: {
            privacy_agreed: true,
            terms_agreed: true,
            marketing_agreed: marketing,
            terms_agreed_at: new Date(),
            updated_at: new Date(),
          },
        });
        // 쿠키 폐기
        cookieStore.set(SIGNUP_CONSENT_COOKIE, '', { maxAge: 0, path: '/' });
        console.log('[auth/callback] 약관 동의 저장 완료(쿠키)', {
          userId: user.id,
          marketing,
        });
        return {};
      }

      console.warn('[auth/callback] 동의 쿠키에 필수약관 동의가 없음', {
        userId: user.id,
      });
    } catch (e) {
      console.error('[auth/callback] 동의 쿠키 파싱 실패', e);
    }
  }

  // 2) DB에 필수약관 동의 기록이 있는지 확인 (기존 회원은 백필로 true)
  try {
    const row = await prisma.users.findUnique({
      where: { id: user.id },
      select: { terms_agreed: true },
    });
    if (row?.terms_agreed) {
      return {};
    }
  } catch (e) {
    console.error('[auth/callback] 약관 동의 상태 조회 실패', e);
    // 조회 실패 시에도 안전하게 약관 동의를 받도록 유도
  }

  // 3) 약관 미동의 신규 사용자 → 회원가입 약관 동의 페이지로 유도 (세션 유지)
  console.warn('[auth/callback] 약관 미동의 신규 사용자 → /signup 유도', {
    userId: user.id,
    provider: user.app_metadata?.provider ?? null,
  });
  return { redirect: '/signup?needConsent=1' };
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizePostAuthRedirect(searchParams.get('next'));

  if (!code) {
    console.error('[auth/callback] code 파라미터 없음');
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] 세션 교환 실패:', error.message);
    return NextResponse.redirect(`${origin}/login?error=session_failed`);
  }

  const { data: { user } } = await supabase.auth.getUser();

  // 카카오 OAuth: 카카오 API 직접 호출로 사용자 정보 저장
  if (user && user.app_metadata?.provider === 'kakao') {
    try {
      // 카카오 메타데이터 구조 확인용 디버깅 로그
      if (process.env.NODE_ENV !== 'production') {
        logger.log('=== OAuth 콜백 디버깅 ===');
        logger.log('Provider:', user.app_metadata?.provider);
        logger.log('User metadata:', JSON.stringify(user.user_metadata, null, 2));
        logger.log('App metadata:', JSON.stringify(user.app_metadata, null, 2));
        logger.log('========================');
      }

      const { avatarUrl, provider } = prismaPayloadFromAuthUser(user);

      // 카카오 API에서 직접 정보 가져오기
      let kakaoBirthyear: number | null = null;
      let kakaoPhone: string | null = null;
      let kakaoRealName: string | null = null;
      let kakaoNickname: string | null = null;

      try {
        // Supabase 세션에서 provider_token 가져오기
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.provider_token;

        if (accessToken) {
          // 카카오 사용자 정보 API 호출
          const kakaoUserResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
            },
          });

          if (kakaoUserResponse.ok) {
            const kakaoUserData = await kakaoUserResponse.json();
            if (process.env.NODE_ENV !== 'production') {
              logger.log('[auth/callback] 카카오 API 응답:', JSON.stringify(kakaoUserData, null, 2));
            }

            // 실명 추출
            if (kakaoUserData.kakao_account?.name) {
              kakaoRealName = kakaoUserData.kakao_account.name;
            }

            // 닉네임 추출
            if (kakaoUserData.kakao_account?.profile?.nickname) {
              kakaoNickname = kakaoUserData.kakao_account.profile.nickname;
            }

            // birthyear 추출
            if (kakaoUserData.kakao_account?.birthyear) {
              kakaoBirthyear = parseInt(kakaoUserData.kakao_account.birthyear, 10);
            }

            // phone_number 추출 및 변환: +821012345678 → 01012345678
            if (kakaoUserData.kakao_account?.phone_number) {
              kakaoPhone = kakaoUserData.kakao_account.phone_number
                .replace(/\s/g, '') // 공백 제거
                .replace(/-/g, '') // 하이픈 제거
                .replace('+82', '0'); // +82 → 0
            }
          } else {
            if (process.env.NODE_ENV !== 'production') {
              logger.warn('[auth/callback] 카카오 API 응답 실패:', kakaoUserResponse.status);
            }
          }
        }
      } catch (error) {
        console.error('[auth/callback] 카카오 API 호출 실패:', error);
      }

      // 전화번호 중복 체크 (다른 사용자가 이미 사용 중인지)
      if (kakaoPhone) {
        const existingByPhone = await prisma.users.findUnique({
          where: { phone: kakaoPhone },
          select: { id: true, email: true },
        });

        // 다른 사용자가 이미 이 전화번호 사용 중
        if (existingByPhone && existingByPhone.id !== user.id) {
          console.error('[auth/callback] 전화번호 중복:', {
            kakaoPhone,
            existingEmail: existingByPhone.email,
            newEmail: user.email,
            newUserId: user.id,
          });

          // 빈 프로필 + 로그인 상태로 남는 문제 방지:
          // 방금 생성된 auth.users / public.users 행을 삭제하고 세션 종료
          await rejectNewSignup(supabase, user.id, 'phone_duplicate');

          return NextResponse.redirect(
            new URL('/signup/error?reason=phone_duplicate', request.url)
          );
        }
      }

      // 프로필 저장
      if (kakaoRealName || kakaoNickname || kakaoBirthyear || kakaoPhone) {
        try {
          // update 데이터 동적 생성
          const updateData: Record<string, unknown> = {};

          if (kakaoRealName) updateData.name = kakaoRealName;
          if (kakaoNickname) updateData.nickname = kakaoNickname;
          if (kakaoBirthyear) updateData.birth_year = kakaoBirthyear;
          if (kakaoPhone) {
            updateData.phone = kakaoPhone;
            updateData.phone_verified = true;
          }
          if (avatarUrl) updateData.avatar_url = avatarUrl;
          updateData.updated_at = new Date();

          // 트리거 실행 여부와 무관하게 안전하게 처리
          const existing = await prisma.users.findUnique({
            where: { id: user.id },
          });

          if (existing) {
            await prisma.users.update({
              where: { id: user.id },
              data: updateData,
            });
          } else {
            await prisma.users.create({
              data: {
                id: user.id,
                email: user.email ?? null,
                name: kakaoRealName ?? null,
                nickname: kakaoNickname ?? null,
                avatar_url: avatarUrl ?? null,
                provider,
                birth_year: kakaoBirthyear,
                phone: kakaoPhone,
                phone_verified: kakaoPhone ? true : false,
                updated_at: new Date(),
              },
            });
          }
          if (process.env.NODE_ENV !== 'production') {
            logger.log('[auth/callback] 카카오 프로필 자동 저장 완료:', {
              name: kakaoRealName,
              nickname: kakaoNickname,
              birth_year: kakaoBirthyear,
              phone: kakaoPhone,
              updateData,
            });
          }
        } catch (err) {
          console.error('[auth/callback] 카카오 프로필 저장 오류:', err);
        }
      }

      // 약관 동의 게이트: 미동의 신규 사용자는 회원가입 약관 동의로 유도
      const consentGate = await resolveTermsConsent(cookieStore, user);
      if (consentGate.redirect) {
        return NextResponse.redirect(new URL(consentGate.redirect, request.url));
      }

      // 카카오: 저장 직후 프로필 다시 조회
      const profile = await prisma.users.findUnique({
        where: { id: user.id },
        select: { name: true, birth_year: true, phone: true, phone_verified: true },
      });

      let redirectPath = next || '/';

      if (process.env.NODE_ENV !== 'production') {
        logger.log('[auth/callback] === 온보딩 체크 시작 ===');
        logger.log('[auth/callback] profile:', JSON.stringify(profile));
        logger.log('[auth/callback] !name:', !profile?.name, '!birth_year:', !profile?.birth_year, '!phone_verified:', !profile?.phone_verified);
      }

      if (!profile?.name || !profile?.birth_year) {
        redirectPath = '/onboarding/profile';
        if (process.env.NODE_ENV !== 'production') {
          logger.log('[auth/callback] → /onboarding/profile (이름 또는 출생연도 없음)');
        }
      } else if (!profile?.phone_verified) {
        redirectPath = '/onboarding/phone';
        if (process.env.NODE_ENV !== 'production') {
          logger.log('[auth/callback] → /onboarding/phone (전화번호 미인증)');
        }
      } else {
        // 온보딩 완료: next가 온보딩 경로면 무시하고 홈으로
        const isOnboardingPath = next?.startsWith('/onboarding');
        redirectPath = isOnboardingPath ? '/' : (next || '/');
        if (process.env.NODE_ENV !== 'production') {
          logger.log('[auth/callback] → 홈 (온보딩 완료)', 'next:', next, '→', redirectPath);
        }
      }

      if (process.env.NODE_ENV !== 'production') {
        logger.log('[auth/callback] 최종 redirectPath:', redirectPath);
        logger.log('[auth/callback] ========================');
        logger.log('[auth/callback] 카카오 리다이렉트:', redirectPath, '프로필:', profile);
      }
      return NextResponse.redirect(new URL(redirectPath, request.url));
    } catch (err) {
      console.error('[auth/callback] 카카오 처리 중 오류:', err);
      // 에러 발생 시에도 리다이렉트 처리
      return NextResponse.redirect(new URL(next || '/', request.url));
    }
  }

  // 구글 등 다른 OAuth는 기존 로직 사용
  // 온보딩 플로우: 프로필 완성도에 따라 리다이렉트
  if (user?.id) {
    try {
      // 약관 동의 게이트: 미동의 신규 사용자는 회원가입 약관 동의로 유도
      const consentGate = await resolveTermsConsent(cookieStore, user);
      if (consentGate.redirect) {
        return NextResponse.redirect(new URL(consentGate.redirect, request.url));
      }

      const profile = await prisma.users.findUnique({
        where: { id: user.id },
        select: { name: true, birth_year: true, phone: true, phone_verified: true },
      });

      let redirectPath = next || '/';

      // 1. 이름 또는 출생연도가 없으면 → 프로필 입력
      if (!profile?.name || !profile?.birth_year) {
        redirectPath = '/onboarding/profile';
      }
      // 2. 이름과 출생연도는 있지만 전화번호 미인증 → 전화번호 인증
      else if (!profile?.phone_verified) {
        redirectPath = '/onboarding/phone';
      }
      // 3. 모두 완료 → 원래 목적지 또는 홈
      else {
        redirectPath = next || '/';
      }

      if (process.env.NODE_ENV !== 'production') {
        logger.log('[auth/callback] 리다이렉트:', redirectPath, '프로필:', profile);
      }
      return NextResponse.redirect(new URL(redirectPath, request.url));
    } catch (err) {
      console.error('[auth/callback] 온보딩 리다이렉트 오류:', err);
    }
  }

  return NextResponse.redirect(new URL(next || '/', request.url));
}
