# Vercel 배포 가이드

## 1. Vercel 환경변수 설정

Vercel 대시보드에서 다음 환경변수를 설정해야 합니다:

### 필수 환경변수

⚠️ 모든 비밀값은 `.env.local` 파일에서 복사하세요.

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL="[.env.local에서 복사]"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="[.env.local에서 복사]"
SUPABASE_SERVICE_ROLE_KEY="[.env.local에서 복사]"

# 사이트 URL (Vercel 도메인으로 변경)
NEXT_PUBLIC_SITE_URL="https://your-app.vercel.app"

# 데이터베이스
DATABASE_URL="[.env.local에서 복사]"
DIRECT_URL="[.env.local에서 복사]"

# 관리자 비밀번호
ADMIN_PASSWORD="[.env.local에서 복사]"

# Google OAuth
GOOGLE_CLIENT_ID="[.env.local에서 복사]"
NEXT_PUBLIC_GOOGLE_CONFIGURED="true"

# Kakao OAuth
AUTH_KAKAO_ID="[.env.local에서 복사]"
AUTH_KAKAO_SECRET="[.env.local에서 복사]"
NEXT_PUBLIC_KAKAO_CONFIGURED="true"

# KakaoPay
KAKAOPAY_SECRET_KEY="[.env.local에서 복사]"
KAKAOPAY_CID="TC0ONETIME"
KAKAOPAY_PARTY_CID="TC0ONETIME"

# SMS (SOLAPI)
SMS_PROVIDER="auto"
SOLAPI_API_KEY="[.env.local에서 복사]"
SOLAPI_API_SECRET="[.env.local에서 복사]"
SOLAPI_FROM_NUMBER="[.env.local에서 복사]"
SOLAPI_KAKAO_ENABLED="false"

# 기타
NEXT_PUBLIC_PHONE_OTP_ENABLED="true"
NEXT_PUBLIC_BOOKING_ENABLED="true"
NEXT_PUBLIC_PARTY_ROOM_EVENT_ACTIVE="true"
```

## 2. OAuth 리다이렉트 URL 업데이트

### Google OAuth (Google Cloud Console)
```
승인된 리디렉션 URI에 추가:
https://your-app.vercel.app/api/auth/callback/google
https://your-app.vercel.app/auth/callback
```

### Kakao OAuth (Kakao Developers)
```
Redirect URI에 추가:
https://your-app.vercel.app/api/auth/callback/kakao
https://your-app.vercel.app/auth/callback
```

## 3. 배포 명령어

```bash
# Vercel CLI로 배포
vercel

# 또는 프로덕션 배포
vercel --prod

# 또는 GitHub 연동 후 자동 배포
# (main 브랜치에 push하면 자동 배포)
```

## 4. 배포 후 확인사항

- [ ] 메인 페이지 접속 확인
- [ ] 로그인 테스트 (Google, Kakao)
- [ ] 예약 생성/취소 테스트
- [ ] 포인트 충전/사용 테스트
- [ ] SMS 발송 테스트
- [ ] 계정 탈퇴 테스트

## 5. 모바일 접속

배포 후 생성된 URL로 핸드폰에서 접속:
```
https://your-app.vercel.app
```

## 6. 커스텀 도메인 설정 (선택)

Vercel 대시보드 > Settings > Domains에서 도메인 연결 가능:
```
예: a1studio.com
```

## 주의사항

1. **localhost:3000**은 로컬 개발용입니다
2. **NEXT_PUBLIC_SITE_URL**을 Vercel 도메인으로 설정해야 합니다
3. **OAuth 리다이렉트 URL**을 각 플랫폼에 등록해야 합니다
4. **환경변수는 Vercel 대시보드에서 설정**합니다 (.env.local은 로컬용)
