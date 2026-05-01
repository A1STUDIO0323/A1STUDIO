import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { User as SupabaseAuthUser } from '@supabase/supabase-js';

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
          });

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
