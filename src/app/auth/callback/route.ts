import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
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

  // OAuth로 auth.users에 생성된 동일 id로 public.profiles(Prisma User) 동기화
  if (user?.id) {
    try {
      // 카카오 메타데이터 구조 확인용 디버깅 로그
      console.log('=== OAuth 콜백 디버깅 ===');
      console.log('Provider:', user.app_metadata?.provider);
      console.log('User metadata:', JSON.stringify(user.user_metadata, null, 2));
      console.log('App metadata:', JSON.stringify(user.app_metadata, null, 2));
      console.log('========================');

      const { email, userName, avatarUrl, provider } = prismaPayloadFromAuthUser(user);
      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          email,
          name: userName,
          avatarUrl,
          provider,
        },
        create: {
          id: user.id,
          email,
          name: userName,
          avatarUrl,
          provider,
        },
      });
    } catch (e) {
      console.error('[auth/callback] Prisma profiles 동기화 실패:', e);
    }
  }

  // 카카오 OAuth: 카카오 API 직접 호출로 사용자 정보 저장
  if (user && user.app_metadata?.provider === 'kakao') {
    try {
      const meta = user.user_metadata ?? {};
      const name = meta.name || meta.full_name;

      // 카카오 API에서 직접 정보 가져오기
      let kakaoBirthyear: number | null = null;
      let kakaoPhone: string | null = null;

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
            console.log('[auth/callback] 카카오 API 응답:', JSON.stringify(kakaoUserData, null, 2));

            // birthyear 추출
            if (kakaoUserData.kakao_account?.birthyear) {
              kakaoBirthyear = parseInt(kakaoUserData.kakao_account.birthyear, 10);
            }

            // phone_number 추출 및 변환: +821012345678 → 01012345678
            if (kakaoUserData.kakao_account?.phone_number) {
              kakaoPhone = kakaoUserData.kakao_account.phone_number
                .replace(/^\+82/, '0')
                .replace(/\D/g, '');
            }
          } else {
            console.warn('[auth/callback] 카카오 API 응답 실패:', kakaoUserResponse.status);
          }
        }
      } catch (error) {
        console.error('[auth/callback] 카카오 API 호출 실패:', error);
      }

      // 프로필 저장
      if (name || kakaoBirthyear || kakaoPhone) {
        try {
          const data: {
            name?: string;
            birthYear?: number;
            phone?: string;
            phoneVerified?: boolean;
          } = {};
          if (name) data.name = String(name);
          if (kakaoBirthyear) data.birthYear = kakaoBirthyear;
          if (kakaoPhone) {
            data.phone = kakaoPhone;
            data.phoneVerified = true;
          }

          if (Object.keys(data).length > 0) {
            await prisma.user.update({
              where: { id: user.id },
              data,
            });
            console.log('[auth/callback] 카카오 프로필 자동 저장 완료:', data);
          }
        } catch (err) {
          console.error('[auth/callback] 카카오 프로필 저장 오류:', err);
        }
      }
    } catch (err) {
      console.error('[auth/callback] 카카오 처리 중 오류:', err);
    }
  }

  // 온보딩 플로우: 프로필 완성도에 따라 리다이렉트
  if (user?.id) {
    try {
      const profile = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true, birthYear: true, phone: true, phoneVerified: true },
      });

      let redirectPath = next || '/';

      // 1. 이름 또는 출생연도가 없으면 → 프로필 입력
      if (!profile?.name || !profile?.birthYear) {
        redirectPath = '/onboarding/profile';
      }
      // 2. 이름과 출생연도는 있지만 전화번호 미인증 → 전화번호 인증
      else if (!profile?.phoneVerified) {
        redirectPath = '/onboarding/phone';
      }
      // 3. 모두 완료 → 원래 목적지 또는 홈
      else {
        redirectPath = next || '/';
      }

      console.log('[auth/callback] 리다이렉트:', redirectPath, '프로필:', profile);
      return NextResponse.redirect(new URL(redirectPath, request.url));
    } catch (err) {
      console.error('[auth/callback] 온보딩 리다이렉트 오류:', err);
    }
  }

  return NextResponse.redirect(new URL(next || '/', request.url));
}
