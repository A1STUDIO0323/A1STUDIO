# A1 STUDIO — AI 전달용 요약 (Brief)

<!--
  버전: 1.1
  최종 동기: 2026-05-03
  동기 원본: AI_TRANSFER_PROMPT.md (전체 컨텍스트, 역사·SQL·테스트 포함)
-->

> **역할**: 다른 AI가 *이 레포가 무엇인지*, *어떤 계층을 건드릴지*, *전체 프롬프트를 붙일지 여부*를 빠르게 판단할 때 사용한다.  
> **상세·날짜별 변경 로그·SQL 스니펫·긴 테스트 시나리오**는 루트의 **`AI_TRANSFER_PROMPT.md`** 를 연다.

---

## 1. 한 줄 요약

연습실·파티룸 **예약·결제·포인트**, **Supabase 인증**, **Prisma(DB)**, 공지·이벤트·문의·**자유게시판**, **관리자 화면**을 포함하는 **Next.js(App Router)** 사이트.

---

## 2. 기술 스택

| 구분 | 내용 |
|------|------|
| 프레임워크 | Next.js 16+, React 19, TypeScript(strict) |
| 스타일 | Tailwind CSS 4, 디자인 토큰은 `globals.css` CSS 변수 (`--color-*` 등) |
| DB ORM | Prisma 7 → PostgreSQL (`prisma/schema.prisma`, URL은 `prisma.config.ts`) |
| 인증 | Supabase Auth (`@supabase/ssr`), 콜백 `/auth/callback` |
| 검증 | Zod |
| 기타 | KakaoPay 연동 헬퍼, SMS(SOLAPI 등), bcrypt(관리자 비번 옵션) |

별칭: `@/*` → `src/*` (`tsconfig.json`).

---

## 3. 인증 · 세션 · 온보딩

- **소셜**: Google / Kakao. 카카오는 콜백 등에서 Kakao API + Prisma `users` 정합 처리.
- **프로필**: `public.profiles` / Prisma `User`와 정렬(온보딩·미들웨어에서 `phoneVerified` 등 사용).
- **미들웨어**: 프로젝트 루트 `middleware.ts` — 보호 라우트·온보딩 분기(프로덕션에서 프로필 실패 시 `/login` 등).
- **관리자 UI**: `src/lib/admin-context.tsx` + `AdminProvider`(`Providers`). 관리자 API 다수는 **로그인된 Supabase 사용자** + **`x-admin-password`** 헤더 = 서버 **`ADMIN_PASSWORD`**(또는 별도 해시 비교는 `POST /api/admin/auth` 등 문서 참고).

---

## 4. 데이터 · 운영 원칙 (한 줄씩)

- **`auth` 스키마(Supabase)** 와 **`public` 앱 테이블** 역할을 섞지 않는다. FK·RLS·트리거 변경 시 Prisma·대시보드 SQL·앱 코드 **동시에** 고려.
- **포인트 차감/환불**은 가능하면 **Supabase RPC**(SECURITY DEFINER) 경로; 예약 INSERT 실패 시 환불·락 해제 로직이 `reservations/create` 등에 있다.
- **결제 중복 방지**: `src/lib/payment-lock.ts` — ready 전 만료 정리, 활성 락 시 **409 + `retryAfter`**, cancel/fail/approve에서 락 해제. 예약 카카오/포인트 락 `lock_type`은 **`reservation`**(충전은 **`charge`**).
- **결제 에러 메시지**: `src/lib/payment-errors.ts` — API 실패 시 `error`(한글) + `reason`(머신 코드).

---

## 5. 도메인 ↔ 대표 경로

| 도메인 | 페이지·API 예 |
|--------|----------------|
| 연습실 예약 | `/booking`, `/api/reservations/*`, `/api/reservations/payments/kakao/*` |
| 파티룸 | `/party-room/booking`, `/api/party-room/reservations/*`, `.../payments/kakao/*` |
| 포인트 충전 | `/charge`, `/api/charge/ready`, `approve` |
| 회원·프로필 | `/api/members/profile`, `sync`, `withdraw` · 온보딩 `/onboarding/*` |
| 공지·이벤트 | `/notices`, `/events`, `/api/notices`, `/api/events` |
| 자유게시판 | `/board`, `/board/write`, `/board/[id]`, `/api/board/*` · Prisma `BoardPost`(테이블 `board_posts`), `categoryText` |
| 관리자 | `/admin`, `/admin/members`, `/admin/reviews`, `/admin/board`, `/api/admin/*` |
| 원데이클래스 | `/one-day-class/**`, `/api/one-day-class` |

관리자 **게시판 일괄 삭제**: `GET`·`DELETE` **`/api/admin/board`** (`postIds`), UI **`/admin/board`**.

---

## 6. `src` 구조 감각 (완전한 트리 아님)

- `src/app/` — 페이지 + `api/**/route.ts`
- `src/components/` — `layout`(Header/Footer/Providers), `home/*` 등
- `src/lib/` — `db`(Prisma), `supabase/*`, `pricing`, `refund-policy`, `kakaopay`, `payment-lock`, `payment-errors`, `sms*`, `logger` 등

---

## 7. 환경 변수 (이름만 기억)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, 관리자 `ADMIN_PASSWORD` / `ADMIN_PASSWORD_HASH`, KakaoPay·결제 CID/시크릿 계열, SMS·메일 발송용 키 — **실제 목록과 값 규칙은 `.env` 예시 또는 `AI_TRANSFER_PROMPT.md`** .

로컬·Vercel 절차 예시는 **`MOBILE_ACCESS.md`**, **`VERCEL_DEPLOY.md`** — 블록 안에 **쓰이지 않는 키**(예: 별도 Better Auth 시크릿, Next 앱 전용 Google 클라이언트 시크릿)는 넣지 않도록 정리됨. OAuth·세션은 **Supabase 대시보드**와 `AUTH_*` 계열을 우선 본다.

---

## 8. 빌드 · 품질

- `npm run build` → `prisma generate && next build` (`package.json`)
- Vercel: 루트 `vercel.json`에서 generate·빌드 순서 고정될 수 있음(전체 문서 참고)

---

## 9. 안정성 UX (자주 언급되는 파일)

- `src/app/error.tsx`, `not-found.tsx`, `global-error.tsx`
- `src/lib/logger.ts` — 프로덕션에서 과한 콘솔 노이즈 완화용

---

## 10. 문서 맵 (다른 AI용)

| 파일 | 용도 |
|------|------|
| **`AI_TRANSFER_BRIEF.md`** (본 문서) | 범위·스택·도메인만 — 프롬프트 짧게 시작할 때 |
| **`AI_TRANSFER_PROMPT.md`** | 스키마·결제·OAuth·날짜별 변경·테스트까지 **전부** |
| **`README.md`** | 로컬 실행·Supabase URL 설정 |
| **`MOBILE_ACCESS.md`**, **`VERCEL_DEPLOY.md`** | 같은 기기·Vercel에서 접근할 때 URL·env 예시(불필요 키 제외) |

**권장**: 짧은 작업은 Brief + 관련 파일 몇 개만 첨부; 결제/DB/인증 대규모 변경은 **반드시** `AI_TRANSFER_PROMPT.md`의 최근 날짜 절을 함께 연다.
