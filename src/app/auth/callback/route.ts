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

  // 카카오 OAuth: user_metadata 자동 저장
  if (user && user.app_metadata?.provider === 'kakao') {
    const meta = user.user_metadata ?? {};
    
    // 카카오에서 받은 데이터 추출
    const name = meta.name || meta.full_name;
    const phoneNumber = meta.phone_number; // 예: +821012345678
    const birthyear = meta.birthyear; // 예: "1991"
    
    if (name || phoneNumber || birthyear) {
      // 전화번호 변환: +821012345678 → 01012345678
      let phone: string | undefined;
      if (phoneNumber && typeof phoneNumber === 'string') {
        phone = phoneNumber.replace(/^\+82/, '0').replace(/\D/g, '');
      }

      try {
        const data: {
          name?: string;
          birthYear?: number;
          phone?: string;
          phoneVerified?: boolean;
        } = {};
        if (name) data.name = String(name);
        if (birthyear) {
          const y = parseInt(String(birthyear), 10);
          if (!Number.isNaN(y)) data.birthYear = y;
        }
        if (phone) {
          data.phone = phone;
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
  }

  return NextResponse.redirect(`${origin}${next}`);
}
