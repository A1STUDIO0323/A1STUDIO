import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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

  // 카카오 OAuth: user_metadata 자동 저장
  const { data: { user } } = await supabase.auth.getUser();
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
      
      // 프로필 저장
      try {
        const profilePayload: any = {};
        if (name) profilePayload.name = name;
        if (birthyear) profilePayload.birthYear = parseInt(birthyear, 10);
        if (phone) {
          profilePayload.phone = phone;
          profilePayload.phoneVerified = true; // 카카오 인증 완료
        }
        
        const profileRes = await fetch(`${origin}/api/members/profile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; '),
          },
          body: JSON.stringify(profilePayload),
        });
        
        if (!profileRes.ok) {
          console.error('[auth/callback] 프로필 저장 실패:', await profileRes.text());
        } else {
          console.log('[auth/callback] 카카오 프로필 자동 저장 완료:', profilePayload);
        }
      } catch (err) {
        console.error('[auth/callback] 프로필 저장 오류:', err);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
