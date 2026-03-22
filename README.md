# A1STUDIO

Next.js + Supabase Auth 기반의 A1STUDIO 웹 프로젝트입니다.

## 시작하기

### 1) 의존성 설치

```bash
npm install
```

### 2) 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`을 열어 확인합니다.

## 주요 스크립트

- `npm run dev`: 개발 서버 실행
- `npm run build`: 프로덕션 빌드
- `npm run start`: 빌드 결과 실행
- `npm run lint`: ESLint 실행

## 인증 (Supabase Auth)

프로젝트의 메인 인증은 Supabase Auth입니다.

### 1) Dashboard URL Configuration

Supabase Dashboard -> `Authentication` -> `URL Configuration`

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/**`

배포 후에는 배포 도메인 URL도 동일하게 추가하세요.

### 2) Required Environment Variables

`.env.local`에 아래 값을 설정하세요.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (예: `http://localhost:3000`)

### 3) OAuth 콜백 경로

- 콜백 라우트: `/auth/callback`
- 로그인 후 보호 페이지 예시: `/dashboard`

## 프로필 테이블 + RLS

앱 전용 사용자 정보는 `public.profiles` 테이블에 저장합니다.

1. Supabase SQL Editor 열기
2. 루트의 `supabase_profiles_rls.sql` 실행

`/api/members/sync`는 로그인 후 `profiles`에 `upsert`를 시도하며,
테이블/정책이 아직 없으면 메인 로그인 흐름은 막지 않도록 안전 처리되어 있습니다.
