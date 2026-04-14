# 📱 모바일 접속 및 Vercel 배포 가이드

## 현재 상황

- **로컬 개발**: `localhost:3000` (본인 컴퓨터에서만 접속 가능)
- **핸드폰 접속**: ❌ 불가능 (localhost는 로컬 머신만 접근 가능)
- **Vercel 배포 후**: ✅ 가능 (실제 URL로 어디서든 접속)

---

## 🚀 Vercel 배포 단계

### 1. Vercel에 프로젝트 배포

```bash
# Vercel CLI 설치 (처음 한 번만)
npm install -g vercel

# Vercel 로그인
vercel login

# 배포
vercel

# 프로덕션 배포 (처음엔 vercel만 실행)
vercel --prod
```

배포 시 나오는 URL 예시:
```
https://a1studio-xxx.vercel.app
```

---

### 2. Vercel 환경변수 설정

**Vercel 대시보드** > **프로젝트** > **Settings** > **Environment Variables**

#### 🔴 반드시 변경해야 할 것

```bash
# ⚠️ LOCALHOST를 Vercel 도메인으로 변경!
NEXT_PUBLIC_SITE_URL="https://a1studio-xxx.vercel.app"
```

#### 🟡 복사해야 할 것 (.env.local에서 복사)

```bash
# Database
DATABASE_URL="[.env.local에서 복사]"
DIRECT_URL="[.env.local에서 복사]"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="[.env.local에서 복사]"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="[.env.local에서 복사]"
SUPABASE_SERVICE_ROLE_KEY="[.env.local에서 복사]"

# Admin
ADMIN_PASSWORD="[.env.local에서 복사]"

# Google OAuth
GOOGLE_CLIENT_ID="[.env.local에서 복사]"
GOOGLE_CLIENT_SECRET="[.env.local에서 복사]"
NEXT_PUBLIC_GOOGLE_CONFIGURED="true"

# Kakao OAuth
AUTH_KAKAO_ID="[.env.local에서 복사]"
AUTH_KAKAO_SECRET="[.env.local에서 복사]"
BETTER_AUTH_SECRET="[.env.local에서 복사]"
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

# Features
NEXT_PUBLIC_PHONE_OTP_ENABLED="true"
NEXT_PUBLIC_BOOKING_ENABLED="true"
NEXT_PUBLIC_PARTY_ROOM_EVENT_ACTIVE="true"
```

---

### 3. OAuth 리다이렉트 URL 업데이트

#### Google OAuth (Google Cloud Console)

1. https://console.cloud.google.com 접속
2. **사용자 인증 정보** > 기존 OAuth 2.0 클라이언트 ID 클릭
3. **승인된 리디렉션 URI**에 추가:

```
https://a1studio-xxx.vercel.app/api/auth/callback/google
https://a1studio-xxx.vercel.app/auth/callback
```

#### Kakao OAuth (Kakao Developers)

1. https://developers.kakao.com 접속
2. **내 애플리케이션** > 앱 선택
3. **카카오 로그인** > **Redirect URI**에 추가:

```
https://a1studio-xxx.vercel.app/api/auth/callback/kakao
https://a1studio-xxx.vercel.app/auth/callback
```

---

### 4. 배포 후 재배포

환경변수를 설정한 후 **반드시 재배포**해야 적용됩니다:

```bash
vercel --prod
```

또는 Vercel 대시보드에서 **Deployments** > **Redeploy**

---

## 📱 핸드폰에서 접속하기

배포가 완료되면:

```
https://a1studio-xxx.vercel.app
```

위 URL을 핸드폰 브라우저에 입력하면 접속 가능합니다!

---

## 🎯 커스텀 도메인 설정 (선택)

Vercel 대시보드 > **Settings** > **Domains**에서 도메인 연결:

```
예: a1studio.com
    www.a1studio.com
```

도메인 연결 후 `NEXT_PUBLIC_SITE_URL`도 업데이트:
```bash
NEXT_PUBLIC_SITE_URL="https://a1studio.com"
```

---

## ⚠️ 중요 주의사항

### localhost:3000은 사용하면 안 되는 경우

- ❌ Vercel 배포 시
- ❌ 핸드폰 접속 시
- ❌ 다른 기기에서 접속 시
- ❌ 프로덕션 환경

### localhost:3000을 사용해도 되는 경우

- ✅ 로컬 개발 중
- ✅ 본인 컴퓨터에서만 테스트

---

## 🔍 환경 확인

### 로컬 개발
```bash
.env.local:
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

접속:
http://localhost:3000
```

### Vercel 배포
```bash
Vercel 환경변수:
NEXT_PUBLIC_SITE_URL="https://a1studio-xxx.vercel.app"

접속:
https://a1studio-xxx.vercel.app (PC, 핸드폰 모두 가능!)
```

---

## 📞 문제 해결

### "로그인 후 code가 URL에 남아요"
→ Header에서 자동으로 제거됩니다 (구현 완료)

### "핸드폰에서 접속이 안돼요"
→ Vercel에 배포 후 생성된 URL로 접속하세요

### "OAuth 로그인이 안돼요"
→ Google/Kakao 콘솔에서 리다이렉트 URI를 Vercel 도메인으로 추가하세요

### "결제가 안돼요"
→ KakaoPay 관리자 콘솔에서도 도메인 등록이 필요할 수 있습니다
