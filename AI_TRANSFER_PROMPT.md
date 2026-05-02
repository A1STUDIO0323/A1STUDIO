# A1 STUDIO 웹사이트 - 완전한 프로젝트 컨텍스트

<!--
  AI_TRANSFER_PROMPT.md
  버전: 2.51
  최종 수정: 2026-05-03
  작성자: A1 STUDIO 개발팀
-->

> 이 문서는 A1 STUDIO 웹사이트의 전체 구조, 기능, 코드베이스를 다른 AI 어시스턴트(GPT, Claude 등)에게 전달하기 위한 포괄적인 가이드입니다.
>
> **짧은 판별용 요약**(스택·도메인·경로만): 루트 **`AI_TRANSFER_BRIEF.md`** — 프롬프트 길이를 줄일 때 우선 제공하고, 깊은 작업은 본 문서를 연다.

## 📌 문서 갱신 규칙 (AI / 개발자)

- **의미 있는 변경 직후**: 이 저장소의 코드·`prisma/schema.prisma`·API·인증·환경·배포와 관련된 작업을 끝낸 뒤, **`AI_TRANSFER_PROMPT.md`의 `## 📝 최근 수정 사항 (YYYY-MM-DD)`**에 **같은 날짜 블록을 새로 쓰거나, 같은 날짜 블록에 항목을 추가**한다. (대상 경로, 한 줄 요약, 주의할 점)
- **날짜**: 시스템/대화에 주어진 오늘 날짜(예: 2026-04-22)를 쓴다.
- **문서 끝 메타**: 작업이 이 문서를 건드릴 때마다 `**작성일**`·`**버전**`을 갱신한다. (이전 `최근 수정 사항`의 구체 서술은 **삭제하지 말고** 누적한다.)
- **자동 강제(에이전트)**: 이 저장소 루트의 `.cursor/rules/ai-transfer-prompt-sync.mdc`에 동일 취지의 규칙을 둔다. Cursor/에이전트는 코드 변경 수행 시 위 절차를 **기본 수행**으로 둔다.

---

## 🔧 최근 주요 변경사항

요약·운영 관점에서 자주 참조하는 변경이다. (일자는 **문서화 기준**이며, 정확한 반영 시점은 `git log`로 확인한다.)

### PaymentLock 자동 삭제 및 만료 락 정리 (2026-04-25, 커밋 `b83db1b`)

**문제:**

- 카카오페이 결제 취소/실패 시 `payment_locks` 행이 남아 재시도 시 **409** 가 나기 쉬움.
- 만료 전까지 사용자가 대기해야 하는 UX.

**해결:**

1. **`src/lib/payment-lock.ts` 헬퍼**
   - `deleteExpiredPaymentLocksForUser(userId, lockType)` — 해당 사용자·타입의 **만료된 락만** 삭제.
   - `getActivePaymentLocksForUser(userId, lockType)` — **활성 락** 조회, `retryAfter`(초) 계산에 사용.
2. **연습실·파티룸 카카오 `fail` / `cancel`**
   - 쿠키의 주문 ID로 **`releasePaymentLock`** 후 관련 쿠키 삭제.
   - 락 해제 중 예외가 나도 **리다이렉트는 진행** (로그만 남김).
3. **`ready` 라우트** (`practice-room` / `party-room`)
   - ready 직전 **만료 락 정리** 후, 활성 락이 있으면 **409 + `retryAfter`**.
   - `acquirePaymentLock` 실패 시에도 가능하면 동일 **409** 패턴, 아니면 **500**.
4. **클라이언트** (`/booking`, `/party-room/booking`)
   - **409** 이고 응답에 **`retryAfter`** 가 있으면 “약 N분 후 재시도” 등 안내.
   - **`retryAfter` 없음** (예: 시간대 중복 409)은 기존처럼 **`error` 메시지**만 표시.

**영향:** 취소/실패 후 즉시 재시도 가능, 재시도 대기 시간 안내 명확화.

---

### 예약 생성 실패 시 포인트 자동 환불 (2026-04-25, 커밋 `d0aa9ae`)

**문제:**

- `deductPointsDB` 성공 후 `reservations` INSERT 실패 시, 예전에는 **`user_points` 직접 UPDATE** 로 환불을 시도했으나 **RLS** 등으로 실패할 수 있어 포인트가 복구되지 않을 위험이 있음.

**해결:**

1. **`refundPointsDB` 시그니처** (`src/lib/supabase-points.ts`)
   - `reservationId`를 **`reservationId?: string | null`** 로 선택화.
   - RPC 호출: `p_reservation_id: params.reservationId ?? null` — **예약 행이 없을 때 환불** 지원.
2. **Supabase `refund_points` RPC**
   - 운영 DB에서 **`p_reservation_id`에 `NULL`(또는 기본값) 허용**이 되어 있어야 한다. 기존이 `OUT` 파라미터형이면 **동일 취지로** 시그니처를 맞춘다. 아래는 **목표 예시**일 뿐이며, 실제 정의는 대시보드·마이그레이션과 **반드시 대조**할 것.

```sql
-- 예시: NULL 허용 (실제 프로젝트의 refund_points 정의와 일치시킬 것)
CREATE OR REPLACE FUNCTION public.refund_points(
  p_user_id UUID,
  p_points INTEGER,
  p_description TEXT,
  p_reservation_id UUID DEFAULT NULL
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER)  -- 또는 기존 OUT/o_* 호환 유지
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- ... 잔액 증가 + point_transactions 기록 ...
$$;
```

3. **`POST /api/reservations/create`** (`src/app/api/reservations/create/route.ts`)
   - INSERT 실패 시 **`releasePaymentLock`**(예약 락) 후 **`refundPointsDB`** 호출.
   - 환불 성공: **500** + “예약 생성에 실패했습니다. 포인트는 환불되었습니다.” + `balance_after`.
   - 환불 실패: **500** + `needsManualRefund: true` 등.

**영향:** 포인트 차감·예약 생성 불일치 시 **RPC 기반**으로 환불 경로 통일, RLS로 인한 수동 UPDATE 실패 위험 감소.

---

### 글로벌 에러 UI·프로덕션 로거·미들웨어 (2026-04-25, 커밋 `cf43f93`)

**목표:** 결제·예약 **코드 경로는 건드리지 않고** UX·운영 안정성만 보강.

**반영:**

1. **`src/app/error.tsx`** — App Router 글로벌 에러 바운더리, `reset`, 개발 시 스택 표시.
2. **`src/app/not-found.tsx`** — 404 페이지(홈·예약·문의 링크).
3. **`src/lib/logger.ts`** — 개발/프로덕션 분기 로그(`payment`·`info`는 프로덕션에서 메시지 위주). 라우트 연동은 선택.
4. **`middleware.ts`** — 프로필 검증 **`catch`**에서 **프로덕션만** `/login` 리다이렉트, **개발**은 통과(경고 로그).

**영향:** 처리되지 않은 렌더 예외·404 대응, 프로덕션에서 프로필 API 실패 시 무방비 통과 완화.

---

### Root `global-error`·OAuth 콘솔 가드·미들웨어 보강 로그·파티룸 tid 검증 (2026-04-25)

**목표:** 레이아웃·루트 실패 대응, 운영 콘솔 노이즈 감소, 결제 승인 요청 교차 검증 준비.

**반영:**

1. **`src/app/global-error.tsx`** — App Router **최상위** 에러 경계(`<html lang="ko"><body>…`), `globals.css` 로 CSS 변수 적용, 문구·`reset`만. **`console.error(error)`는 `NODE_ENV !== 'production'` 일 때만** (프로덕션 콘솔 억제).
2. **`src/lib/auth-client.tsx`**, **`src/app/auth/callback/route.ts`** — (1차) **`console.log` / `console.warn`** 만 **`process.env.NODE_ENV !== 'production'`** 가드, **`console.error`는 그대로**; (2차) 동일 경로는 **`logger`** 로 치환 — `## 📝 최근 수정 사항 (2026-04-25)` **§4**·`src/lib/logger.ts`.
3. **`middleware.ts`** (프로젝트 루트; `src/middleware.ts` 없음) — 프로필 fetch **`catch`** 안에 **`console.error('[middleware] session refresh failed:', err)`** 추가(production 포함). 리다이렉트·분기는 기존과 동일.
4. **`GET /api/party-room/payments/kakao/approve`** — 쿼리 **`tid`** 가 비어 있지 않으면 쿠키 **`party_kakao_tid`** 와 다를 때 **400** JSON **`{ error: 'tid_mismatch' }`** 후 즉시 return. 카카오 기본 성공 리다이렉트는 **`pg_token` 위주**라, **`tid` 쿼리가 없으면 이 검증은 발동하지 않음** — 상시 교차검증은 ready 단계 **`approval_url`** 에 `tid` 부착 등 후속 검토(코드 내 **`// TODO(stability):`**).

---

## 🔍 안정성 검토 (2026-04-25)

문서·코드 리뷰 관점의 **참고용 평가**이며, 점수는 상대적 지표다.

### 전문가 평가 결과 (요약)

**종합 점수:** 80/100 — 프로덕션 운영에 **참고 가능**한 수준(지속 개선 권장).

**해결된 Critical 급 이슈 (코드 반영):**

1. **결제·예약 불일치** — 예약 INSERT 실패 시 **`refundPointsDB`** 자동 환불.
2. **PaymentLock 동시성** — 만료 정리, fail/cancel/approve에서 **`releasePaymentLock`**, ready에서 **409 + `retryAfter`**.
3. **포인트 손실 완화** — 환불을 **SECURITY DEFINER RPC** 경로로 통일(운영 DB 정의 전제).

**남은 Warning (선택 개선):**

4. **Middleware** — 프로필 `catch`는 프로덕션에서 `/login` 처리(2026-04-23); 그 외 경로·시나리오 추가 강화는 선택.
5. **타입 안전성** — `as any` 등 점진적 제거.

**Good Points:**

- `.env*` gitignore, Zod 검증, RLS + Prisma 병행, 성인 검증, 포인트 차감 후 예약 생성 순서 등.
- 글로벌 **`error.tsx` · `not-found.tsx` · `global-error.tsx`**, **`src/lib/logger.ts`**(프로덕션 안전 로그 유틸, 연동은 선택), OAuth 경로 **`console.log`/`warn` 운영 억제**, 파티룸 승인 **`tid`/`party_kakao_tid` 불일치 400**.

**개선 우선순위 (선택):** 미들웨어 추가 시나리오 → 레이아웃별 에러 UI → 타입 정리.

---

## 🧪 중요 테스트 시나리오

### 결제·예약 안정성

**1. 포인트 정상 예약**

- `/booking`에서 포인트로 예약 → 차감 → `reservations` 행 생성 → (연락처 유효 시) 확정 SMS → 완료 페이지.

**2. 연습실 카카오페이 정상**

- 카카오 결제 완료 → approve → 예약 행·`kakaopay_*` → SMS → `payment_locks`(예약 결제 락 타입 **`reservation`**) 잔여 없음.

**3. 예약 INSERT 실패 후 환불**

- 의도적으로 INSERT 실패(스테이징에서 스키마 불일치 등) 시 응답에 “포인트는 환불되었습니다” 또는 `needsManualRefund`, `user_points`·`point_transactions`에 환불 기록 확인.

**4. 카카오 취소/실패 후 재시도**

- 결제창 취소 → cancel/fail URL → 쿠키 삭제·락 해제 → 같은 사용자로 ready 재호출 시 **409 없이** 진행 가능(활성 락만 없을 때).

**5. 진행 중 결제(활성 락)**

- 이전 결제가 아직 만료 전일 때 ready → **409 + `retryAfter`**, 클라이언트 분 단위 안내.

**6. 시간대 중복 409**

- `retryAfter` **없는** 409 → “이미 예약된 시간대” 등 **서버 `error` 문구**만 표시되는지 확인.

**7. 파티룸 카카오 승인 `tid` 불일치(선택)**

- `GET /api/party-room/payments/kakao/approve?pg_token=…&tid=…` 에서 **`tid` ≠ 쿠키 `party_kakao_tid`** 이면 **400** `tid_mismatch`. (기본 카카오 리다이렉트에 `tid`가 없으면 본 검증은 스킵될 수 있음.)

---

## 🧭 DB·스키마 변경 기본 지침 (SQL / Prisma / FK)

아래는 **Supabase(PostgreSQL)**, **Prisma**, **외래키(FK)** 를 건드릴 때 **다른 시스템과 겹치거나 이중 정의되지 않게** 수정하기 위한 **단계별 절차**다. AI·개발자 모두 이 순서를 기본으로 따른다.

### 1단계: “누가 주인인가” 먼저 정하기

- 같은 데이터를 **Supabase 대시보드 SQL**, **Prisma Migrate**, **Edge Function**, **앱 시드** 등 **두 갈래 이상**에서 동시에 정의·갱신하지 않는다.
- 예: `public` 테이블 구조는 **Prisma를 진실 원천으로 둘지**, **Supabase에서만 관리할지**를 먼저 정한 뒤, 반대쪽은 **읽기·동기화·문서**만 맞춘다.
- **`auth` 스키마**(Supabase Auth 관리)와 **`public` 스키마**(앱·Prisma)는 **역할이 다르다**. `auth.users`를 Prisma가 소유하도록 만들지 않는다.

### 2단계: 영향 범위 맵을 머릿속(또는 메모)에 그리기

- **FK가 가리키는 쪽**: `auth.users`인지, `public.users`(또는 `profiles`)인지, 다른 테이블인지.
- **RLS·Policy**: 해당 테이블에 Row Level Security가 켜져 있으면, SQL로 데이터·구조를 바꿔도 **API 동작이 달라질 수 있다**.
- **트리거·함수**: `BEFORE DELETE`, `handle_new_user` 등 **이미 걸린 트리거**와 새 FK/삭제 규칙이 **중복 삭제·이중 로그**를 만들지 않는지 확인한다.
- **앱 코드**: `src/lib/supabase-*`, `prisma.*`, Server Actions, API Route에서 **같은 테이블을 직접 쓰는지** 검색(`grep`)한다.

### 3단계: FK·크로스 스키마 수정 시

- `public.*` → `auth.users` FK는 Prisma(`schemas = ["public"]`만 사용)와 **인트로스펙션 충돌(P4002 등)** 이 나기 쉽다. FK를 추가·삭제·변경하기 전에 **Prisma 문서·이 저장소 `최근 수정 사항`·`prisma/scripts/`** 를 확인한다.
- FK **대상을 바꿀 때**(예: `auth.users` → `public.users`): **기존 제약 이름**을 `DROP CONSTRAINT IF EXISTS ...` 로 정리한 뒤 **한 번에 하나의 참조 무결성 경로**만 남긴다. **양쪽 모두 살아 있는 이중 FK**를 만들지 않는다.
- **ON DELETE CASCADE** 는 “한 번 삭제가 연쇄로 어디까지 가는지”를 반드시 검토한다. 결제·감사 로그 등 **보존이 필요한 테이블**과 겹치면 정책을 문서에 명시한다.

### 4단계: SQL을 직접 실행할 때

- **가능하면 스테이징/로컬 복제 DB**에서 먼저 실행한다.
- 트랜잭션으로 묶을 수 있으면 묶고, **롤백 스크립트 또는 백업 시점**을 남긴다.
- **이름 충돌 방지**: 새 테이블·인덱스·트리거·함수 이름이 **Supabase 기본 객체·확장·다른 프로젝트 마이그레이션**과 겹치지 않게 `public.` 접두사와 **프로젝트 고유 접두사(예: `a1_`)** 사용을 검토한다.
- 실행 후 **`최근 수정 사항`**에 “무엇을·왜·어떤 환경에서” 적었다.

### 5단계: Prisma 스키마를 바꿀 때

- `schema.prisma` 변경 → **`npx prisma validate`** → 필요 시 **`prisma migrate dev`** 또는 팀이 정한 배포 절차.
- **`db pull`로 끌어온 필드명**(snake_case 그대로 등)과 **앱 코드의 필드명**이 어긋나지 않게, 변경 후 **`npm run build`** 로 TypeScript를 확인한다.
- Prisma에 **없는 테이블**은 앱에서 Raw SQL로만 건드리지 말고, **문서에 “Prisma 비관리”** 라고 표시해 둔다.

### 6단계: 앱·헬퍼와의 정합

- RPC 이름(`use_points`, 컬럼명, OUT 파라미터)과 **헬퍼**(`supabase-points.ts` 등)가 **한 세트**인지 확인한다. DB만 바꾸고 헬퍼를 안 바꾸면 **런타임만 깨진다**.
- 인증·프로필: Supabase Auth `user.id`와 Prisma `users` 행이 **1:1**이라는 가정이 깨지면(트리거·수동 삭제), **온보딩·예약·포인트** 플로우를 같이 점검한다.

### 7단계: 마무리 체크리스트

- [ ] 같은 변경을 **두 시스템에 중복 반영**하지 않았는가  
- [ ] FK·트리거·RLS·앱 코드가 **서로 모순**되지 않는가  
- [ ] `AI_TRANSFER_PROMPT.md` **`최근 수정 사항`**·필요 시 **본 문서 절**을 갱신했는가  
- [ ] **빌드/스모크 테스트**를 돌렸는가  

---

## 📋 프로젝트 개요

**프로젝트명**: A1 STUDIO 웹사이트  
**목적**: 보컬·댄스·연기·뮤지컬 연습실 예약 및 관리 플랫폼  
**주소**: 서울시 송파구 문정동 70-13 B1  
**연락처**: 010-2994-0323 (24시간 운영)  
**특징**: 
- 15평 단독 연습실 공간
- 4가지 용도로 활용 가능 (보컬, 댄스, 연기, 뮤지컬)
- 파티룸 대관 서비스 추가
- 원데이클래스 운영

---

## 🛠 기술 스택

### 프론트엔드
```json
{
  "프레임워크": "Next.js 16.1.6 (App Router)",
  "라이브러리": "React 19.2.3",
  "언어": "TypeScript 5",
  "스타일링": "Tailwind CSS 4 (@tailwindcss/postcss)",
  "애니메이션": "Motion (Framer Motion) 12.38.0",
  "아이콘": "Lucide React 0.576.0",
  "폼 검증": "Zod 4.3.6",
  "유틸리티": ["clsx", "tailwind-merge", "date-fns 4.1.0"]
}
```

### 백엔드 & 데이터베이스
```json
{
  "ORM": "Prisma 7.4.2",
  "데이터베이스": "PostgreSQL (Supabase 호스팅)",
  "인증": "Supabase Auth (@supabase/ssr 0.9.0)",
  "드라이버": ["pg", "postgres"],
  "비밀번호_해싱": "bcryptjs"
}
```

### 외부 서비스
```json
{
  "결제": ["Kakao Pay (포인트 충전 · 연습실·파티룸 직접결제)", "Toss Payments (준비중)"],
  "이메일": "SendGrid 8.1.6",
  "SMS": ["SOLAPI (주력)", "COOLSMS (선택)"],
  "OAuth": ["Google", "Kakao"]
}
```

---

## 🎨 디자인 시스템

### 브랜드 컬러 팔레트

```css
/* globals.css에서 정의됨 */
:root {
  --color-bg:           #F7F3EB;  /* 밀키 화이트 (페이지 배경) */
  --color-surface:      #EFE7DA;  /* 크림 아이보리 (카드/패널) */
  --color-border:       #D8CCBC;  /* 밝은 베이지 오크 (보더) */
  --color-text:         #3B342F;  /* 딥 토프 (본문/제목) */
  --color-text-muted:   #6f655d;  /* 웜 뉴트럴 (보조 텍스트) */
  --color-text-subtle:  #9b9189;  /* 힌트/플레이스홀더 */
  --color-accent:       #B98768;  /* 뮤트 클레이 (CTA/강조) */
  --color-accent-hover: #a9785c;  /* 강조 hover */
  --color-overlay:      #3B342F;  /* 모달 오버레이 */
}
```

### 타이포그래피
- **Sans-serif**: Geist (본문, UI)
- **Serif**: Cormorant Garamond (장식적 타이틀)
- **Korean Serif**: Noto Serif KR (한글 세리프)

### 디자인 원칙
1. **프리미엄 미니멀**: 차분하고 세련된 웜 톤
2. **부드러운 곡선**: rounded-xl (12px), rounded-2xl (16px)
3. **섬세한 효과**: 글로우, 그림자, 블러, backdrop-blur
4. **예술적 감성**: 베이지/크림 톤 중심, 자연스러운 애니메이션

---

## 🗄 데이터베이스 스키마 (Prisma)

### 인증 관련

```prisma
// Supabase Auth와 연동되는 사용자 프로필
model User {
  id              String   @id @db.Uuid  // Supabase auth.users.id와 동일
  email           String?  @unique
  name            String?
  nickname        String?  @map("nickname")
  avatarUrl       String?
  provider        String?  // "google", "kakao", "email"
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  birthYear       Int?     @map("birth_year") @db.SmallInt
  phone           String?  @unique
  phoneVerified   Boolean  @default(false) @map("phone_verified")
  marketingAgreed Boolean  @default(false) @map("marketing_agreed")
  
  accounts        Account[]
  sessions        Session[]
  oneDayClassApps OneDayClassApplication[]
}

// 이메일/비밀번호 인증용 별도 테이블
model EmailAuthUser {
  email        String   @id
  passwordHash String
  name         String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

// 비밀번호 재설정 토큰
model PasswordResetToken {
  token     String    @id
  email     String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
}
```

### 연습실 & 예약

```prisma
model Room {
  id          String   @id
  name        String
  slug        String   @unique
  description String?
  capacity    Int
  sizeM2      Float
  amenities   Json     // ["전신거울", "전자피아노", ...]
  images      Json     // ["/연습실.jpg", ...]
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  pricingRules PricingRule[]
  reservations Reservation[]
  holds        ReservationHold[]
}

// 동적 가격 룰 (시간대별, 요일별)
model PricingRule {
  id            String   @id
  roomId        String
  label         String   // "평일 비피크", "주말 피크타임" 등
  dayOfWeekMask Int      // 비트마스크 (Sun=1, Mon=2, ..., Sat=64)
  timeStart     String   // "00:00"
  timeEnd       String   // "18:00"
  pricePerHour  Int
  minHours      Int      @default(1)
  isPackage     Boolean  @default(false)
  packageName   String?
  packageHours  Int?
  packagePrice  Int?
  isActive      Boolean  @default(true)
}

enum ReservationStatus {
  HOLD       // 임시 예약 (10분)
  PAID       // 결제 완료
  CONFIRMED  // 포인트 결제 확정
  CANCELLED  // 취소됨
  EXPIRED    // 만료
  REFUNDED   // 환불 완료
}

model Reservation {
  id          String            @id
  roomId      String
  userId      String?           @db.Uuid
  guestName   String
  guestPhone  String
  guestEmail  String?
  date        String            // "YYYY-MM-DD"
  startTime   String            // "HH:MM"
  endTime     String            // "HH:MM"
  headcount   Int               @default(1)
  status      ReservationStatus @default(HOLD)
  totalAmount Int
  memo        String?
  authCode    String?           // 비회원 조회용
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  
  hold    ReservationHold?
  payment Payment?
  review  Review?
}

// 임시 예약 홀드 (10분 타이머)
model ReservationHold {
  id            String      @id
  roomId        String
  reservationId String      @unique
  date          String
  startTime     String
  endTime       String
  expiresAt     DateTime    // 10분 후 자동 만료
  createdAt     DateTime    @default(now())
}

// 관리자 차단 슬롯
model BlockedSlot {
  id        String   @id
  roomId    String
  date      String
  startTime String
  endTime   String
  reason    String   @default("관리자 차단")
  createdAt DateTime @default(now())
}
```

### 결제 시스템

```prisma
enum PaymentStatus {
  PENDING
  APPROVED
  FAILED
  CANCELLED
  PARTIAL_REFUNDED
  REFUNDED
}

model Payment {
  id                 String        @id
  reservationId      String        @unique
  provider           String        // "toss", "kakao"
  providerPaymentKey String?
  orderId            String        @unique
  amount             Int
  status             PaymentStatus @default(PENDING)
  requestedAt        DateTime      @default(now())
  approvedAt         DateTime?
  rawResponse        Json?
  
  refunds Refund[]
}

enum RefundStatus {
  REQUESTED
  APPROVED
  REJECTED
}

model Refund {
  id          String       @id
  paymentId   String
  amount      Int
  reason      String
  status      RefundStatus @default(REQUESTED)
  processedAt DateTime?
  createdAt   DateTime     @default(now())
}

// 결제 중복 방지 락
model PaymentLock {
  id        String   @id
  userId    String   @db.Uuid
  lockType  String   // 'charge', 'reservation', 'party-room'
  lockKey   String   // 주문 ID 또는 예약 식별자
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  @@unique([userId, lockType, lockKey])
}
```

### 원데이클래스

```prisma
enum OneDayClassStatus {
  OPEN       // 신청 모집 중
  CONFIRMED  // 인원 충족, 확정
  CANCELLED  // 취소됨
  COMPLETED  // 진행 완료
}

model OneDayClass {
  id              String            @id
  title           String
  teacherName     String
  teacherProfile  String            @db.Text
  teacherImage    String?
  classType       String            // "VOCAL", "DANCE", "ACT", "MUSICAL"
  description     String            @db.Text
  desiredDate     DateTime
  durationMinutes Int               @default(120)
  minHeadcount    Int               @default(8)
  maxHeadcount    Int               @default(15)
  pricePerPerson  Int
  status          OneDayClassStatus @default(OPEN)
  confirmedDate   DateTime?
  isPublished     Boolean           @default(true)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  
  applications OneDayClassApplication[]
}

model OneDayClassApplication {
  id          String   @id
  classId     String
  userId      String?  @db.Uuid
  guestName   String
  guestPhone  String
  guestEmail  String?
  headcount   Int      @default(1)
  message     String?
  isCancelled Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

### 컨텐츠 (후기, 공지, 이벤트)

```prisma
model Review {
  id            String      @id
  reservationId String      @unique
  rating        Int
  content       String
  nickname      String?
  isVisible     Boolean     @default(false)
  createdAt     DateTime    @default(now())
}

model Notice {
  id          String   @id
  title       String
  content     String
  isPublished Boolean  @default(false)
  isPinned    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Event {
  id          String    @id
  title       String
  content     String
  thumbnail   String?
  startsAt    DateTime?
  endsAt      DateTime?
  isPublished Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### 외부 플랫폼 & 메시지

```prisma
// 스페이스클라우드, 네이버 플레이스 등 외부 예약
model ExternalReservation {
  id         String   @id
  platform   String   // 'spacecloud', 'naver', etc.
  externalId String?
  roomType   String   // 'practice-room' or 'party-room'
  date       String   // "YYYY-MM-DD"
  startTime  String   // "HH:MM"
  endTime    String   // "HH:MM"
  guestName  String
  guestPhone String
  amount     Int      @default(0)
  status     String   @default("confirmed")
  memo       String?
  syncedAt   DateTime @default(now())
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

// SMS/알림톡 발송 로그
model MessageLog {
  id            String   @id
  userId        String?  @db.Uuid
  reservationId String?
  phoneNumber   String
  messageType   String   // 'reservation_confirm', 'reservation_cancel', 'reminder'
  content       String   @db.Text
  status        String   // 'success', 'failed'
  errorMessage  String?  @db.Text
  messageId     String?
  createdAt     DateTime @default(now())
}
```

### Supabase 포인트 시스템 (별도 테이블)

```sql
-- Supabase에서 직접 관리 (Prisma 외부)
CREATE TABLE user_points (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  balance INTEGER DEFAULT 0,
  total_charged INTEGER DEFAULT 0,
  total_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  type TEXT CHECK (type IN ('charge', 'bonus', 'use', 'refund')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  reservation_id UUID REFERENCES reservations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE charge_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  points INTEGER NOT NULL,
  price INTEGER NOT NULL,
  bonus_points INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0
);

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours NUMERIC(4,2) NOT NULL,
  points_used INTEGER NOT NULL,
  status TEXT DEFAULT 'confirmed',
  price_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  refund_points INTEGER
);

-- 포인트 차감 함수 (Atomic)
CREATE OR REPLACE FUNCTION use_points(
  p_user_id UUID,
  p_points INTEGER,
  p_description TEXT,
  OUT o_success BOOLEAN,
  OUT o_new_balance INTEGER,
  OUT o_transaction_id UUID
) AS $$
BEGIN
  UPDATE user_points
  SET balance = balance - p_points,
      total_used = total_used + p_points,
      updated_at = NOW()
  WHERE user_id = p_user_id AND balance >= p_points
  RETURNING balance INTO o_new_balance;

  IF NOT FOUND THEN
    o_success := FALSE;
    RETURN;
  END IF;

  INSERT INTO point_transactions (user_id, type, amount, balance_after, description)
  VALUES (p_user_id, 'use', p_points, o_new_balance, p_description)
  RETURNING id INTO o_transaction_id;

  o_success := TRUE;
END;
$$ LANGUAGE plpgsql;
```

---

## 🌐 페이지 구조 & 라우팅

### 주요 페이지

```
루트 페이지
/                           # 홈페이지 (히어로, 소개, 갤러리, 가격 등)

연습실
/spaces                     # 연습실 목록
/spaces/[id]                # 연습실 상세 (라이트박스 갤러리)
/pricing                    # 요금안내 상세
/guide                      # 이용안내
/availability               # 실시간 예약 현황

예약
/booking                    # 예약하기 (달력 + 시간 선택)
/booking/complete           # 예약 완료
/booking/payment/toss/*     # Toss 결제 (성공/실패)
/booking/payment/kakao/*    # Kakao 결제 (성공/실패/취소)

파티룸 (신규)
/party-room                 # 파티룸 소개
/party-room/booking         # 파티룸 예약
/party-room/booking/complete # 파티룸 예약 완료

포인트
/charge                     # 포인트 충전
/charge/success             # 충전 완료
/charge/cancel              # 충전 취소
/charge/fail                # 충전 실패

원데이클래스
/one-day-class              # 원데이클래스 공고
/one-day-class/requests     # 클래스 요청 (일반 회원)
/one-day-class/announcements # 클래스 공고 등록 (CM 전용)

컨텐츠
/reviews                    # 후기 목록
/notices                    # 공지사항
/events                     # 이벤트
/contact                    # 문의하기
/location                   # 오시는 길

인증
/login                      # 로그인 (Google/Kakao OAuth, 소셜 로그인만)
/signup                     # 회원가입 (Google/Kakao 소셜, 약관 동의)
/forgot-password            # 비밀번호 찾기
/reset-password             # 비밀번호 재설정
/onboarding/profile         # 온보딩 1단계: 이름, 출생연도 입력
/onboarding/phone           # 온보딩 2단계: 휴대폰 SMS 인증
/auth/callback              # OAuth 콜백 처리

마이페이지
/mypage                     # 마이페이지 (포인트, 예약내역, 계정)
/dashboard                  # 사용자 대시보드

관리자
/admin                      # 관리자 대시보드
/admin/members              # 회원 관리
/admin/reviews              # 후기 관리
/admin/class-requests       # 클래스 요청 관리
/admin/reservations/calendar # 예약 캘린더

기타
/privacy                    # 개인정보처리방침
/terms                      # 서비스 이용약관
/test-auth                  # 인증 테스트 (개발용)
```

### API 엔드포인트

```
인증 API
POST /api/auth/email-signup              # 이메일 회원가입 (사용 안 함)
POST /api/auth/password-reset/request    # 비밀번호 재설정 요청
POST /api/auth/password-reset/confirm    # 비밀번호 재설정 확인
POST /api/auth/sms/send-code             # SMS 인증번호 발송 (SOLAPI 연동)
POST /api/auth/sms/verify-code           # SMS 인증번호 확인
GET  /auth/callback                      # OAuth 콜백 (Google/Kakao)

예약 API (연습실)
GET  /api/reservations                   # 예약 목록 조회
GET  /api/reservations/available         # 사용 가능한 시간대 조회
POST /api/reservations/create            # 예약 생성 (포인트 결제)
POST /api/reservations/payments/kakao/ready   # 연습실 카카오페이 결제 준비
GET  /api/reservations/payments/kakao/approve # 연습실 카카오페이 결제 승인 (콜백)
GET  /api/reservations/payments/kakao/fail    # 연습실 결제 실패 → 락 해제·쿠키 삭제 → /booking?failed=true
GET  /api/reservations/payments/kakao/cancel  # 연습실 결제 취소 → 락 해제·쿠키 삭제 → /booking?cancelled=true
POST /api/reservations/cancel            # 예약 취소
POST /api/reservations/holds/expire      # 만료된 HOLD 정리

파티룸 API (신규)
GET  /api/party-room/reservations/available # 파티룸 예약 가능 시간 조회
POST /api/party-room/reservations/create    # 파티룸 예약 생성
POST /api/party-room/reservations/cancel    # 파티룸 예약 취소
POST /api/party-room/payments/kakao/ready   # 카카오페이 결제 준비
GET  /api/party-room/payments/kakao/approve # 카카오페이 결제 승인
GET  /api/party-room/payments/kakao/fail    # 결제 실패 → party-room 락 해제·쿠키 삭제 → /party-room/booking?failed=true
GET  /api/party-room/payments/kakao/cancel  # 결제 취소 → party-room 락 해제·쿠키 삭제 → /party-room/booking?cancelled=true

결제 API (Toss - 준비중)
POST /api/payments/toss/confirm          # Toss 결제 승인
POST /api/payments/toss/webhook          # Toss 웹훅

결제 API (Kakao)
POST /api/payments/kakao/ready           # 카카오페이 결제 준비
POST /api/payments/kakao/approve         # 카카오페이 결제 승인

포인트 충전 API (Kakao Pay)
POST /api/charge/ready                   # 충전 결제 준비
GET  /api/charge/approve                 # 충전 결제 승인 (콜백)

회원 API
GET  /api/members/profile                # 프로필 조회 (이름, 출생연도, 전화번호, 인증 상태)
POST /api/members/profile                # 프로필 생성/업데이트 (upsert)
POST /api/members/sync                   # Supabase Auth → Prisma 동기화
POST /api/members/withdraw               # 회원 탈퇴
POST /api/account/delete                 # 계정 삭제

회원 등급 API
GET  /api/member-roles/role              # 회원 등급 조회 (CM 여부)

관리자 API
POST /api/admin/auth                     # 관리자 인증
GET  /api/admin/dashboard                # 대시보드 통계
GET  /api/admin/members                  # 회원 목록
POST /api/admin/members/actions          # 회원 관리 액션
GET  /api/admin/reservations/calendar    # 예약 캘린더 데이터
POST /api/admin/reservations/cancel      # 관리자 예약 취소 (Prisma reservations, x-admin-password, 포인트 환불은 service role RPC)
GET  /api/admin/reviews                  # 후기 목록 조회 (Supabase)
PATCH /api/admin/reviews                 # 후기 공개/비공개 토글
DELETE /api/admin/reviews                # 후기 삭제

원데이클래스 API
GET  /api/one-day-class                  # 클래스 목록 조회
POST /api/one-day-class                  # 클래스 등록/신청

컨텐츠 API
GET  /api/notices                        # 공지사항 목록
GET  /api/events                         # 이벤트 목록
POST /api/contact                        # 문의하기
※ 후기 API는 Supabase 직접 조회 (Server Action 사용)

디버그 API (개발용)
GET  /api/debug/profiles                 # 프로필 디버그
GET  /api/debug/auth-config              # 인증 설정 디버그
POST /api/test/send-sms                  # SMS 발송 테스트
```

---

## 🎯 핵심 비즈니스 로직

### 1. 가격 체계 (연습실)

**이벤트 기간**: 2026-04-08부터 계속

```typescript
// src/lib/pricing.ts

enum PriceType {
  WEEKDAY_OFF_PEAK = "weekday_off_peak",       // 평일 비피크 (00:00~18:00)
  WEEKDAY_PEAK = "weekday_peak",               // 평일 피크 (18:00~00:00)
  WEEKEND_OFF_PEAK = "weekend_off_peak",       // 주말 비피크 (00:00~13:00)
  WEEKEND_PEAK = "weekend_peak",               // 주말 피크 (13:00~00:00)
}

const PRICES = {
  weekday_off_peak: { 원가: 9000, 이벤트: 7000 },
  weekday_peak: { 원가: 11000, 이벤트: 9000 },
  weekend_off_peak: { 원가: 10000, 이벤트: 8000 },
  weekend_peak: { 원가: 12000, 이벤트: 10000 },
};

// 주요 함수
function isEventPeriod(date: Date): boolean
function getPriceType(date: Date, startTime: string): PriceType
function calcPoints(date: Date, startTime: string, endTime: string): number
```

### 2. 파티룸 가격 체계

```typescript
// src/lib/party-room-options.ts

const PARTY_ROOM_OPTIONS = [
  {
    id: "2hours",
    duration: 2,
    regularPrice: 100000,  // 정가
    eventPrice: 80000,     // 이벤트 가격
  },
  {
    id: "3hours",
    duration: 3,
    regularPrice: 140000,
    eventPrice: 120000,
  },
  {
    id: "4hours",
    duration: 4,
    regularPrice: 180000,
    eventPrice: 160000,
  },
  {
    id: "5hours",
    duration: 5,
    regularPrice: 220000,
    eventPrice: 200000,
  },
];

// 환경변수로 이벤트 가격 활성화 여부 제어
NEXT_PUBLIC_PARTY_ROOM_EVENT_ACTIVE="true"
```

### 3. 예약 프로세스 (연습실)

**A. 포인트 결제 (즉시 확정)**

```
1. 사용자가 날짜 + 시간 선택 (/booking), 결제 수단 «포인트»
2. GET /api/reservations/available?date=...
3. POST /api/reservations/create
   - acquirePaymentLock("reservation", 날짜_시작_종료)
   - deductPointsDB → use_points RPC
   - reservations INSERT (status: PAID, payment_method: points, points_used = total_amount)
   - sendMessage + getPracticeRoomConfirmMessage (유효한 연락처일 때)
4. /booking/complete?id=...&points=...
```

**B. 카카오페이 직접 결제 (`KAKAOPAY_CID`, 파티룸과 별도 URL)**

```
1. /booking 에서 결제 수단 «카카오페이» 선택 후 결제하기
2. POST /api/reservations/payments/kakao/ready
   - 서버에서 금액 재계산(getPriceType + calcPoints), 중복 시간대 검사
   - `deleteExpiredPaymentLocksForUser` + 활성 `practice-room` 락 있으면 **409 + `retryAfter`(초)** (`/booking`에서 분 단위 안내)
   - `acquirePaymentLock("practice-room", partner_order_id, 600)` — 실패 시 409/500
   - `readyPracticeRoomPayment()` → 쿠키: practice_kakao_tid, practice_kakao_order_id, practice_reservation_data
   - 준비 단계 예외 시 `releasePaymentLock`로 정리
3. 카카오 결제 페이지로 이동 (모바일은 next_redirect_mobile_url 우선)
4. 실패/취소 시 카카오가 호출: **GET .../fail**, **GET .../cancel** → 쿠키의 `practice_kakao_order_id`로 **`releasePaymentLock(..., "practice-room")`** 후 쿠키 삭제 → `/booking?failed|cancelled=true`
5. GET /api/reservations/payments/kakao/approve?pg_token=...
   - approvePayment → reservations INSERT (payment_method: kakaopay, kakaopay_*, duration_hours, points_used: 0)
   - SMS (연습실 템플릿) — 실패해도 예약은 유지
   - releasePaymentLock, 쿠키 삭제
6. /booking/complete?id=...&method=kakaopay
```

### 4. 예약 프로세스 (파티룸)

**카카오페이 직접 결제**

```
1. 사용자가 날짜 + 시간 + 옵션 선택 (/party-room/booking)
2. GET /api/party-room/reservations/available?date=2026-04-15
   → 예약된 시간대 조회
3. "결제하기" 클릭
4. POST /api/party-room/payments/kakao/ready
   - 만료 `party-room` 락 정리 후 활성 락 있으면 **409 + `retryAfter`** (연습실과 동일 UX)
   - `acquirePaymentLock("party-room", orderId, 600)` 후 `readyPartyRoomPayment`
   - 예외 시 `releasePaymentLock`; 쿠키에 `party_order_id` 등 저장
5. 카카오페이 결제 페이지 (실패/취소 시 **GET .../fail**, **GET .../cancel** → `releasePaymentLock` + 쿠키 삭제)
6. GET /api/party-room/payments/kakao/approve?pg_token=...
   - party_reservations INSERT (status: confirmed, payment_method: kakaopay, kakaopay_*)
   - SMS: sendMessage + getPartyRoomConfirmMessage + message_logs (실패해도 예약 유지)
   - **`releasePaymentLock(..., "party-room", orderId)`** 후 쿠키 삭제; 승인 예외 시에도 쿠키 기준 락 해제 시도
7. 리다이렉트 → /party-room/booking/complete?id={reservationId}
```

### 5. 포인트 충전 (Kakao Pay)

```typescript
// src/lib/kakaopay.ts

export async function readyPayment(params: {
  cid: string;
  partner_order_id: string;
  partner_user_id: string;
  item_name: string;
  quantity: number;
  total_amount: number;
  tax_free_amount: number;
  approval_url: string;
  cancel_url: string;
  fail_url: string;
}): Promise<{ tid: string; next_redirect_pc_url: string }>

export async function approvePayment(params: {
  cid: string;
  tid: string;
  partner_order_id: string;
  partner_user_id: string;
  pg_token: string;
}): Promise<KakaoPayApprovalResponse>

// 흐름:
// 1. POST /api/charge/ready
//    - charge_packages에서 패키지 조회
//    - PaymentLock 생성
//    - kakaopay.readyPayment()
//    - 쿠키에 tid, partner_order_id, package_id 저장
//    - next_redirect_pc_url로 리다이렉트
// 2. 사용자가 카카오페이에서 결제 승인
// 3. GET /api/charge/approve?pg_token=...
//    - kakaopay.approvePayment()
//    - Supabase 트랜잭션:
//      a. user_points 업데이트 (balance += points + bonus)
//      b. point_transactions INSERT (type: 'charge')
//      c. point_transactions INSERT (type: 'bonus') if bonus > 0
//    - PaymentLock 삭제
//    - 리다이렉트 → /charge/success?points={충전포인트}
```

### 6. 예약 취소 & 환불 정책

**단일 소스:** `src/lib/refund-policy.ts` (연습실·파티룸 분리, API·마이페이지·UI 문구와 동기화)

```typescript
// src/lib/refund-policy.ts (요약)

// 예약일·기준일의 Asia/Seoul 달력 날짜 차이(일)
export function getDaysDifference(futureDate: Date, currentDate?: Date): number

// 연습실 환불 구간: getDaysDifference 기준 — 3일 이상 100%, 2일 50%, 전날·당일 0%
export const PRACTICE_ROOM_REFUND_POLICY = { threeDaysBefore: 1.0, twoDaysBefore: 0.5, ... };

// 파티룸 환불 구간: 동일하게 달력 일수 — 7일 이상 100%, 3~6일 50%, 3일 미만 0%
export const PARTY_ROOM_REFUND_POLICY = { sevenDaysBefore: 1.0, threeDaysBefore: 0.5, withinThreeDays: 0 };

export function calculatePracticeRoomRefundRate(reservationDateTime: Date): { refundRate; description }
export function calculatePracticeRoomRefund(reservationDateTime: Date, totalAmount: number): { refundRate; refundAmount; reason }
export function calculatePartyRoomRefundRate(reservationDateTime: Date): ...
export function calculatePartyRoomRefund(reservationDateTime: Date, totalAmount: number): ... // 100%일 때 refundAmount = totalAmount

// 취소 가능 여부 (API·클라이언트 공통)
export function canCancelReservation(
  reservationDate: Date,
  roomType: "practice" | "party" | "practice-room" | "party-room"
): { canCancel: boolean; message: string }
// - practice*: 달력 일수 차이 < 2 → 불가 (전날·당일)
// - party*: 일수 차이 < 3 → 불가 (UI 문구: 이용 전날·당일 취소 불가 등과 통일)

export const REFUND_POLICY = { cancellationDeadlineHours: 48 }; // 레거시 힌트
```

#### 파티룸 (UI·안내 문구, 연습실과 동일한 「이용 N일 전」 스타일)

- 이용 7일 전 이상: 100% 환불  
- 이용 3일 ~ 6일 전: 50% 환불  
- 이용 전날: 취소 불가  
- 이용 당일: 취소 불가  

(코드: `getDaysDifference` 기준 **3일 미만**이면 취소·환불 불가이므로 **이용 2일 전**도 동일 구간에 포함된다.)

**연습실 취소 API** `POST src/app/api/reservations/cancel/route.ts`

1. 세션·본인 `reservations` 행 조회, 상태 `PAID` / `CONFIRMED` / `confirmed` 만 허용  
2. `canCancelReservation(..., "practice")` — 불가 시 400  
3. `calculatePracticeRoomRefund(시작일시, total_amount)` — 환불율·금액·사유 (100%일 때 `refundAmount === totalAmount`)  
4. 예약 `status: "CANCELLED"` 업데이트 (`payment_method === kakaopay` 이면 `cancelled_at` 설정 시도 — 컬럼 필요)  
5. **`payment_method`가 `kakaopay`**: 포인트 환불 없음. 응답에 `kakaopay_refund_pending` 등 안내 — **카카오페이 결제 취소 API(`cancelPayment`)·어드민 수동 환불은 후속 연동**  
6. **그 외(포인트 등)**: `refundAmount > 0` 이면 `refundPointsDB`, 잔액은 `getPointBalance` 등으로 응답

**파티룸 취소 API** `POST src/app/api/party-room/reservations/cancel/route.ts`

- `calculatePartyRoomRefund` / 포인트 결제 시 `refundPointsDB` 등 (카드·포인트 분기는 라우트 구현 따름)

**포인트 환불 헬퍼** (`src/lib/supabase-points.ts`)

- 일반: `refundPointsDB` — 요청 컨텍스트의 Supabase 세션(쿠키)으로 `refund_points` RPC  
- 관리자 등 비세션: **`refundPointsDBServiceRole`** / 잔액 **`getPointBalanceServiceRole`** — **`SUPABASE_SERVICE_ROLE_KEY`**

**UI**

- `/pricing`: 환불 규정 — 연습실(이용 3일 전 100%, 2일 전 50%, 전날·당일 **취소 불가**) / 파티룸(**이용 7일 전 이상** 전액, **이용 3일~6일 전** 50%, **이용 전날·당일** **취소 불가** — 연습실과 문구 스타일 통일)  
- `/booking`: 연습실 예약 확인 단계에서 **「예약 전 안내」**(환불·예약 확정 문자·변경 안내) — 예약 확정 버튼 위  
- `/mypage`: 취소 모달에서 `calculatePracticeRoomRefundRate` / `calculatePartyRoomRefundRate`로 안내 문구·환불액 표시

### 7. SMS 발송 시스템

```typescript
// src/lib/sms.ts

// 지원 프로바이더: SOLAPI, COOLSMS
// 환경변수 SMS_PROVIDER: "auto" | "solapi" | "coolsms" | "test"
// "test": 실제 발송 없이 로그만, success 반환 (Preview/로컬 검증용)

export async function sendSMS(params: {
  to: string;
  text: string;  // 메시지 내용 (message → text로 변경됨)
  from?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }>

// 메시지 템플릿
// src/lib/message-templates.ts
export function getReservationConfirmMessage(params: {
  guestName: string;
  date: string;
  startTime: string;
  endTime: string;
  roomName: string;
}): string

export function getReservationCancelMessage(params: {
  guestName: string;
  date: string;
  startTime: string;
}): string

// 발송 후 MessageLog에 자동 기록
```

**SMS 인증 구현**

```typescript
// src/app/api/auth/sms/send-code/route.ts

// POST: SMS 인증번호 발송
// 1. 전화번호 유효성 검증 (normalizePhone, isValidKoreanMobile)
// 2. 6자리 인증번호 생성 (createOtp)
// 3. SOLAPI를 통해 실제 SMS 발송
//    메시지: "[A1 STUDIO] 인증번호는 [${code}]입니다. 3분 내에 입력해주세요."
// 4. OTP는 메모리 캐시에 저장 (3분 TTL)
// 5. { success: true, message: "인증코드가 발송되었습니다." }

// src/app/api/auth/sms/verify-code/route.ts

// POST: SMS 인증번호 확인
// 1. 전화번호와 인증번호 검증
// 2. 캐시된 OTP와 비교
// 3. 일치 시 { success: true, verified: true }
// 4. 불일치 시 { success: false, error: "인증번호가 일치하지 않습니다." }
```

### 8. 회원가입 & 온보딩 플로우

**회원가입 프로세스**

```typescript
// src/app/signup/page.tsx

// 지원 가입 방식 (소셜 로그인만):
// 1. Google OAuth
// 2. Kakao OAuth
// ※ 이메일/비밀번호 가입은 제거됨

// 약관 동의:
// - 개인정보 수집 및 이용 동의 (필수)
// - 서비스 이용약관 동의 (필수)
// - 마케팅 수신 동의 (선택)

// OAuth 가입 시 redirectTo:
redirectTo: `${window.location.origin}/auth/callback?next=/onboarding/profile`

// 가입 완료 후 자동 리다이렉트:
// → /onboarding/profile (프로필 입력)
```

**온보딩 1단계: 프로필 입력**

```typescript
// src/app/onboarding/profile/page.tsx

// 필수 입력 항목:
// - 이름 (name): 2~20자
// - 출생연도 (birthYear): 1900~현재년도

// 프로세스:
// 1. 입력값 클라이언트 검증
// 2. POST /api/members/profile
//    - Zod 스키마 검증
//    - Prisma upsert (User 테이블)
// 3. 성공 시 리다이렉트 → /onboarding/phone
```

**온보딩 2단계: 휴대폰 인증**

```typescript
// src/app/onboarding/phone/page.tsx

// 프로세스:
// 1. 휴대폰 번호 입력 (01012345678 형식)
// 2. POST /api/auth/sms/send-code
//    - 6자리 인증번호 생성
//    - SMS 발송 (SOLAPI/COOLSMS)
//    - 3분 타이머 시작
// 3. 인증번호 입력
// 4. POST /api/auth/sms/verify-code
//    - 인증번호 검증
// 5. POST /api/members/profile
//    - phone, phoneVerified: true 업데이트
// 6. 리다이렉트 → / (홈페이지)

// 특징:
// - 3분 카운트다운 타이머
// - 재발송 기능 (60초 제한)
// - 인증 실패 시 에러 표시
```

**미들웨어 라우트 가드**

```typescript
// middleware.ts (프로젝트 루트)
export const runtime = "nodejs";

// import { createServerClient } from "@supabase/ssr";

// 적용 규칙:
// 1. 비로그인 사용자가 보호된 페이지 접근 → /login
// 2. 로그인했지만 프로필 미완성(이름/출생연도 없음) → /onboarding/profile
// 3. 로그인했지만 전화번호 미인증 → /onboarding/phone
// 4. 이미 로그인한 사용자가 /login, /signup 접근 → /

// 프로필 체크 플로우:
// 1. Supabase Auth 세션 확인 (createServerClient)
// 2. GET /api/members/profile 호출
// 3. profile.name || profile.birthYear 없으면 → /onboarding/profile
// 4. profile.phoneVerified === false → /onboarding/phone
// 5. 모두 완료 시 요청한 페이지로 진행

// 디버깅 로그 (개발 모드):
console.log("[middleware] profile:", JSON.stringify(profile));
console.log("[middleware] Redirecting to /onboarding/profile - name:", profile?.name, "birthYear:", profile?.birthYear);
console.log("[middleware] Redirecting to /onboarding/phone - phoneVerified:", profile.phoneVerified);

// 온보딩 경로는 가드 스킵:
const ONBOARDING_PATHS = ["/onboarding/profile", "/onboarding/phone"];

// 레거시 파일 (src/proxy.ts):
// - 2026-04-17에 완전 삭제됨 (phone 관련 리다이렉트 로직 포함)
// - 이제 phone 인증은 middleware.ts에서만 관리됨
```

**프로필 API**

```typescript
// src/app/api/members/profile/route.ts

// import { createClient } from "@/lib/supabase/server";
// import { prisma } from "@/lib/db";

// GET: 프로필 조회
// - Supabase Auth 세션 확인
// - Prisma User.findUnique(where: { id: user.id })
// - { profile: { name, birthYear, phone, phoneVerified, ... } }

// POST: 프로필 생성/업데이트
// - Zod 스키마 검증:
//   - name: string, 2~20자 (optional)
//   - birthYear: number, 1900~현재년도 (optional)
//   - phone: string, 01[0-9]{8,9} (optional)
//   - phoneVerified: boolean (optional)
// - Zod 에러: error.issues[0]?.message (issues 사용)
// - Prisma User.upsert()
//   - create: 새 사용자 생성 (auth id 기준)
//   - update: 기존 사용자 업데이트
// - { profile: { ... } }
```

### 9. 회원 등급 시스템

```typescript
// src/lib/member-role.ts & member-role-db.ts

type MemberRole = "NONE" | "CM"; // CM = Class Master (클래스마스터)

// 로컬 스토리지 기반 (간단한 MVP)
// CM 권한:
//   - 원데이클래스 공고 등록 (/one-day-class/announcements)
//   - 일반 클래스 요청 확인 불가

// 일반회원 권한:
//   - 클래스 요청 등록 (/one-day-class/requests)
//   - 클래스 공고 신청
```

### 10. 결제 락 시스템

```typescript
// src/lib/payment-lock.ts — 실제 함수명

// 획득: 전역 만료 행 삭제 후 (user_id, lock_type, lock_key) 중복만 차단
export async function acquirePaymentLock(
  userId: string,
  lockType: string,       // 예: "reservation", "practice-room", "party-room"
  lockKey: string,
  durationSeconds?: number
): Promise<boolean>

// 해제: 동일 (user_id, lock_type, lock_key) 행 삭제 — 카카오 fail/cancel/approve 성공 후 호출
export async function releasePaymentLock(
  userId: string,
  lockType: string,
  lockKey: string
): Promise<void>

// 해당 사용자·타입의 만료된 락만 삭제 (ready 직전 재시도 정리)
export async function deleteExpiredPaymentLocksForUser(
  userId: string,
  lockType: string
): Promise<void>

// 아직 만료되지 않은 락 목록 — 활성 락 있으면 ready에서 409 + retryAfter(초) 반환
export async function getActivePaymentLocksForUser(
  userId: string,
  lockType: string
): Promise<{ lock_key: string; expires_at: string }[]>
```

---

## 🎬 홈페이지 섹션 상세

### 1. HeroScroll (히어로 스크롤)

**파일**: `src/components/HeroScroll.tsx`

- **높이**: 300vh (3배수 스크롤)
- **배경 전환**: #0f0e0d (다크) → #F7F3EB (라이트)
- **기술**: Motion의 `useScroll()` + `useTransform()`

**애니메이션 시퀀스**:

```typescript
// 0~30%: 로고 표시 → 페이드아웃 + 축소 + 상단 이동
const logoOpacity = useTransform(scrollYProgress, [0, 0.30], [1, 0]);
const logoScale = useTransform(scrollYProgress, [0.18, 0.32], [1, 0.88]);
const logoY = useTransform(scrollYProgress, [0.22, 0.38], [0, -180]);

// 16~46%: 스튜디오 정보 오버레이 (반투명 글래스 패널)
const overlayOpacity = useTransform(scrollYProgress, [0.16, 0.30, 0.36, 0.46], [0, 1, 1, 0]);

// 24~62%: "One Space · Four Uses" 미리보기 카드
const cardsOpacity = useTransform(scrollYProgress, [0.24, 0.38, 0.52, 0.62], [0, 1, 1, 0]);
const cardsY = useTransform(scrollYProgress, [0.24, 0.48], [120, 0]);
```

### 2. StudioIntro (스튜디오 소개)

**파일**: `src/components/home/StudioIntro.tsx`

- 라벨: "Premium Practice Studio"
- 타이틀: "A1 STUDIO"
- 서브타이틀: "보컬·댄스·연기·뮤지컬 연습실"
- 주소 및 교통, 비품 정보
- 애니메이션: `FadeInSection` 사용 (순차 등장)

### 3. AboutSection (대표 소개)

**파일**: `src/components/home/AboutSection.tsx`

- **폰트**: Noto Serif KR (세리프 느낌)
- **대표 사진**: 3:4 비율 플레이스홀더
- **출연작 그리드**: 15개 뮤지컬
  - 2011 삼총사, 2013 The Promise, 2016 맘마미아
  - 2017 맨 오브 라만차, 2019 킹키부츠, 2020 프랑켄슈타인
  - 2021 마리 앙투아네트, 2022 레베카, 2023 엘리자벳
  - 2024 지킬앤하이드, 2024 라흐마니노프, 2024 시라노
  - 2024 웃는 남자, 2025 미드나잇 인 파리, 2025 슈가

- **클래스 철학** (3개 카드):
  1. 현장의 감각을 그대로
  2. 누구나 부담 없이
  3. 한 번에도 분명한 성취

### 4. 활용 용도 (One Space · Four Uses)

**그리드**: 2열(모바일) → 4열(데스크톱)

1. **VOCAL (보컬)** - Mic2 아이콘
   - "전자피아노로 반주하며 보컬 연습"
2. **DANCE (댄스)** - Music2 아이콘
   - "전신거울 앞에서 안무 연습"
3. **ACT (연기)** - Clapperboard 아이콘
   - "촬영용 조명·삼각대로 셀프 촬영·연기 연습"
4. **MUSICAL (뮤지컬)** - Star 아이콘
   - "전자피아노·전신거울로 뮤지컬 연습"

### 5. 구비 비품 (Equipment)

**그리드**: 2열(모바일) → 4열(데스크톱)

1. 전신 거울 - "댄스·연기·뮤지컬 연습 필수"
2. 촬영용 조명 - "영상·사진 촬영 가능"
3. 삼각대 - "스마트폰·카메라 거치"
4. 전자피아노 - "보컬·뮤지컬 반주 연습"
5. 요가매트 - "몸풀기·스트레칭"
6. 폼롤러 - "근막이완·근육 회복"

### 6. GallerySection (갤러리)

**파일**: `src/components/home/GallerySection.tsx`

**이미지 5장**:
- `/연습실.jpg` (메인, 2×2 큰 영역, "A1 Room · 15평 단독 공간" 오버레이)
- `/1.jpg`, `/2.jpg`, `/3.jpg`, `/8.jpg` (서브)

**라이트박스 기능**:
- 클릭 시 전체화면 모달
- 좌우 화살표 네비게이션
- 키보드 (←/→/Esc) 지원
- 이미지 카운터 (예: 1/5)
- 모바일 스와이프 지원

### 7. PricingSummary (요금 요약)

**파일**: `src/components/home/PricingSummary.tsx`

**오픈 이벤트**: 2026-04-08부터 계속

**4개 카드** (sm: 2열, xl: 4열):

1. **평일 비피크** (월~금 00:00~18:00)
   - 원가: ~~9,000원~~ → **7,000원/시간**
   - 2시간: ~~14,000원~~ → **13,000원**

2. **평일 피크타임** (월~금 18:00~00:00)
   - 원가: ~~11,000원~~ → **9,000원/시간**
   - 2시간: ~~18,000원~~ → **17,000원**

3. **주말/공휴일 비피크** [인기 배지] (토·일·공휴일 00:00~13:00)
   - 원가: ~~10,000원~~ → **8,000원/시간**
   - 2시간: ~~16,000원~~ → **15,000원**

4. **주말/공휴일 피크타임** (토·일·공휴일 13:00~00:00)
   - 원가: ~~12,000원~~ → **10,000원/시간**
   - 2시간: ~~20,000원~~ → **19,000원**

### 8. ReviewsPreview (후기 미리보기)

**파일**: `src/components/home/ReviewsPreview.tsx`

- 후기 카드 그리드
- `/reviews` 페이지로 연결

### 9. LocationSection (오시는 길)

**파일**: `src/components/home/LocationSection.tsx`

**지도**: 네이버 지도 임베드 예정 (현재 플레이스홀더)

**교통정보 카드 4개**:
1. 주소: 서울시 송파구 문정동 70-13 B1
2. 대중교통: 8호선 문정역(도보 8분), 장지역(도보 10분)
3. 주차: 건물 주차 가능, 인근 공영주차장
4. 전화: 010-2994-0323, 운영시간 00:00–24:00

### 10. 하단 CTA 배너

- "오늘 연습, 지금 예약하세요"
- "실시간 예약현황 확인 · 10분 내 결제 · 즉시 확정"
- 버튼: `/booking` 페이지로 연결 (활성화됨)

---

## 🧩 주요 컴포넌트

### 레이아웃

**Header** (`src/components/layout/Header.tsx`)
- sticky 네비게이션
- 로고, 메뉴
- 포인트 잔액 표시 (로그인 시)
- 모바일 햄버거 메뉴
- 모바일 UI: 마이페이지, 관리자 버튼 `hidden lg:flex` (햄버거 메뉴 공간 확보)
- 프로필 완성 체크 로직 제거 (middleware.ts에서 처리)

**Footer** (`src/components/layout/Footer.tsx`)
- 스튜디오 정보
- 소셜 링크
- 저작권 정보
- 개인정보처리방침 링크

**StickyBookingCTA** (`src/components/layout/StickyBookingCTA.tsx`)
- 스크롤 시 하단 고정 예약 버튼
- `/booking` 페이지로 연결

### 애니메이션

**FadeInSection** (`src/components/FadeInSection.tsx`)
- viewport 진입 시 fadeUp
- opacity 0→1, y: 32→0
- delay 설정 가능

**HeroScroll** (`src/components/HeroScroll.tsx`)
- useScroll + useTransform
- 스크롤 진행도 → CSS 변환
- useReducedMotion (접근성)

**Providers** (`src/components/layout/Providers.tsx`)
- Motion의 MotionConfig
- reducedMotion 설정

### 인증

**OAuthCallbackHandler** (`src/components/OAuthCallbackHandler.tsx`)
- OAuth 콜백 처리 컴포넌트
- Google/Kakao 인증 완료 후 처리
- Supabase Auth 세션 확인

---

## 🔐 인증 & 환경 변수

### Supabase Auth

**OAuth Providers**:
- Google (활성화)
- Kakao (활성화)

**Phone OTP**:
- SMS 인증 지원
- SOLAPI/COOLSMS 사용

**Email/Password**:
- EmailAuthUser 테이블 (별도 관리)
- bcryptjs 해싱

### 환경 변수 (.env.local)

```bash
# ── 데이터베이스 ──
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# ── Supabase ──
NEXT_PUBLIC_SUPABASE_URL="https://czscrcsaoefoqpynpbyv.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# ── 앱 설정 ──
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_BOOKING_ENABLED="true"
NEXT_PUBLIC_PHONE_OTP_ENABLED="true"
NEXT_PUBLIC_PARTY_ROOM_EVENT_ACTIVE="true"

# ── 관리자 ──
ADMIN_PASSWORD="..."

# ── Google OAuth ──
GOOGLE_CLIENT_ID="..."
NEXT_PUBLIC_GOOGLE_CONFIGURED="true"

# ── Kakao OAuth ──
AUTH_KAKAO_ID="..."
AUTH_KAKAO_SECRET="..."
NEXT_PUBLIC_KAKAO_CONFIGURED="true"

# ── 결제 (Toss) ──
NEXT_PUBLIC_TOSS_CLIENT_KEY=""
TOSS_SECRET_KEY=""

# ── 결제 (KakaoPay) ──
KAKAOPAY_SECRET_KEY="..."
KAKAOPAY_CID="TC0ONETIME"                # 포인트 충전 · 연습실 예약 직접결제(readyPracticeRoomPayment)
KAKAOPAY_PARTY_CID="TC0ONETIME"          # 파티룸 직접 결제용(readyPartyRoomPayment)

# ── SendGrid ──
SENDGRID_API_KEY="..."
CONTACT_TO_EMAIL="..."
CONTACT_FROM_EMAIL="..."

# ── SMS (SOLAPI - 주력) ──
SMS_PROVIDER="auto"   # 또는 "test" (실발송 없음, 로그만)
SOLAPI_API_KEY="..."
SOLAPI_API_SECRET="..."
SOLAPI_FROM_NUMBER="..."

# ── SMS (COOLSMS - 선택) ──
COOLSMS_API_KEY=""
COOLSMS_API_SECRET=""
COOLSMS_FROM_NUMBER=""

# ── 카카오 알림톡 (SOLAPI - 선택) ──
SOLAPI_KAKAO_ENABLED="false"
SOLAPI_KAKAO_PF_ID=""
```

---

## 📱 반응형 디자인

### 브레이크포인트

```typescript
// Tailwind CSS 4 기본값
{
  "sm": "640px",   // 태블릿
  "md": "768px",
  "lg": "1024px",  // 데스크톱
  "xl": "1280px",
  "2xl": "1536px"
}
```

### 반응형 패턴

1. **그리드**: 1~2열 (모바일) → 3~4열 (데스크톱)
2. **타이포그래피**: text-sm (모바일) → text-lg (데스크톱)
3. **패딩/마진**: p-4/py-14 (모바일) → p-6/py-20 (데스크톱)
4. **네비게이션**: 햄버거 메뉴 (모바일) → 전체 메뉴 (데스크톱)

---

## 🚀 개발 & 배포

### 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 (Webpack)
npm run dev

# 개발 서버 (Turbopack)
npm run dev:turbo

# 프로덕션 빌드
npm run build

# 프로덕션 서버
npm start

# Linter
npm run lint
```

### Prisma 명령어

```bash
# 스키마 → DB 동기화
npm run db:push

# 마이그레이션 생성/실행
npm run db:migrate

# 시드 데이터 삽입
npm run db:seed

# Prisma Studio (DB GUI)
npm run db:studio

# Prisma Client 재생성
npm run db:generate
```

### Vercel 배포

**환경 변수 설정**:
1. Vercel Dashboard → Settings → Environment Variables
2. `.env.local`의 모든 변수 추가
3. 특히 `NEXT_PUBLIC_SITE_URL`을 배포 도메인으로 변경

**Supabase Redirect URL 추가**:
1. Supabase Dashboard → Authentication → URL Configuration
2. Site URL: `https://your-domain.vercel.app`
3. Redirect URLs: `https://your-domain.vercel.app/**`

**재배포**:
```bash
git push origin main  # 자동 배포
# 또는 Vercel Dashboard → Deployments → Redeploy
```

---

## 💡 주요 상수 & 설정

### 상수 정의

**파일**: `src/lib/constants.ts`

```typescript
export const STUDIO_NAME = "A1 STUDIO";
export const STUDIO_TAGLINE = "보컬·댄스·연기·뮤지컬 연습실";
export const STUDIO_ADDRESS = "서울시 송파구 문정동 70-13 B1";
export const STUDIO_PHONE = "010-2994-0323";
export const STUDIO_KAKAO_CHANNEL = "https://pf.kakao.com/...";

export const STUDIO_AMENITIES = [
  "전신거울", "삼각대", "촬영용 조명",
  "전자피아노", "요가매트", "폼롤러"
];

export const METRO_STATIONS = [
  { line: "8호선", name: "문정역", walkMinutes: 8 },
  { line: "8호선", name: "장지역", walkMinutes: 10 },
];
```

### TypeScript 설정

**파일**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 📂 파일 구조

```
A1STUDIO/
├── src/
│   ├── app/
│   │   ├── page.tsx                        # 홈페이지
│   │   ├── layout.tsx                      # 루트 레이아웃
│   │   ├── globals.css                     # 글로벌 스타일
│   │   ├── spaces/                         # 연습실
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── booking/                        # 예약
│   │   │   ├── page.tsx
│   │   │   ├── complete/page.tsx
│   │   │   └── payment/
│   │   │       ├── toss/
│   │   │       └── kakao/
│   │   ├── party-room/                     # 파티룸 (신규)
│   │   │   ├── page.tsx
│   │   │   └── booking/
│   │   ├── charge/                         # 포인트 충전
│   │   │   ├── page.tsx
│   │   │   ├── success/page.tsx
│   │   │   ├── cancel/page.tsx
│   │   │   └── fail/page.tsx
│   │   ├── mypage/                         # 마이페이지
│   │   ├── onboarding/                     # 온보딩
│   │   │   ├── profile/page.tsx            # 1단계: 이름, 출생연도
│   │   │   └── phone/page.tsx              # 2단계: 휴대폰 인증
│   │   ├── one-day-class/                  # 원데이클래스
│   │   │   ├── page.tsx
│   │   │   ├── requests/page.tsx
│   │   │   └── announcements/page.tsx
│   │   ├── admin/                          # 관리자
│   │   │   ├── page.tsx
│   │   │   ├── members/page.tsx
│   │   │   ├── reviews/page.tsx            # 후기 관리
│   │   │   ├── class-requests/page.tsx
│   │   │   └── reservations/calendar/page.tsx
│   │   ├── reviews/                        # 후기
│   │   ├── notices/                        # 공지
│   │   ├── events/                         # 이벤트
│   │   ├── contact/                        # 문의
│   │   ├── location/                       # 오시는길
│   │   ├── guide/                          # 이용안내
│   │   ├── pricing/                        # 요금안내
│   │   ├── availability/                   # 예약현황
│   │   ├── privacy/                        # 개인정보처리방침
│   │   ├── terms/                          # 서비스 이용약관
│   │   ├── login/                          # 로그인
│   │   ├── signup/                         # 회원가입
│   │   ├── forgot-password/                # 비밀번호 찾기
│   │   ├── reset-password/                 # 비밀번호 재설정
│   │   └── api/                            # API Routes
│   │       ├── auth/
│   │       │   ├── email-signup/route.ts
│   │       │   ├── password-reset/
│   │       │   └── sms/
│   │       │       ├── send-code/route.ts  # SMS 인증번호 발송
│   │       │       └── verify-code/route.ts # SMS 인증번호 확인
│   │       ├── reservations/
│   │       │   ├── route.ts
│   │       │   ├── create/route.ts         # 포인트 예약
│   │       │   ├── cancel/route.ts
│   │       │   ├── available/route.ts
│   │       │   ├── holds/expire/route.ts
│   │       │   └── payments/kakao/         # 연습실 카카오페이 ready|approve|fail|cancel
│   │       ├── party-room/
│   │       │   ├── reservations/
│   │       │   └── payments/kakao/
│   │       ├── payments/
│   │       │   ├── toss/
│   │       │   └── kakao/
│   │       ├── charge/
│   │       │   ├── ready/route.ts
│   │       │   └── approve/route.ts
│   │       ├── members/
│   │       │   ├── profile/route.ts        # 프로필 조회/업데이트
│   │       │   ├── sync/route.ts
│   │       │   └── withdraw/route.ts
│   │       ├── member-roles/
│   │       │   └── role/route.ts
│   │       ├── admin/
│   │       │   ├── auth/route.ts
│   │       │   ├── dashboard/route.ts
│   │       │   ├── members/route.ts
│   │       │   ├── reviews/route.ts        # 후기 관리 API
│   │       │   └── reservations/calendar/route.ts
│   │       ├── one-day-class/route.ts
│   │       ├── notices/route.ts
│   │       ├── events/route.ts
│   │       ├── contact/route.ts
│   │       └── debug/
│   │
│   ├── components/
│   │   ├── HeroScroll.tsx                  # 히어로 스크롤
│   │   ├── FadeInSection.tsx               # 페이드인 래퍼
│   │   ├── OAuthCallbackHandler.tsx        # OAuth 콜백 핸들러
│   │   ├── home/                           # 홈 섹션
│   │   │   ├── StudioIntro.tsx
│   │   │   ├── AboutSection.tsx
│   │   │   ├── GallerySection.tsx
│   │   │   ├── PricingSummary.tsx
│   │   │   ├── ReviewsPreview.tsx
│   │   │   ├── LocationSection.tsx
│   │   │   └── Hero.tsx
│   │   └── layout/                         # 레이아웃
│   │       ├── Header.tsx
│   │       ├── Footer.tsx
│   │       ├── StickyBookingCTA.tsx
│   │       └── Providers.tsx
│   │
│   └── lib/                                # 유틸리티 & 로직
│       ├── constants.ts                    # 상수
│       ├── utils.ts                        # 유틸 함수
│       ├── pricing.ts                      # 가격 계산
│       ├── refund-policy.ts                # 환불 정책
│       ├── party-room-options.ts           # 파티룸 옵션
│       ├── kakaopay.ts                     # readyPayment/approvePayment, readyPracticeRoomPayment, 파티룸 전용, cancelPayment
│       ├── payment-lock.ts                 # 결제 락 (만료/활성 조회 헬퍼 포함)
│       ├── sms.ts                          # SMS 발송
│       ├── sms-otp.ts                      # SMS OTP
│       ├── message-templates.ts            # 메시지 템플릿
│       ├── phone-utils.ts                  # 전화번호 유틸
│       ├── age-check.ts                    # 연령 확인
│       ├── safe-redirect.ts                # 안전한 리다이렉트
│       ├── local-store.ts                  # 로컬 스토리지
│       ├── member-role.ts                  # 회원 등급 (클라이언트)
│       ├── member-role-db.ts               # 회원 등급 (DB)
│       ├── email-auth-db.ts                # 이메일 인증 DB
│       ├── db.ts                           # Prisma 클라이언트
│       ├── supabase-auth.ts                # Supabase Auth 헬퍼
│       ├── supabase/
│       │   ├── client.ts                   # 클라이언트용
│       │   └── server.ts                   # 서버용
│       └── payment/
│           ├── interface.ts                # 결제 인터페이스
│           ├── toss.ts                     # Toss Payments
│           └── kakaopay.ts                 # Kakao Pay
│
├── middleware.ts                           # Next.js 미들웨어 (라우트 가드)
├── prisma/
│   ├── schema.prisma                       # DB 스키마
│   └── seed.ts                             # 시드 데이터
│
├── public/
│   ├── logo.png                            # A1 STUDIO 로고
│   ├── 연습실.jpg                          # 메인 연습실 사진
│   ├── 1.jpg, 2.jpg, 3.jpg, 8.jpg          # 갤러리 이미지
│   └── ...
│
├── .env.local                              # 로컬 환경 변수 (git 무시)
├── .env                                    # 환경 변수 템플릿
├── package.json
├── tsconfig.json
├── README.md
├── AI_CONTEXT_PROMPT.md                    # AI 컨텍스트 (구버전)
├── AI_TRANSFER_PROMPT.md                   # AI 전달 프롬프트 (최신·전체)
├── AI_TRANSFER_BRIEF.md                    # AI용 짧은 판별·요약 (스택·도메인만)
├── HOMEPAGE_SPECIFICATION.md               # 홈페이지 상세 명세
├── KAKAO_CONSENT_SETUP.md                  # 카카오 동의 설정
├── VERCEL_DEPLOY.md                        # Vercel 배포 가이드
├── MOBILE_ACCESS.md                        # 모바일 접속 가이드
└── docs/
    └── SMS_SETUP.md                        # SMS 설정 가이드
```

### 결제 및 예약 안정성 (주요 파일)

- **`src/lib/payment-lock.ts`** — `acquirePaymentLock` / `releasePaymentLock`, **`deleteExpiredPaymentLocksForUser`**, **`getActivePaymentLocksForUser`**
- **`src/lib/supabase-points.ts`** — `deductPointsDB`, **`refundPointsDB`** (`reservationId` 선택·NULL 허용), `chargePointsDB` 등
- **`src/app/api/reservations/create/route.ts`** — 포인트 예약, INSERT 실패 시 **`refundPointsDB` + `releasePaymentLock`**
- **`src/app/api/reservations/payments/kakao/*`**, **`src/app/api/party-room/payments/kakao/*`** — 카카오 ready/approve/fail/cancel 및 락 정리
- **`src/app/error.tsx`**, **`src/app/not-found.tsx`**, **`src/app/global-error.tsx`** — 세그먼트·루트 에러·404 UI
- **`src/lib/logger.ts`** — 프로덕션 안전 콘솔 래퍼(점진 연동)
- **`middleware.ts`** — 프로필 검증 예외 시 프로덕션 `/login`; **`catch`에 `session refresh failed` 로그**
- **`GET /api/party-room/payments/kakao/approve`** — 선택적 쿼리 **`tid`** 와 쿠키 **`party_kakao_tid`** 교차 검증(`tid_mismatch`)

---

## 🎯 현재 상태 요약

### ✅ 구현 완료

**프론트엔드**:
- ✅ 반응형 홈페이지 (히어로 스크롤, 소개, 갤러리, 가격 등)
- ✅ 스튜디오/대표 소개, 용도/비품 안내
- ✅ 라이트박스 갤러리 (PC/모바일)
- ✅ 요금 안내 (이벤트 가격 적용)
- ✅ 인증 시스템 (Google/Kakao OAuth, Phone OTP - 소셜 로그인만)
- ✅ 회원가입 페이지 (Google/Kakao 소셜만, 약관 동의)
- ✅ 온보딩 플로우 (프로필 입력, 휴대폰 SMS 인증)
- ✅ 라우트 가드 미들웨어 (인증 & 온보딩 체크, Prisma 기반; 프로필 검증 예외 시 **프로덕션** `/login`)
- ✅ 글로벌 **`error.tsx`** · **`not-found.tsx`** · **`global-error.tsx`** (세그먼트·루트 예외·404 UX)
- ✅ 예약 시스템 (연습실 — 포인트 또는 카카오페이)
- ✅ 파티룸 예약 (포인트 또는 카카오페이 직접 결제)
- ✅ 포인트 충전 (Kakao Pay)
- ✅ 마이페이지 (포인트, 예약내역, 계정)
- ✅ 예약 취소 & 환불
- ✅ 원데이클래스 (공고, 신청, 요청)
- ✅ 회원 등급 (CM)
- ✅ 관리자 대시보드 (기본)
- ✅ 관리자 예약 캘린더
- ✅ 관리자 후기 관리 (조회, 공개/비공개, 삭제)
- ✅ 문의하기, 공지/이벤트
- ✅ 개인정보처리방침

**백엔드 & 시스템**:
- ✅ Prisma + PostgreSQL (Supabase)
- ✅ Supabase Auth + 포인트 시스템
- ✅ User 모델 확장 (birthYear, phone, phoneVerified, marketingAgreed)
- ✅ 프로필 API (GET/POST /api/members/profile, Zod error.issues 사용)
- ✅ SMS 인증 API (send-code: SOLAPI 실제 발송, verify-code)
- ✅ SMS 라이브러리 (sendSMS 파라미터: text 필드 사용)
- ✅ Next.js 미들웨어 (라우트 가드, 온보딩 플로우 강제, runtime: nodejs)
- ✅ 레거시 코드 정리 (src/proxy.ts 삭제, Header.tsx, login/page.tsx)
- ✅ 관리자 후기 관리 (Supabase reviews 테이블 직접 조회/수정/삭제)
- ✅ 카카오페이 결제 연동 (포인트 충전 + 연습실·파티룸 직접 결제; `readyPracticeRoomPayment` / 파티 `readyPartyRoomPayment`)
- ✅ SMS 발송 (SOLAPI/COOLSMS)
- ✅ 이메일 발송 (SendGrid)
- ✅ 결제 락 시스템 (중복 결제 방지)
- ✅ 메시지 로그 (SMS 발송 기록)
- ✅ 외부 플랫폼 예약 연동 준비

### ⏳ 준비 중

- ⏳ Toss Payments 연동 (환경변수만 준비됨)
- ⏳ 네이버 지도 임베드 (현재 플레이스홀더)
- ⏳ 카카오 알림톡 (SOLAPI - 선택 기능)
- ⏳ 고급 관리자 기능 (통계, 정산 등)
- ⏳ 후기 이미지/동영상 표시 (관리자 페이지)

### 🔧 개선 필요

- 🔧 이메일/비밀번호 로그인 재구현 (현재 소셜 로그인만 지원)
- 🔧 회원 탈퇴 처리 완성도 향상
- 🔧 예약 리마인더 자동 발송
- 🔧 환불 처리 자동화
- 🔧 관리자 통계 대시보드 고도화

---

## 📋 사용 예시

이 프롬프트를 GPT/Claude에게 전달할 때:

```
아래는 A1 STUDIO 웹사이트의 전체 구조와 정보입니다.
이 컨텍스트를 바탕으로 [여기에 구체적인 요청 사항을 입력하세요].

[AI_TRANSFER_PROMPT.md 전체 내용 붙여넣기]
```

### 예시 질문:

1. **기능 개선**:
   - "예약 시스템의 포인트 차감 로직을 개선해줘"
   - "파티룸 예약에 시간 연장 기능을 추가해줘"
   - "관리자 대시보드에 월별 매출 통계를 추가해줘"

2. **버그 수정**:
   - "예약 취소 시 SMS가 발송되지 않는 문제를 해결해줘"
   - "모바일에서 갤러리 라이트박스가 제대로 작동하지 않아"

3. **새 기능 추가**:
   - "카카오페이 외에 토스페이먼츠도 지원하도록 수정해줘"
   - "회원 등급에 VIP 등급을 추가하고 할인 혜택을 적용해줘"
   - "예약 1시간 전 리마인더 SMS 자동 발송 기능을 추가해줘"

4. **리팩토링**:
   - "결제 관련 코드를 통합하여 중복을 제거해줘"
   - "API 라우트에 에러 핸들링을 표준화해줘"

---

## 💡 디자인 철학 & 개발 원칙

### 디자인

1. **프리미엄 감성**
   - 차분한 베이지/크림 톤
   - 세련된 세리프 타이포그래피
   - 여백과 균형 중시

2. **명확한 정보 전달**
   - 직관적인 섹션 구성
   - 아이콘과 텍스트의 조화
   - 가독성 높은 타이포그래피

3. **부드러운 인터랙션**
   - 자연스러운 페이드/슬라이드
   - 호버 효과
   - 스크롤 연동 애니메이션

4. **접근성 고려**
   - 시맨틱 HTML
   - 키보드 네비게이션
   - 애니메이션 감소 모드 지원

### 개발

1. **타입 안정성**
   - TypeScript strict 모드
   - Zod 스키마 검증
   - Prisma 타입 생성

2. **성능 최적화**
   - Next.js Image 컴포넌트
   - 폰트 최적화 (next/font)
   - 코드 스플리팅

3. **보안**
   - 서버 전용 환경 변수 분리
   - RLS (Row Level Security) 활용
   - CSRF 토큰 (예정)

4. **확장성**
   - 모듈화된 컴포넌트
   - 재사용 가능한 유틸리티
   - 동적 가격 룰 시스템

---

## 🔗 외부 서비스 연동

### Supabase
- **용도**: 데이터베이스, 인증, 포인트 시스템
- **URL**: https://czscrcsaoefoqpynpbyv.supabase.co
- **설정**: Dashboard > Settings > API

### Kakao Pay
- **용도**: 포인트 충전, 파티룸 직접 결제
- **API**: https://developers.kakao.com/docs/latest/ko/kakaopay/common
- **CID**: TC0ONETIME (단건 결제용)

### SOLAPI (주력 SMS)
- **용도**: SMS 발송, 예약 알림
- **URL**: https://solapi.com/
- **설정**: 콘솔 > 설정 > API Key

### COOLSMS (선택 SMS)
- **용도**: SMS 발송 (대체)
- **URL**: https://www.coolsms.co.kr/

### SendGrid
- **용도**: 이메일 발송 (문의하기, 비밀번호 재설정)
- **URL**: https://sendgrid.com/

### Google OAuth
- **용도**: 소셜 로그인
- **설정**: Google Cloud Console > API & Services > Credentials

### Kakao OAuth
- **용도**: 소셜 로그인
- **설정**: Kakao Developers > 내 애플리케이션

---

## 📝 추가 문서

### 프로젝트 루트 문서

1. **README.md**: 프로젝트 시작 가이드
2. **AI_CONTEXT_PROMPT.md**: AI 컨텍스트 (구버전)
3. **AI_TRANSFER_PROMPT.md**: AI 전달 프롬프트 (최신 - 본 문서)
4. **HOMEPAGE_SPECIFICATION.md**: 홈페이지 상세 명세
5. **KAKAO_CONSENT_SETUP.md**: 카카오 동의 설정
6. **VERCEL_DEPLOY.md**: Vercel 배포 가이드
7. **MOBILE_ACCESS.md**: 모바일 접속 가이드
8. **docs/SMS_SETUP.md**: SMS 설정 가이드

---

## 🎬 마무리

이 문서는 A1 STUDIO 웹사이트의 **완전한 기술 문서**입니다.

**포함 내용**:
- 프로젝트 개요 & 목적
- 전체 기술 스택
- 데이터베이스 스키마 (Prisma + Supabase)
- 페이지 구조 & API 엔드포인트
- 핵심 비즈니스 로직 (예약, 결제, 포인트)
- 홈페이지 섹션 상세 설명
- 주요 컴포넌트 & 애니메이션
- 인증 & 환경 변수
- 파일 구조
- 현재 상태 & 개선 필요 사항
- 외부 서비스 연동 정보

---

## 📝 최근 수정 사항 (2026-04-17)

### 회원가입 & 온보딩 시스템 구현

**1. 데이터베이스 스키마 확장**
- User 모델에 `birthYear`, `phone`, `phoneVerified`, `marketingAgreed` 필드 추가

**2. 회원가입 페이지 (`/signup`)**
- Google/Kakao 소셜 로그인만 지원 (이메일 가입 제거)
- 약관 동의 (개인정보, 이용약관, 마케팅)
- OAuth redirectTo: `window.location.origin` 사용 (환경변수 하드코딩 제거)

**3. 온보딩 플로우**
- `/onboarding/profile`: 이름, 출생연도 입력
- `/onboarding/phone`: 휴대폰 SMS 인증 (SOLAPI 연동)

**4. 미들웨어 라우트 가드 (`middleware.ts`)**
- `export const runtime = "nodejs"` 추가
- Prisma `phoneVerified` 기반 온보딩 플로우 강제
- 프로필 API fetch 디버깅 로그 추가:
  ```typescript
  console.log("[middleware] 실행됨:", request.nextUrl.pathname);
  console.log("[middleware] profile fetch status:", profileRes.status);
  const rawText = await profileRes.text();
  console.log("[middleware] profile raw response:", rawText);
  console.log("[middleware] profile response:", JSON.stringify(profile));
  console.log("[middleware] name:", profile?.name, "birthYear:", profile?.birthYear, "phoneVerified:", profile?.phoneVerified);
  ```
- 레거시 `src/proxy.ts` 파일 완전 삭제 (phone 리다이렉트 로직 제거)

**5. 프로필 API (`/api/members/profile`)**
- `createClient` 사용 (from `@/lib/supabase/server`)
- `{ prisma }` named import 사용 (from `@/lib/db`)
- Zod 에러: `error.issues[0]?.message` 사용

**6. SMS 인증 API (`/api/auth/sms/send-code`)**
- SOLAPI를 통한 실제 SMS 발송 구현
- `sendSMS()` 함수 사용
- 메시지 템플릿: `[A1 STUDIO] 인증번호는 [${code}]입니다. 3분 내에 입력해주세요.`

**7. SMS 라이브러리 (`src/lib/sms.ts`)**
- `SendMessageParams` 파라미터: `message` → `text`로 변경
- SOLAPI/COOLSMS 모두 `text` 필드 사용

**8. 레거시 코드 제거**
- `src/proxy.ts`: 파일 전체 삭제 (phone 관련 리다이렉트 로직 포함)
- `src/components/layout/Header.tsx`: 
  - `isProfileComplete` state 및 관련 로직 제거
  - phone 리다이렉트 로직 제거 (`getGuardedHref` 함수 단순화)
  - 모바일 UI 개선: 마이페이지, 관리자 버튼에 `hidden lg:flex` 추가 (햄버거 메뉴 공간 확보)
- `src/app/login/page.tsx`: phone 리다이렉트 로직 제거, "로그인 상태 유지" 체크박스 제거

**9. 로그인 페이지 개선**
- `/login` → `/signup` 회원가입 링크 추가
- 소셜 로그인만 지원 (이메일 로그인 종료 안내)
- 개인정보 수집·이용 동의 필수

**10. 관리자 후기 관리 기능 추가**
- `src/app/api/admin/reviews/route.ts` 생성 (Supabase 직접 사용):
  - GET: 전체 후기 목록 조회 (`reviews` 테이블, `author_name`, `is_visible` 등)
  - PATCH: `is_visible` 공개/비공개 토글
  - DELETE: 후기 삭제
- `src/app/admin/reviews/page.tsx` 생성:
  - 관리자 인증 체크 (`useAdmin` 훅)
  - 후기 목록 테이블 (닉네임, 별점, 내용, 공개여부, 작성일, 액션)
  - 공개/비공개 토글 버튼
  - 삭제 확인 모달
  - A1 STUDIO 디자인 시스템 적용
- `src/app/admin/page.tsx`: "후기 관리" 탭(4번째) 추가, `/admin/reviews` 링크 연결

**11. 후기 시스템 데이터 소스 확인**
- 일반 사용자 후기 페이지 (`/reviews`): Supabase `reviews` 테이블 사용 (`author_name`, `is_visible`, `image_url`, `video_url`)
- 관리자 후기 관리: Supabase `reviews` 테이블 직접 조회/수정 (Prisma Review 모델과 별도)

---

## 📝 최근 수정 사항 (2026-04-20)

### 1. OAuth 콜백 (`src/app/auth/callback/route.ts`)
- Supabase `createServerClient` 세 번째 인자에 `auth` 옵션 추가: `flowType: 'pkce'`, `detectSessionInUrl: true`, `persistSession: true` (클라이언트·서버 세션 정책 정렬, PKCE 흐름 명시)

### 2. 회원 탈퇴 API (`src/app/api/members/withdraw/route.ts`)
- `withdrawMemberByUserId` 처리 후 `prisma.$executeRaw`로 Postgres `member_roles` 테이블에서 탈퇴 사용자 이메일 행 `DELETE` (실패 시 `console.error`만, 본 흐름은 유지)
- `import { prisma } from "@/lib/db"` 사용

### 3. 서비스 이용약관 페이지 (`src/app/terms/page.tsx`)
- 신규 추가: `/terms`, 제목「서비스 이용약관」, 시행일 2026-05-01
- 레이아웃·타이포는 `privacy` 페이지와 동일한 LEGAL 문서 스타일(히어로 + 본문 `max-w-7xl` + 하단 사업자 정보 박스)

### 4. `member_profiles` 테이블 의존 제거 및 `profiles` 통합
- **`src/lib/member-profile-db.ts` 파일 삭제** (Supabase `member_profiles` 전용 DDL/upsert 모듈 — 더 이상 사용하지 않음)
- **`POST /api/reservations/create`** (`src/app/api/reservations/create/route.ts`):
  - 파티룸 성인 검증·연락처 조회: `supabase.from('profiles')`, `.eq('id', user.id)`, `select('birth_year')` / `select('phone, birth_year')`
  - `isAdult`는 출생연도만 있을 때 `isAdult(new Date(birthYear, 11, 31))`로 호출 (기존 `isAdult(birthdate)` 시그니처 유지)
- **`GET /api/debug/profiles`** (`src/app/api/debug/profiles/route.ts`): raw SQL 대상 테이블을 `member_profiles` → **`profiles`**, 컬럼 `birth_date` → **`birth_year`**
- **`POST /api/account/delete`** (`src/app/api/account/delete/route.ts`): `member_profiles` 행 비식별화 `update` 블록 **전체 제거** (테이블/기능 폐기에 맞춤)

### 5. 문서·경로 반영
- 라우트 목록·`src/app` 트리에 `/terms` · `terms/page.tsx` 반영
- `src/lib` 파일 트리에서 `member-profile-db.ts` 항목 제거

---

## 📝 최근 수정 사항 (2026-04-21)

### 1. OAuth 콜백 — `auth.users.id`와 `profiles`(Prisma User) 즉시 정렬 (`src/app/auth/callback/route.ts`)
- `exchangeCodeForSession` 성공 후 `supabase.auth.getUser()`로 확정된 사용자에 대해, **`user.id` = `auth.users.id`**로 `prisma.users.upsert` 실행 (email, name, avatarUrl, provider — `/api/members/sync`와 동일한 metadata 매핑 헬퍼 사용).
- **카카오**에서 이름·출생연도·전화번호 등 추가 반영: 서버 내부 `fetch('/api/members/profile')` 호출 **제거** (같은 요청에서 세션 쿠키가 내부 fetch에 안 실려 401이 나기 쉬움) → **`prisma.users.update`**로 동일 핸들러 내 직접 갱신.
- upsert/update 실패 시 `console.error`만 남기고 **리다이렉트(`next`) 흐름은 유지**.
- **(2026-04-20 후속)** 위 범용 콜백 `upsert`는 **삭제**됨. 현재는 **카카오만** 콜백에서 Kakao API + 조건부 `upsert`로 동기화 — 상세는 **아래 §5** 참고.

### 2. 카카오 `signInWithOAuth` — `scopes` 문자열 (`src/lib/auth-client.tsx`, `src/app/signup/page.tsx`)
- **진입점**: `/login`은 `signIn('kakao', …)` → `auth-client.tsx`의 `signInWithOAuth`; `/signup`은 `signup/page.tsx`에서 직접 `signInWithOAuth`.
- Supabase Auth(GoTrue)는 `options.scopes`에 **공백으로 구분된 scope 목록**을 기대함. 쉼표-only 문자열은 authorize 단계에서 Kakao와 맞지 않을 수 있어 **`name birthyear phone_number`** 형태(공백 구분)로 통일.
- **`openid` scope**: Kakao Developers 앱에서 **OpenID Connect가 꺼져 있으면** `openid` 요청 시 **KOE205 / invalid_scope**가 발생할 수 있음 → 운영에서는 **`openid`를 넣지 않음**. ID 토큰·OIDC가 필요하면 **카카오 콘솔에서 OpenID Connect 활성화** 후 코드에 `openid`를 다시 넣는 방식으로 검토.

### 3. 카카오 OAuth scopes 확정 (`src/lib/auth-client.tsx`, `src/app/signup/page.tsx`)
- 로그인·회원가입 모두 Supabase `signInWithOAuth`의 `options.scopes`에 **공백 구분** 문자열 사용.
- 현재 값: **`profile_nickname account_email name birthyear phone_number`** (닉네임·이메일·이름·출생연도·전화번호; 카카오 Developers 필수 동의 항목과 맞출 것).

### 4. Prisma 7 — datasource & 멀티 스키마 (`prisma/schema.prisma`, `prisma.config.ts`)
- **Prisma 7**: `schema.prisma`의 `datasource`에서 **`url = env("DATABASE_URL")` 제거** — DB URL은 **`prisma.config.ts`**에서만 관리.
- `schemas = ["public", "auth"]` + 전 모델 `@@schema("public")` 조합은 **Supabase `auth` 스키마까지 Prisma가 건드릴 여지**가 있어, 운영方針에 따라 **datasource는 `provider = "postgresql"`만 유지**하는 형태로 정리.
- Prisma 규칙상 **`datasource`에 `schemas` 배열이 없으면 `@@schema(...)`를 쓸 수 없음** → 기존에 추가했던 **`@@schema("public")` 줄은 제거**됨. 앱 테이블은 여전히 Postgres 기본 스키마 `public`을 사용.
- **(후속, 2026-04-22)**: `schemas = ["public"]` + **전 모델/enum** `@@schema("public")` 로 다시 통일. 이 문서의 `## 📝 최근 수정 사항 (2026-04-22)` §1 참고.

### 5. OAuth 콜백 — 카카오 전용 프로필 동기화 (`src/app/auth/callback/route.ts`)
- **첫 번째(범용) `prisma.users.upsert` 전체 제거** — 메타데이터 `name`이 닉네임으로 잘못 들어가는 문제 방지. **카카오는 이 파일의 카카오 분기에서만** Prisma 프로필을 맞춤.
- **디버깅 로그** (`Provider`, `user_metadata`, `app_metadata` JSON)은 **`user.app_metadata?.provider === 'kakao'` 분기** 안, `try` 시작 직후에만 출력.
- **카카오 사용자 정보**: `getSession()`의 **`provider_token`**으로 `GET https://kapi.kakao.com/v2/user/me` 호출 → `kakao_account`에서 실명·닉네임·출생연도·전화번호 추출.
- **전화번호 정규화**: 공백 제거 → **하이픈 제거** → `+82` → 선행 `0` (예: `010…`).
- **`upsert`**: `create`는 기존 필드 구조 유지. **`update`는 `updateData` 객체를 조건부로 구성** — 값이 있을 때만 `name`, `nickname`, `birthYear`, `phone`/`phoneVerified`, `avatarUrl`를 넣어 **null로 기존 행을 덮어쓰지 않음**. 성공 로그에 `updateData` 포함(디버깅용).

### 6. 회원 동기화 API — 카카오 `name` 보호 (`src/app/api/members/sync/route.ts`)
- **`provider === 'kakao'`** 인 경우 **`update`에서만 `name` 제외**:  
  `...(isKakao ? {} : { name: userName })`  
  실명·프로필명은 **`/auth/callback`에서 이미 반영**하므로 sync가 메타데이터로 다시 덮어쓰지 않음.
- **`create`**(최초 행 생성)은 기존처럼 `name: userName` 유지.

---

## 📝 최근 수정 사항 (2026-04-24)

### 환불 정책 시스템 완성

**1. 타임존 통일 (서울 기준)**

- 문제: 서버(UTC)와 클라이언트(KST) 날짜 차이로 환불 금액 불일치
- 해결: `getDaysDifference` 함수에서 `Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul' })` 사용
- 결과: 서버/클라이언트 모두 동일한 "서울 달력 일수" 계산

**2. 환불 정책 최종 확정**

**연습실:**

- 이용 3일 전: 100% 환불
- 이용 2일 전: 50% 환불
- 이용 전날: 취소 불가
- 이용 당일: 취소 불가

**파티룸:**

- 이용 7일 전 이상: 100% 환불
- 이용 3일 ~ 6일 전: 50% 환불
- 이용 전날: 취소 불가
- 이용 당일: 취소 불가

(코드: `getDaysDifference` 기준 파티룸은 예약일까지 **달력 일수 3일 미만**이면 취소·환불 불가이므로 **이용 2일 전**도 동일 구간에 포함된다.)

**3. SMS 테스트 모드**

- `SMS_PROVIDER="test"` 환경변수 추가
- 실제 SMS 발송 없이 로그만 출력
- Development/Preview 환경에서 사용

**4. party_reservations 스키마 확장**

- 컬럼 추가(예): `package_type`, `end_date`, `is_event_price`, `memo`, `payment_method`, `points_used`, `refund_points`, `refund_amount`, `refund_method`, `auth_code`, `room_options`, `special_requests`, `price_type` 등 — **상세 SQL은 본 문서 「최근 수정 사항 (2026-04-24) — 부록: 스키마·RPC 상세」 절 참고**
- 파티룸 예약·결제·환불 메타 저장에 사용

**5. 마이페이지 환불 금액 수정**

- 클라이언트도 서버와 동일한 `calculatePracticeRoomRefund` / `calculatePartyRoomRefund` 함수 사용
- 서버-클라이언트 환불 금액 일치

**6. Prisma RLS 우회**

- `users` 테이블 조회를 Supabase PostgREST → **Prisma(DB 직결)** 로 전환하는 경로 정리(파티룸 생성·프로필 등)
- RLS로 `permission denied` 나던 조회 보완

---

## 📝 최근 수정 사항 (2026-04-22)

### 1. Prisma 멀티 스키마 (현행 `prisma/schema.prisma`와 정렬)

- `datasource db`에 **`schemas = ["public"]`** 사용.
- **모델·enum**마다 **`@@map("...")`와 함께 `@@schema("public")`** 를 둔다.  
  (2026-04-21 기록에 있었던 *「`@@schema` 제거·datasource `schemas` 없음」* 은 **이후** 위 형태로 다시 맞춘 상태임.)

### 2. 예약·충전·권한 테이블 (Prisma)

- **`Reservation`**: `packageType`(`package_type`), `reservationType`(`reservation_type`) — 선택(String?, 예약·패키지 구분용).
- **`ChargePackage`**: `charge_packages` 매핑, 포인트 충전 플랜(금액·보너스·정렬·`is_active` 등), **`createdAt`(`created_at`)** 포함. `bonusRate` / `bonusPoints`는 **선택**(`Float?` / `Int?`).
- **`MemberRole`**: `member_roles` — `email` PK, `role`(예: `"CM"`), `created_at` / `updated_at`.  
- **`prisma db push`**: Supabase·기존 데이터에 따라 `reviews` 유니크·`blocked_slots` PK 등 **데이터 손실 경고**가 날 수 있음 — `--accept-data-loss` 여부는 별도 검토.

### 3. 자유게시판 (`board_posts`) — **폐기** *(역사 기록, 2026-04-22 시점 서술)*

**현행(2026-05-01 이후):** 자유게시판·`board_posts` 앱 코드 **삭제**. `src/`·`prisma/`에서 **`board_posts` 문자열 없음**이 정상. DB에 테이블이 남아 있어도 앱은 참조하지 않음. 삭제 파일·네비 권장 안은 **`## 📝 최근 수정 사항 (2026-05-01)`** 참고.

**당시(2026-04-22) 구현 요약 (더 이상 코드에 없음):**

- `public.board_posts` + `public.profiles` 조인: `src/lib/board-db.ts` (`Prisma.$queryRaw` / `$executeRaw`).
- `src/app/board/page.tsx`, `src/app/board/[id]/page.tsx`, `src/app/api/board/route.ts`에서 위 헬퍼 사용. (게시 `id` 생성: `randomUUID()`.)
- *당시 참고*: Prisma에 `BoardPost` 모델 없이 Raw만 쓰는 전제.

### 4. OAuth 콜백 — 카카오 온보딩 리다이렉트 타이밍 (`src/app/auth/callback/route.ts`)

- **카카오** 분기: Kakao API + `prisma.users.upsert` 등 처리 **끝난 뒤**, `prisma.users.findUnique`로 **프로필을 다시 읽고** 온보딩 경로(`/onboarding/profile` · `/onboarding/phone`)를 결정한 뒤 **`return NextResponse.redirect(...)`** — 저장 직후 DB 반영이 온보딩 판단에 쓰이도록.
- **그 외 OAuth**(예: Google): 기존과 같이 `// 구글 등 다른 OAuth는 기존 로직 사용` 아래 공통 `if (user?.id) { findUnique ... }` 블록.
- **Git** (예): `fix: 카카오 OAuth 온보딩 체크 타이밍 수정` 커밋에 해당.

**Supabase — `public.profiles`와 `auth.users` 트리거 (운영 수동 SQL)**

- 앱은 카카오 콜백에서 **`prisma.users.upsert`** (`where: { id: user.id }`, `create`에 전체·`update`는 조건부 `updateData`)로 `profiles`를 맞춤.
- Supabase에 **`on_auth_user_created` 등으로 `auth.users` INSERT 시 `profiles`를 만드는 트리거**가 있으면, **행 생성 타이밍**과 콜백 `update`-only/upsert 정책이 어긋날 수 있음. 콜백 upsert를 **단일 생성 경로**로 쓰려면 SQL Editor 등에서 (필요할 때만) 트리거를 끔:
  ```sql
  ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
  ```
- 되돌리기: `ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;` — **트리거를 끄면** 그 시점 이후 가입에 트리거 쪽 효과가 없으므로, 앱/API에서 `profiles` 생성·동기화를 **반드시** 보장할 것. 프로덕션은 백업·검토 후 적용.

### 5. `User` 문서·스키마

- `User`에 `nickname` 필드(문서 본문 상단 Prisma 스니펫·실제 `schema.prisma` 기준) 반영.

---

## 📝 최근 수정 사항 (2026-04-25)

### Prisma/Supabase 시스템 최적화

**1. 시스템 역할 재분배**
- Supabase 전담: 인증, 포인트 시스템, 후기, 예약 홀드, 메시지 로그
- Prisma 전담: 예약, 결제, 원데이클래스, 공지/이벤트

**2. Prisma 스키마 정리**
- Review, ReservationHold, MessageLog 모델 제거
- Supabase에서 직접 관리하는 테이블로 이관

**3. Supabase 헬퍼 함수 생성**
- `src/lib/supabase-points.ts`: 포인트 시스템 타입 안전 헬퍼
  - `deductPointsDB` (`use_points` RPC; 예전 이름 `usePointsDB`는 React hooks 규칙 오탐 방지로 변경), `chargePointsDB`, `refundPointsDB`, `getPointBalance`, `getPointTransactions`
- `src/lib/supabase-reviews.ts`: 후기 시스템 타입 안전 헬퍼
  - `getPublicReviews`, `getAllReviews`, `toggleReviewVisibility`, `deleteReview`, `createReview`

**4. API·페이지 통합**
- **연습실 예약 생성** (`src/app/api/reservations/create/route.ts`): `deductPointsDB`, 응답에 `pointBalance` 등
- **파티룸 예약 생성** (`src/app/api/party-room/reservations/create/route.ts`): 동일하게 `deductPointsDB` (카카오 결제 준비 `fetch` 없음 — 포인트 차감 플로우)
- **예약 취소** (`src/app/api/reservations/cancel/route.ts`): `refundPointsDB` + 필요 시 `getPointBalance`
- **포인트 충전 승인** (`src/app/api/charge/approve/route.ts`): 세션·진단용 `public.users` 프로브·`[Charge Approve] Step` 로그 후 `chargePointsDB` (`charge_points` RPC); 성공 리다이렉트에 `newBalance` 등 (상세는 본 문서 **「9. 카카오페이 충전 승인」** 및 **「최근 수정 사항 (2026-04-25) → 6. 충전 승인 라우트」**)
- **관리자 후기** (`src/app/api/admin/reviews/route.ts`): `getAllReviews` / `toggleReviewVisibility` / `deleteReview`; **Supabase 로그인 + 헤더 `x-admin-password`** (`ADMIN_PASSWORD`)
- **관리자 후기 UI**: `src/lib/admin-context.tsx` — 로그인 성공 시 `ADMIN_PASSWORD_SESSION_KEY`로 비밀번호 보관(세션), `src/app/admin/reviews/page.tsx`에서 API 호출 시 헤더 전달·응답 `{ reviews }`·필드 `authorName`
- **공개 후기 페이지** (`src/app/reviews/page.tsx`): `getPublicReviews()`, camelCase 표시 필드

**5. Toss Payments 제거**
- 삭제: `src/lib/payment/toss.ts`, `src/app/api/payments/toss/**`, `src/app/booking/payment/toss/**`
- `.env.example`에서 Toss 키 제거; `src/types/index.ts`의 Toss 전용 타입 제거
- 빌드 캐시: 라우트 삭제 후 TypeScript 오류 시 `.next` 삭제 후 재빌드

**6. 데이터 흐름 (보정)**
- 포인트: Supabase RPC (헬퍼 경유)
- **연습실/파티룸 예약 레코드**: Supabase `reservations` / `party_reservations` 등(앱 기준); Prisma `Reservation` 모델과 병행 여부는 스키마 기준으로 구분
- 문서 상 “협업: Prisma 예약 생성”은 일부 플로우와 다를 수 있음 → 실제 API 구현 기준 우선

### Prisma `users` 모델·클라이언트 (`db pull` 이후)

- Prisma 모델명 **`users`** → 클라이언트 **`prisma.users`**
- 스키마 필드가 **snake_case**로 인트로스펙션된 경우(`birth_year`, `phone_verified`, `avatar_url`, `created_at`, `updated_at` 등): API에서 Prisma 쓰는 구간은 DB 필드명에 맞춤
- 영향 파일 예: `src/app/auth/callback/route.ts`, `src/app/api/members/profile/route.ts`, `src/app/api/members/sync/route.ts`, `src/app/api/find-account/route.ts`, `src/app/api/admin/members/route.ts`, `src/app/api/account/delete/route.ts`, `src/lib/member-role-db.ts`
- 공개 API 응답은 기존처럼 **camelCase**(`serializeProfile` 등) 유지 가능

### 사용자 검증 헬퍼 (2층 안전망)

- **`src/lib/user-validation.ts`**: `validateUserExists(userId)`, `USER_NOT_FOUND_ERROR`
- **호출 위치**: `deductPointsDB` 또는 신청 저장 직전
  - `src/app/api/reservations/create/route.ts`
  - `src/app/api/party-room/reservations/create/route.ts`
  - `src/app/api/one-day-class/route.ts` (신청 분기: `getUser()`로 `userId` 확보, 비로그인이면 `validateUserExists(null)` → 통과)

### Prisma Migrate / Supabase FK (참고)

- `public.party_reservations` → `auth.users` FK가 있으면 `schemas = ["public"]`만 쓸 때 **`migrate dev` P4002** 가능
- 완화용 SQL 예시: `prisma/scripts/drop-party-reservations-auth-fkey.sql` (Supabase SQL Editor에서 실행 검토)
- `auth` 스키마를 Prisma datasource에 넣는 방식은 Supabase 관리 `auth` 전체 drift 이슈로 **운영 DB에 부적합**할 수 있음

### Supabase Auth 사용자 삭제 자동화 (DB)

**파일:** Supabase SQL (Database Functions)

**목적:** Supabase Authentication에서 사용자를 삭제하면 관련 데이터를 자동 정리

**1. Cascade Trigger (개요)**

```sql
-- Supabase SQL Editor에서 실행됨

-- 트리거 함수: handle_user_delete()
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
```

**동작 요약:**
- `auth.users` 삭제 시 실행
- 삭제 전 `auth_deletion_logs` 기록
- 관련 `public` 데이터 순차 삭제
- 후기는 삭제 대신 익명화

**2. 삭제·보존 범위**

- **자동 삭제(예시):** `users`, `user_points`, `point_transactions`, `reservations`/`party_reservations`(해당 `user_id`), `one_day_class_applications`, `message_logs`, `payment_locks`, `accounts`, `sessions`
- **보존:** `payments`, `refunds`; `reviews`는 익명화(`nickname = '탈퇴한 사용자'` 등 정책에 따름); 비회원 예약(`user_id` NULL)

**3. 대시보드 사용:** Authentication → Users → Delete

**로그 확인:**

```sql
SELECT * FROM public.auth_deletion_logs ORDER BY deleted_at DESC LIMIT 10;
```

**4. 트리거 구조(예시)**

```sql
-- auth.users:
-- 1. on_auth_user_created → handle_new_user() (기존)
-- 2. on_auth_user_deleted → handle_user_delete() (신규)
```

---

## 📝 최근 수정 사항 (2026-04-23)

### 1. OAuth 콜백 — 카카오 (`src/app/auth/callback/route.ts`)

- **catch에 `return`**: 카카오 처리 예외 시에도 `NextResponse.redirect`로 종료. 반환 누락 시 하단 **구글 등 공통 OAuth** 블록이 이어져 **온보딩 체크가 두 번** 도는 문제 방지.
- **온보딩 로그**: 프로필 `findUnique` 후 리다이렉트 분기마다 콘솔 로그(프로필 부재·전화 미인증·완료).
- **온보딩 완료 + `next`**: 이미 온보딩이 끝난 경우 `next`가 `/onboarding/...`이면 **홈 `/`로** 보냄 — 예약/콜백 루프 완화.
- **전화번호 중복**: 카카오에서 `kakaoPhone`을 받은 뒤, 저장·`findUnique` 전에 `prisma.users.findUnique({ where: { phone: kakaoPhone } })`로 **다른 `user.id`가 쓰는 번호면** `GET /signup/error?reason=phone_duplicate`로 리다이렉트(동일 `user.id`면 업데이트 허용).

### 2. 파티룸 예약 — 성인/출생연도 (`src/app/party-room/booking/page.tsx`)

- **`useIsAdult === null`**: 출생연도 미확정 시 마이페이지 대신 **`/onboarding/profile?returnTo=/party-room/booking`** 로 보내고 안내 문구 정리.
- **`useIsAdult` 훅 디버깅** (`src/lib/auth-client.tsx`): 프로필 `fetch`에 **세션 이메일 없음**, **HTTP status**, **API 본문·`birthYear`**, **실패 시 `success`/`profile`/`birthYear`**, **나이·`isAdult`**, **`catch` 에러** 로그 추가(원인 추적용, 운영 전 정리 검토).

### 3. 온보딩 프로필 — 복귀 URL (`src/app/onboarding/profile/ProfileOnboardingClient.tsx`)

- 쿼리 **`next`가 없으면 `returnTo`** 도 `sanitizePostAuthRedirect`에 넘겨 **`nextUrl`**(로그인 callback·저장 후 이동)로 사용.

### 4. 아이디 찾기 (SMS 인증 재사용)

- **`GET /api/find-account`** (`src/app/api/find-account/route.ts`): 쿼리 `phone`, `code` — **`@/lib/sms-otp`** 의 `normalizePhone`·`verifyOtp`로 검증 후 `prisma.users.findMany({ where: { phone } })`, 응답에 **마스킹 이메일·`provider`·`createdAt`**(DB는 `created_at`, 응답 조합 시 ISO). `export const dynamic = "force-dynamic"`, `runtime = "nodejs"`.
- **페이지** `src/app/find-account/page.tsx`: `/api/auth/sms/send-code` → 인증번호 입력 → `/api/find-account`, 3분 타이머·재발송·provider 한글 라벨.

### 5. 가입/로그인 UI

- **`src/app/signup/error/page.tsx`**: `reason=phone_duplicate` 시 문구 보강, **`/find-account`**(강조) → **`/login`** → **`/contact`** 순 링크.
- **`src/app/login/page.tsx`**: OAuth 버튼 아래 **「가입한 계정을 잊으셨나요?」** → `/find-account`.

### 6. 통합 예약 페이지 — 파티룸 탭 (`src/app/booking/page.tsx`)

- **파티룸 예약** 탭 버튼: **`useIsAdult` 미사용**. `handlePartyRoomClick`에서 **`/api/members/profile`**(`cache: 'no-store'`)만 호출해 독립적으로 판단.
- **프로필 없음·실패** (`!data.success || !data.profile`): **`/login?redirect=/party-room/booking`**.
- **`birthYear` 없음**: 안내 후 **`/onboarding/profile?returnTo=/party-room/booking`**.
- **만 19세 미만**: 알림만, 이동 없음.
- **성인**: **`/party-room/booking`** 로 이동 — 탭으로 `selectedType === 'party-room'` 전환하지 않음(전용 예약 페이지로 통일).
- **제거**: 이전 **`useIsAdult`** 의존 탭 `useEffect`, **`showAdultModal` / `showProfileModal`** 및 관련 모달 UI.
- **연습실** 탭·예약 플로우: 본 절 시점 이후 **예약 확인 단계에 「예약 전 안내」(환불·확정·변경)** 가 추가됨(`src/app/booking/page.tsx`). 그 외 단계 흐름은 동일.
- *참고*: URL **`/booking?type=party-room`** 으로 들어온 경우에만 기존처럼 **같은 페이지 안의 인라인 파티룸** UI가 열림; 일반 `/booking` 사용자는 파티룸 탭 → 검증 후 **`/party-room/booking`**.
- **Git (예)**: `feat: /booking 파티룸 탭에 독립적인 성인 체크 추가` — 위 동작 반영.

### 7. 회원 프로필 API — 경로·응답 정리 (`src/app/api/members/profile/route.ts`)

- **경로**: App Router **`src/app/api/members/profile/route.ts`** → **`GET` / `POST` `/api/members/profile`** (존재 확인·단일 소스).
- **GET**: Supabase 서버 클라이언트로 세션 확인 후 `prisma.users.findUnique({ where: { id: user.id } })`.
  - **성공·행 있음**: `{ success: true, profile }` — `serializeProfile`로 **`birthYear`·`phone`·`provider` 등 camelCase**, 날짜는 ISO 문자열.
  - **행 없음**: `{ success: true, profile: null }` (200).
  - **미인증**: `{ error: "인증이 필요합니다." }` (**401**, `success` 없음) — 브라우저에서 호출 시 **쿠키**가 넘어가야 함.
- **POST**: Zod(`name`, `birthYear`, `phone`, `phoneVerified`) 검증 후 `upsert`; 응답 `{ success: true, profile }`.
- **클라이언트 연동**: `useIsAdult`, **`/booking` `handlePartyRoomClick`**, 온보딩 등이 이 GET에 의존; **성인/출생연도 판단**은 응답의 **`profile.birthYear`**(숫자 연도) 기준.

### 8. 계정 삭제 — FK·삭제 순서 (`POST /api/account/delete`, `src/app/api/account/delete/route.ts`)

- **문제**: `auth.admin.deleteUser` 시 **`user_points` 등이 `auth.users`를 참조**하면 DB 오류로 삭제 실패.
- **처리 순서** (기존 포인트 소멸·예약 취소·비식별화 후):  
  1) **`point_transactions`** 해당 `user_id` 전부 삭제  
  2) **`user_points`** 해당 행 삭제  
  3) **`payment_locks`** — `prisma.paymentLock.deleteMany({ userId })`  
  4) **`reservations`** — `user_id`를 `null`로 (비식별화된 행은 유지)  
  5) **`prisma.users.deleteMany`** — `profiles`(테이블/모델명은 스키마 기준) 및 Prisma 상 **Account/Session CASCADE**  
  6) **`member_roles`** — 이메일 기준 `DELETE` (실패는 로그만)  
  7) **`auth.admin.deleteUser`**  
- **`party_reservations`**: 스키마에 따라 `user_id`가 `auth.users`에 **ON DELETE CASCADE**이면 Auth 삭제 시 연쇄 삭제될 수 있음(운영 스키마 확인).

### 9. 카카오페이 충전 승인 (`GET` `src/app/api/charge/approve/route.ts`)

- **흐름 (현행)**: Supabase 세션(`getUser`) → **진단용** `public.users` 단건 조회 → 쿼리 `pg_token` + 쿠키(`kakao_pay_tid`, `kakao_pay_order_id`, `kakao_pay_package_id`) → **`charge_packages`** → 카카오 **`approvePayment`** → **`chargePointsDB()`** (`supabase.rpc('charge_points', …)`, 정의는 `src/lib/supabase-points.ts`) → 성공 시 **`/charge/success?points=…&bonus=…&newBalance=…`** 및 결제 쿠키 삭제.
- **`user_points` / `point_transactions`**: 라우트에서 직접 `INSERT` 하지 않고 **RPC `charge_points` 내부**에서 갱신·적재한다. (장부 규칙·`amount`/`balance_after`는 DB 함수 정의와 `AI_TRANSFER_PROMPT.md`의 `charge_points` SQL 절 참고.)
- **포인트·보너스 계산**: `chargePackage.total_points`·`bonus_points`를 반올림한 뒤, 기본 충전분과 보너스분을 분리해 RPC에 `p_points` / `p_bonus_points`로 넘긴다. `description`은 패키지명 기반 문자열.
- **진단용 `users` 프로브**: 카카오 승인·RPC 이전에 `from('users').select('*').eq('id', user.id).single()` 실행. **PostgREST로 `public.users`를 읽을 때** 나는 `permission denied` 등과 **RPC 내부** 오류를 로그 단계로 구분하기 위함. 실패 시 **`/charge/fail?error=users_probe:…`** (메시지 URL 인코딩).
- **서버 로그**: `[Charge Approve] Step 1~8` — 세션, users 프로브, 패키지, 카카오 승인, `chargePointsDB` 호출 전·응답 후.
- **`logErrorDetails`**: `chargePointsDB` **try/catch** 예외와 **바깥 catch**에서 `message` / `code` / `details` / `hint` / `stack` 출력.
- **실패 시**: RPC 실패·예외는 `/charge/fail?error=…` 로 리다이렉트; 일부 실패 경로에서는 결제 관련 쿠키를 삭제한다.

### 10. 연습실·파티룸 환불 정책 정리 (`src/lib/refund-policy.ts`, pricing/booking/mypage, 취소 API)

- **`PRACTICE_ROOM_REFUND_POLICY` + `calculatePracticeRoomRefund*`**: **달력 일수(`getDaysDifference`)** — **3일 이상 100%**, **2일 50%**, **전날·당일 0%**. 전액 환불 시 `refundAmount`는 `totalAmount` 그대로. (상세·문구·마이페이지 동기화는 아래 **§11**.)
- **`PARTY_ROOM_REFUND_POLICY` + `calculatePartyRoomRefund*`**: 동일 **달력 일수** — **7일 이상 100%**, **3~6일 50%**, **3일 미만 0%** (취소 불가; UI에는 연습실과 맞춰 **이용 전날·당일** 취소 불가 등으로 표기, 실제로는 예약일 기준 **2일 전**까지도 취소 불가 구간에 포함).
- **`canCancelReservation`**: 연습실 **예약일까지 달력 일수가 2일 미만**이면 불가; 파티룸은 **3일 미만**이면 불가. (`POST /api/reservations/cancel` 등)
- **레거시** `REFUND_POLICY.cancellationDeadlineHours: 48` — 주석상 힌트; 실제 취소·환불은 위 함수들이 기준.
- **연결 파일**: `src/app/api/reservations/cancel/route.ts`, `src/app/api/party-room/reservations/cancel/route.ts`, `src/app/pricing/page.tsx`, `src/app/booking/page.tsx`(연습실 **예약 전 안내**), `src/app/mypage/page.tsx`(취소 모달 환불 안내).
- **커밋 예**: `feat: 환불 규정 업데이트 및 연습실 예약 페이지에 정책 추가`, `fix: 연습실 환불 정책 3일 전 100% 환불 추가`.

### 11. 환불·취소 일수 = 달력 기준 + 파티룸 문구 (`getDaysDifference`, 2026-04-23)

- **`getDaysDifference`**: 예약일·기준일을 **`Asia/Seoul` 달력 연·월·일**로만 비교해 일수 차이 계산 — 브라우저(KST)와 서버(UTC, Vercel 등)에서 `setHours(0)`만 쓸 때 **‘오늘’이 하루 어긋나** 마이페이지 미리보기와 취소 API 결과가 달라지던 문제 방지.
- **`calculatePartyRoomRefund*`**: 파티룸도 **연속 시간(시간/24h)** 대신 **`getDaysDifference`와 동일한 달력 규칙**으로 7일/3일 구간 적용.
- **`canCancelReservation`**: `practice` / `party` 외 **`practice-room` · `party-room` 별칭** 허용; 메시지는 「전날·당일 취소 불가」「3일 이내 취소 불가」 등으로 통일.
- **UI**: 파티룸 `/pricing`, `/party-room/booking`, `/party-room/booking/complete` — **이용 7일 전 이상 / 3일~6일 전 / 전날·당일** 문구로 연습실 스타일 통일; `complete`는 요약 목록 + **이 예약 기준 취소 마감 시각**(전액·50% 데드라인) 병기.
- **`/mypage`**: `getCancelPolicy`(= `canCancelReservation`)로 **취소 버튼 비활성화** + 안내 문구; 모달·확인 시에도 동일 정책 재검증. 전액 환불 표시 시 `refundRate === 1`이면 `floor` 없이 전액.

### 12. 글로벌 에러·404·로거·미들웨어 (안정성, 결제/예약 코드 비터치, 커밋 `cf43f93`·2026-04-25)

- **`src/app/error.tsx`**: App Router **글로벌 에러 UI** — `reset`, 홈 링크, 개발 시 스택 `details`.
- **`src/app/not-found.tsx`**: **404** — 홈·`/booking`·`/contact` 안내.
- **`src/lib/logger.ts`**: **프로덕션 안전 로거**(`log`/`debug`는 개발만, `payment`·`info`는 프로덕션에서 메시지 위주). 기존 라우트는 미연결(필요 시 점진 도입).
- **`middleware.ts`**: 프로필 검증 **`catch`**에서 **프로덕션만** `/login` 리다이렉트, **개발**은 기존처럼 통과(경고 로그). 결제·예약 API 경로는 건드리지 않음.

---

## 📝 최근 수정 사항 (2026-04-24) — 부록: 스키마·RPC 상세

### 1. party_reservations 테이블 스키마 확장

#### 파티룸 예약 (Supabase)

**문서·신규 구축 참고용 전체 DDL** (운영 DB는 아래 `ALTER`로 누적 추가된 컬럼과 병합될 수 있음 — 대시보드·`prisma db pull`로 확인).

```sql
CREATE TABLE party_reservations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_hours NUMERIC(4,2),
  package_type TEXT,
  end_date DATE,
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  total_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'confirmed',
  is_event_price BOOLEAN DEFAULT true,
  memo TEXT,
  payment_method TEXT DEFAULT 'points',
  points_used INTEGER DEFAULT 0,
  refund_points INTEGER DEFAULT 0,
  refund_amount INTEGER DEFAULT 0,
  
  -- 카카오페이 관련 (2026-04-24 추가)
  kakaopay_order_id TEXT,
  kakaopay_tid TEXT,
  kakaopay_payment_status TEXT DEFAULT 'pending',
  kakaopay_approved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**기존 테이블에 컬럼 추가 (마이그레이션 예시):**

```sql
ALTER TABLE public.party_reservations
ADD COLUMN IF NOT EXISTS package_type TEXT,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS is_event_price BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS memo TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'points',
ADD COLUMN IF NOT EXISTS points_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_amount INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS refund_method TEXT,
ADD COLUMN IF NOT EXISTS auth_code TEXT,
ADD COLUMN IF NOT EXISTS room_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS special_requests TEXT,
ADD COLUMN IF NOT EXISTS price_type TEXT,
ADD COLUMN IF NOT EXISTS kakaopay_order_id TEXT,
ADD COLUMN IF NOT EXISTS kakaopay_tid TEXT,
ADD COLUMN IF NOT EXISTS kakaopay_payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS kakaopay_approved_at TIMESTAMPTZ;
```

**컬럼 구조 (참고):** 위 CREATE·ALTER에 나열한 필드 외, 환경에 따라 `guest_email`, `headcount`, `cancelled_at`, `payment_provider`, `payment_key`, `order_id` 등이 **병존**할 수 있음. **실제 개수·이름은 Supabase / `prisma db pull` 기준으로 확인**할 것.

---

### 2. reservations 테이블 스키마 수정

**updated_at 기본값 추가:**

```sql
ALTER TABLE public.reservations
ALTER COLUMN updated_at SET DEFAULT NOW();
```

---

### 3. use_points RPC 함수 정리

**문제:** 3개의 `use_points` 함수 시그니처가 충돌

**해결:**

```sql
-- 기존 함수 모두 삭제
DROP FUNCTION IF EXISTS public.use_points(uuid, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.use_points(uuid, integer, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.use_points(uuid, integer, text, uuid) CASCADE;

-- RETURNS TABLE 형식으로 단일 함수 생성
CREATE OR REPLACE FUNCTION public.use_points(
  p_user_id uuid,
  p_points integer,
  p_description text DEFAULT '포인트 사용',
  p_reservation_id text DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance INTEGER,
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- 현재 잔액 조회
  SELECT balance INTO v_current_balance
  FROM public.user_points
  WHERE user_id = p_user_id;
  
  IF v_current_balance IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'User points record not found'::TEXT;
    RETURN;
  END IF;
  
  IF v_current_balance < p_points THEN
    RETURN QUERY SELECT FALSE, v_current_balance, 'Insufficient points'::TEXT;
    RETURN;
  END IF;
  
  -- 포인트 차감
  UPDATE public.user_points
  SET balance = balance - p_points,
      total_used = total_used + p_points,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  -- point_transactions 기록
  INSERT INTO public.point_transactions (
    user_id, type, amount, balance_after, description, reservation_id
  ) VALUES (
    p_user_id, 'use', p_points, v_new_balance, p_description, p_reservation_id
  );
  
  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
  
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, 0, SQLERRM;
END;
$$;
```

**반환 형식 변경:**

- **이전:** OUT 파라미터 (`o_success`, `o_new_balance`)
- **이후:** RETURNS TABLE (`success`, `new_balance`, `error`)

**앱 코드 (`src/lib/supabase-points.ts`):** `deductPointsDB`는 PostgREST 응답이 **객체 또는 단일 행 배열**일 수 있어 `unwrapRpcFirstRow`로 언랩 후, **`success` / `new_balance` / `error` 우선**, 구형 OUT 필드(`o_success`, `o_new_balance`)는 호환용 폴백. `charge_points` / `refund_points`는 계속 **`o_*`** 파싱(`parseRpcRow`).

---

### 4. 트리거 비활성화 (RLS·중복 검증)

**문제:** `validate_user_exists()` 트리거가 `users` 등 접근 시 RLS와 맞물려 실패하는 사례

**해결 (운영에서 선택 적용):**

```sql
ALTER TABLE public.party_reservations 
DISABLE TRIGGER validate_party_reservation_user;

ALTER TABLE public.reservations 
DISABLE TRIGGER validate_reservation_user;
```

**참고:** 앱에서 Prisma·API로 사용자·출생연도 검증을 하는 경우 트리거와 **역할이 겹칠 수 있음**. 비활성화는 **운영 정책·감사 요구**에 맞게 결정.

---

### 5. users 테이블 RLS 정책 (확인 메모)

**기존 정책 예시 (대시보드에서 확인):**

- `service_role` 포함 여부에 따라 서버·PostgREST 동작이 달라짐
- 정책 추가 전 **이미 `authenticated` / `service_role`에 읽기·쓰기가 열려 있는지** 확인

---

### 6. API 코드 수정 (요약)

#### 6.1. deductPointsDB (`src/lib/supabase-points.ts`)

- `use_points` 응답: **`success` / `new_balance` / `error`** 처리, 실패 시 RPC `error` 문자열 우선 반환
- 디버깅: `[Deduct Points]` RPC 전후·파싱 로그

#### 6.2. 파티룸 예약 생성 (`src/app/api/party-room/reservations/create/route.ts`)

- 성인 검증: **`prisma.users`의 `birth_year`** (Supabase `users` 직접 조회 RLS 회피)
- INSERT: **`duration_hours`** = `PARTY_ROOM_PACKAGES[package_type].hours` (day 7 / night 12 / allday 21)
- INSERT 직전 `[Party Room Create]` 로그

#### 6.3. 파티룸 카카오 승인 (`src/app/api/party-room/payments/kakao/approve/route.ts`)

- `party_reservations` INSERT 시 **`duration_hours`** 동일 규칙 적용, **`kakaopay_payment_status` / `kakaopay_approved_at`** 기록
- 예약 후 **`sendMessage` + `getPartyRoomConfirmMessage` + `message_logs`** (`try/catch`, SMS 실패해도 완료 리다이렉트)

#### 6.4. 파티룸 예약 취소 (`src/app/api/party-room/reservations/cancel/route.ts`)

- **`refund_party_room_points` 제거** → **`refundPointsDB`** (`refund_points` RPC, `balance_after` 포함)
- `[Party Room Cancel]` 잔액·환불액 로그

#### 6.5. 연습실 예약 생성 (`src/app/api/reservations/create/route.ts`)

- **포인트 전용** — 카카오 직결은 **`/api/reservations/payments/kakao/*`**
- INSERT: **`payment_method: "points"`**, **`points_used`** (= `total_amount`)
- 전화·이름: **`prisma.users`** (`phone`, `name`). ~~`profiles`~~ / RLS 이슈 회피
- `guest_name`: DB `name` 우선

#### 6.6. 파티룸 예약 — 클라이언트 성인 게이트 (`src/lib/auth-client.tsx`, `src/app/party-room/booking/page.tsx`)

- **`useIsAdult()`** 반환: **`{ loading, isAdult }`** — 이메일 없는 계정도 **`session.user.id`** 로 `/api/members/profile` 조회
- 만 나이: `isAdult(new Date(birthYear, 11, 31))` (서버와 동일 취지)
- `[Party Room Booking]` 프로필·게이트 로그

---

### 7. 주요 수정 요약

**스키마 변경:**

- party_reservations: 위 ALTER 컬럼들 + **`duration_hours` NOT NULL** 대응(앱에서 반드시 설정)
- reservations: `updated_at` 기본값; 운영에서 **`payment_method`**, **`points_used`**, **`kakaopay_*`**, **`duration_hours`**, **`cancelled_at`** 등 직접결제·취소와 맞춰 둘 것

**RPC 함수:**

- use_points: OUT → **RETURNS TABLE** (`success`, `new_balance`, `error`)
- `refund_points`: 환불 시 **`balance_after`** 포함 여부 운영 DB에서 유지

**트리거:**

- (선택) `validate_party_reservation_user`, `validate_reservation_user` 비활성화

**API 코드:**

- 파티룸/연습실: 민감 조회 **Prisma `users`**
- `deductPointsDB`: RETURNS TABLE + 언랩 + 로깅
- 파티룸 취소: `refundPointsDB`

**결과 (목표):**

- 파티룸 예약 생성/취소, 연습실 예약 생성, SMS 발송 플로우 안정화

---

### 8. 기타 (문서·상수, 2026-04-24 전후 반영)

- **대표 문의 전화:** `STUDIO_PHONE` = **`010-2994-0323`** (`src/lib/constants.ts`, 푸터·문의·`party-room/booking/complete` 입실 안내 등)
- **충전 승인:** `src/app/api/charge/approve/route.ts` — `[Charge Approve] Step`·`users` 프로브·`logErrorDetails` (진단용, 원인 확인 후 제거 검토)

---

**작성일**: 2026-05-03  
**버전**: 2.51 (최신)  
**프로젝트**: A1 STUDIO (https://a1-studio.vercel.app)

---

## 🚀 빠른 시작 (다른 AI에게 전달 시)

```
# 1. 이 문서 전체를 복사
# 2. GPT/Claude에게 다음 프롬프트와 함께 전달:

"""
아래는 A1 STUDIO 웹사이트의 완전한 기술 문서입니다.
코드베이스의 모든 구조, 기능, 데이터베이스 스키마, 비즈니스 로직이 포함되어 있습니다.

이 컨텍스트를 기반으로 다음 작업을 수행해주세요:
[여기에 구체적인 요청 사항 작성]

[AI_TRANSFER_PROMPT.md 전체 내용]
"""
```

---

**문의**: shinji9112@gmail.com  
**GitHub**: (프로젝트 저장소 URL)  
**배포 URL**: https://a1-studio.vercel.app (예시)

---

## 📝 최근 수정 사항 (2026-04-25)

### 1. Prisma/Supabase 시스템 최적화 완료

#### 목표
- Prisma Migrate 사용을 위한 FK 제거
- 데이터 무결성은 3중 안전망으로 보장
- Supabase와 Prisma 역할 명확히 분리

---

#### Phase 1: 데이터베이스 트리거 생성 (1층 안전망)

**Supabase SQL Editor 실행:**

```sql
-- 사용자 검증 트리거 함수
CREATE OR REPLACE FUNCTION public.validate_user_exists()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
      RAISE EXCEPTION 'Invalid user_id: User % does not exist in auth.users', NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4개 테이블에 트리거 적용
CREATE TRIGGER validate_reservation_user
  BEFORE INSERT OR UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION validate_user_exists();

CREATE TRIGGER validate_party_reservation_user
  BEFORE INSERT OR UPDATE ON party_reservations
  FOR EACH ROW EXECUTE FUNCTION validate_user_exists();

CREATE TRIGGER validate_class_application_user
  BEFORE INSERT OR UPDATE ON one_day_class_applications
  FOR EACH ROW EXECUTE FUNCTION validate_user_exists();

CREATE TRIGGER validate_user_points_user
  BEFORE INSERT OR UPDATE ON user_points
  FOR EACH ROW EXECUTE FUNCTION validate_user_exists();
```

---

#### Phase 2: 애플리케이션 검증 헬퍼 (2층 안전망)

**파일 생성:** `src/lib/user-validation.ts`

```typescript
import { prisma } from './db';

/**
 * 사용자 존재 여부 검증 (2층 안전망)
 */
export async function validateUserExists(
  userId: string | null | undefined
): Promise<boolean> {
  if (!userId) return true; // null/undefined 허용 (비회원)
  
  try {
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return !!user;
  } catch (error) {
    console.error('[validateUserExists] Error:', error);
    return false;
  }
}

export const USER_NOT_FOUND_ERROR = {
  error: '존재하지 않는 사용자입니다',
  code: 'USER_NOT_FOUND',
} as const;
```

**적용된 API:**
- `src/app/api/reservations/create/route.ts`
- `src/app/api/party-room/reservations/create/route.ts`
- `src/app/api/one-day-class/route.ts`

각 API에서 핵심 로직(포인트 차감, 결제, DB 저장) 직전에 `validateUserExists()` 호출.

---

#### Phase 3: FK 제거 (3층 안전망)

**Supabase SQL Editor 실행:**

```sql
-- auth.users FK 제거 (4개)
ALTER TABLE party_reservations DROP CONSTRAINT IF EXISTS party_reservations_user_id_fkey;
ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_user_id_fkey;
ALTER TABLE one_day_class_applications DROP CONSTRAINT IF EXISTS one_day_class_applications_user_id_fkey;
ALTER TABLE user_points DROP CONSTRAINT IF EXISTS user_points_user_id_fkey;
```

---

#### Phase 4: Prisma DB Pull & 모델명 변경

**로컬 터미널:**

```bash
npx prisma db pull
npx prisma generate
```

**변경 사항:**
- 모델명: `User` → `users` (소문자)
- 필드명: camelCase → snake_case
  - `updatedAt` → `updated_at`
  - `birthYear` → `birth_year`
  - `phoneVerified` → `phone_verified`
  - `avatarUrl` → `avatar_url`

**수정된 파일 (8개):**
- `src/app/api/account/delete/route.ts`
- `src/app/api/find-account/route.ts`
- `src/app/auth/callback/route.ts`
- `src/app/api/members/profile/route.ts`
- `src/app/api/members/sync/route.ts`
- `src/app/api/admin/members/route.ts`
- `src/lib/member-role-db.ts`
- 모든 `prisma.user` → `prisma.users` 일괄 변경

---

#### Phase 5: Prisma Migrate 베이스라인

**로컬 터미널:**

```bash
# 베이스라인 마이그레이션 폴더 생성
mkdir -p prisma/migrations/20260425000000_init

# 빈 migration.sql 파일 생성 (Windows CMD)
echo -- Baseline migration > prisma/migrations/20260425000000_init/migration.sql
echo -- Database already contains all tables >> prisma/migrations/20260425000000_init/migration.sql
echo -- This migration marks the current state as the starting point >> prisma/migrations/20260425000000_init/migration.sql

# 마이그레이션을 "적용됨"으로 표시
npx prisma migrate resolve --applied 20260425000000_init

# 상태 확인
npx prisma migrate status
# 결과: Database schema is up to date!
```

---

### 2. Supabase Auth 사용자 삭제 자동화

#### 목표
Supabase Authentication에서 사용자를 삭제하면 관련된 모든 데이터를 자동으로 삭제

**Supabase SQL Editor 실행:**

```sql
-- ================================================================
-- auth.users 삭제 시 관련 데이터 자동 삭제
-- ================================================================

-- 1. 삭제 로그 테이블 생성
CREATE TABLE IF NOT EXISTS public.auth_deletion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_user_id uuid NOT NULL,
  deleted_email text,
  deleted_at timestamptz DEFAULT NOW(),
  related_data_count jsonb
);

-- 2. 트리거 함수 생성
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- 삭제 전 로그 기록
  INSERT INTO public.auth_deletion_logs (
    deleted_user_id,
    deleted_email,
    related_data_count
  ) VALUES (
    OLD.id,
    OLD.email,
    jsonb_build_object(
      'users', (SELECT COUNT(*) FROM public.users WHERE id = OLD.id),
      'user_points', (SELECT COUNT(*) FROM public.user_points WHERE user_id = OLD.id),
      'reservations', (SELECT COUNT(*) FROM public.reservations WHERE user_id = OLD.id),
      'party_reservations', (SELECT COUNT(*) FROM public.party_reservations WHERE user_id = OLD.id),
      'one_day_class_applications', (SELECT COUNT(*) FROM public.one_day_class_applications WHERE user_id = OLD.id),
      'message_logs', (SELECT COUNT(*) FROM public.message_logs WHERE user_id = OLD.id),
      'payment_locks', (SELECT COUNT(*) FROM public.payment_locks WHERE user_id = OLD.id),
      'accounts', (SELECT COUNT(*) FROM public.accounts WHERE user_id = OLD.id),
      'sessions', (SELECT COUNT(*) FROM public.sessions WHERE user_id = OLD.id)
    )
  );
  
  -- 후기 익명화 (삭제 전에 먼저 처리)
  UPDATE public.reviews 
  SET nickname = '탈퇴한 사용자'
  WHERE reservation_id IN (
    SELECT id FROM public.reservations WHERE user_id = OLD.id
  );
  
  -- 실제 데이터 삭제
  DELETE FROM public.users WHERE id = OLD.id;
  DELETE FROM public.user_points WHERE user_id = OLD.id;
  DELETE FROM public.point_transactions WHERE user_id = OLD.id;
  DELETE FROM public.reservations WHERE user_id = OLD.id;
  DELETE FROM public.party_reservations WHERE user_id = OLD.id;
  DELETE FROM public.one_day_class_applications WHERE user_id = OLD.id;
  DELETE FROM public.message_logs WHERE user_id = OLD.id;
  DELETE FROM public.payment_locks WHERE user_id = OLD.id;
  DELETE FROM public.accounts WHERE user_id = OLD.id;
  DELETE FROM public.sessions WHERE user_id = OLD.id;
  
  RAISE NOTICE 'Deleted all data for user % (email: %)', OLD.id, OLD.email;
  
  RETURN OLD;
END;
$function$;

-- 함수 소유자를 postgres로 변경
ALTER FUNCTION public.handle_user_delete() OWNER TO postgres;

-- 3. 트리거 생성 (기존 on_auth_user_deleted 트리거가 있으면 재활용)
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_delete();
```

**삭제 범위:**
- ✅ users, user_points, point_transactions
- ✅ reservations, party_reservations (user_id 있는 것만)
- ✅ one_day_class_applications, message_logs
- ✅ payment_locks, accounts, sessions
- ❌ payments, refunds (결제 이력 보존)
- 🔄 reviews (익명화: `nickname = '탈퇴한 사용자'`)

**사용 방법:**
1. Supabase Dashboard → Authentication → Users
2. 삭제할 사용자 선택 → Delete
3. 확인 → 모든 관련 데이터 자동 삭제됨

**로그 확인:**
```sql
SELECT * FROM public.auth_deletion_logs ORDER BY deleted_at DESC LIMIT 10;
```

---

### 3. RLS (Row Level Security) 비활성화

#### 배경
포인트 충전 시 "permission denied for table users" 에러 발생.
RPC 함수 내부에서 테이블 접근 시 RLS 정책이 막음.

**Supabase SQL Editor 실행:**

```sql
-- 주요 테이블 RLS 비활성화 (임시)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.party_reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.one_day_class_applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_locks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews DISABLE ROW LEVEL SECURITY;
```

**참고:** 향후 프로덕션 배포 전에 적절한 RLS 정책을 다시 설정해야 함.

**앱 측 진단 (중복 아님):** `src/app/api/charge/approve/route.ts`에서 위 RLS/권한 이슈를 추적하기 위해 **`public.users` 단건 조회(프로브)** 와 **`[Charge Approve] Step 1~8`**, **`logErrorDetails`** 를 두었다. 터미널에서 Step 3에서 막히면 PostgREST·테이블 권한·테이블명 불일치 쪽, Step 7~8에서 막히면 **`charge_points` RPC·DB** 쪽을 우선 본다.

---

### 4. Supabase RPC 함수 권한 설정

#### charge_points() 함수

**Supabase SQL Editor 실행:**

```sql
CREATE OR REPLACE FUNCTION public.charge_points(
  p_user_id uuid,
  p_points integer,
  p_bonus_points integer DEFAULT 0,
  p_description text DEFAULT '포인트 충전',
  OUT o_success boolean,
  OUT o_new_balance integer
)
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ 핵심: postgres 권한으로 실행
SET search_path = public
AS $$
DECLARE
  v_total_points integer;
BEGIN
  v_total_points := p_points + p_bonus_points;
  
  INSERT INTO public.user_points (user_id, balance, total_charged, total_used)
  VALUES (p_user_id, v_total_points, p_points, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    balance = user_points.balance + v_total_points,
    total_charged = user_points.total_charged + p_points,
    updated_at = NOW()
  RETURNING balance INTO o_new_balance;
  
  INSERT INTO public.point_transactions (user_id, type, amount, balance_after, description)
  VALUES (p_user_id, 'charge', p_points, o_new_balance, p_description);
  
  IF p_bonus_points > 0 THEN
    INSERT INTO public.point_transactions (user_id, type, amount, balance_after, description)
    VALUES (p_user_id, 'bonus', p_bonus_points, o_new_balance, 'Bonus: ' || p_bonus_points || 'P');
  END IF;
  
  o_success := TRUE;
  
EXCEPTION WHEN OTHERS THEN
  o_success := FALSE;
  o_new_balance := 0;
  RAISE NOTICE 'charge_points error: %', SQLERRM;
END;
$$;

ALTER FUNCTION public.charge_points(uuid, integer, integer, text) OWNER TO postgres;
```

**사용처:** `src/lib/supabase-points.ts` → `chargePointsDB()`

**앱 호출 파라미터 (코드 기준):** `p_user_id`, `p_points`, `p_bonus_points`, `p_description` — 그 외 RPC 인자 없음.

---

### 5. 최종 시스템 아키텍처

#### Supabase 전담
- **인증:** auth.users (Supabase Auth)
- **포인트:** user_points, point_transactions (RPC 함수)
- **후기:** reviews (Storage 연동)
- **홀드:** reservation_holds (TTL)
- **로그:** message_logs, auth_deletion_logs

#### Prisma 전담
- **예약:** reservations, party_reservations
- **결제:** payments, refunds
- **원데이클래스:** one_day_classes, one_day_class_applications
- **공지:** notices, events
- **사용자 프로필:** users (auth.users 확장)

#### 3중 안전망

```
예약 플로우:
1. validateUserExists() - 애플리케이션 검증 (2층)
2. validate_user_exists() - DB 트리거 (1층)
3. deductPointsDB() - Supabase RPC (Atomic)
4. prisma.reservations.create() - Prisma (타입 안전)
```

---

### 6. 충전 승인 라우트 — 진단 로그 요약 (코드 변경)

- **파일:** `src/app/api/charge/approve/route.ts`
- **`logErrorDetails(prefix, error)`**: Supabase/일반 객체형 에러의 `message`·`code`·`details`·`hint`·`stack` 통합 로깅.
- **Step 1~2:** `supabase.auth.getUser()` — 실패·무사용자 시 `/login?error=unauthorized`.
- **Step 3~4:** `public.users` 프로브 — 실패 시 `users_probe:` 포함 fail URL.
- **Step 5:** `charge_packages` 조회.
- **Step 6:** `approvePayment` (카카오).
- **Step 7~8:** `chargePointsDB` 호출·결과 로그; 예외는 `logErrorDetails` 후 fail 리다이렉트.
- **운영 참고:** 원인 파악 후 **프로브(Step 3~4) 제거** 여부를 검토할 수 있다(매 충전마다 `users` 읽기·실패 시 조기 종료).

---

## 📝 최근 수정 사항 (2026-04-26)

### 0. 문서 정리 (2026-04-24 요약 블록)

- **「최근 수정 사항 (2026-04-21)」 직후**에 **환불 정책 시스템 완성** 요약(타임존·정책 문구·SMS 테스트·party_reservations·마이페이지·Prisma) 추가.
- 기존 긴 **2026-04-24** 기술 절 제목을 **`(2026-04-24) — 부록: 스키마·RPC 상세`** 로 구분(동일 날짜 중복 `##` 방지).
- **부록 §1**에 **`party_reservations` Supabase 전체 `CREATE TABLE` 예시** 및 **`kakaopay_*` 컬럼 `ALTER` 보강** 반영.

### 1. 환불·취소 일수(서울) 및 마이페이지 동기화

- **`src/lib/refund-policy.ts` — `getDaysDifference`**: `Intl.DateTimeFormat` + **`Asia/Seoul`** 연·월·일만 추출해 일수 차이 계산. 브라우저(KST)와 서버(UTC/Vercel) 간 **‘오늘’ 날짜 어긋남**으로 마이페이지 미리보기와 취소 API 결과가 달라지던 문제 방지.
- **마이페이지** (`src/app/mypage/page.tsx`): 취소 확인 모달에서 `calculatePracticeRoomRefund` / `calculatePartyRoomRefund` 사용(회원 취소 API와 동일한 금액·사유). `canCancelReservation`으로 취소 버튼 비활성화·안내.

### 2. 관리자 예약 취소 API·포인트 환불(service role)

- **`POST /api/admin/reservations/cancel`** (`src/app/api/admin/reservations/cancel/route.ts`): 헤더 **`x-admin-password`** = `ADMIN_PASSWORD` (후기 관리 API와 동일 패턴; **Supabase 로그인 세션 불필요**).
- Prisma **`Reservation`** 조회 → 상태 **`PAID` / `CONFIRMED`** 만 처리 → 회원 취소와 동일하게 `canCancelReservation` + `calculatePracticeRoomRefund` 또는 `calculatePartyRoomRefund` → **`refund_points` RPC**는 **`src/lib/supabase-points.ts`의 `refundPointsDBServiceRole`** 로 호출(**`SUPABASE_SERVICE_ROLE_KEY` 필수**).
- 취소 후 `status: CANCELLED`. 파티룸 **낮 패키지**면 **`blocked_slots`**(17:00~19:00, `party-room`) `deleteMany`.
- 환불액이 0보다 큰데 **`user_id`가 없으면 400**(수동 처리 유도).
- **`getPointBalanceServiceRole`**: 응답용 잔액 조회.

### 3. 관리자 UI (`src/app/admin/page.tsx`)

- 예약 관리 탭 **⊗(취소)** 버튼 → 위 API 호출, `confirm` 후 목록 새로고침.
- **`CONFIRMED`** 상태·필터 추가, `normalizeStatus`로 표시/필터 통일.

### 4. 파티룸 환불 안내 문구(연습실 스타일)

- **`/pricing`**, **`/party-room/booking`**, **`/party-room/booking/complete`**: 이용 **7일 전 이상** 전액, **3~6일 전** 50%, **전날·당일** 취소 불가. 완료 페이지는 **요약 목록 + 이 예약 기준 취소 마감 시각**(전액·50% 데드라인) 병기.
- **`AI_TRANSFER_PROMPT.md` §6**: 동일 내용 반영, 실제 코드는 **달력 3일 미만** 취소 불가이므로 **이용 2일 전**도 구간에 포함됨을 명시.

### 5. Git 커밋 참고(예)

- `fix: 환불 계산 날짜 로직 수정 + 파티룸 취소 정책 명확화`
- `fix: 마이페이지 환불 금액 미리보기 서버 로직과 동기화`
- `fix: 관리자 예약 취소 기능 수정`
- `docs: 파티룸 환불 정책 문구 명확화 (이용 전날/당일 추가)`

---

## 📝 최근 수정 사항 (2026-04-27)

### 1. 연습실 카카오페이 직접 결제

- **`src/lib/kakaopay.ts`**: `readyPracticeRoomPayment` — `KAKAOPAY_CID`, 승인/취소/실패 URL을 `/api/reservations/payments/kakao/*` 로 고정.
- **`POST /api/reservations/payments/kakao/ready`**: 금액 **서버 재계산**(`getPriceType`, `calcPoints`), 시간대 중복 검사, **만료 락 정리·활성 락 409 + `retryAfter`**, `acquirePaymentLock(userId, "practice-room", partner_order_id, 600)`, 예외 시 `releasePaymentLock`. 쿠키 `practice_*` (httpOnly·production 시 secure). *(세부는 **「최근 수정 사항 (2026-04-28)」**.)*
- **`GET .../approve`**: `approvePayment` → `reservations` INSERT (`payment_method: kakaopay`, `kakaopay_*`, `duration_hours`, `points_used: 0`, `reservation_type: room`, `room_id: a1-room`) → **`sendMessage` + `getPracticeRoomConfirmMessage` + `logMessage`** → 락 해제·쿠키 삭제 → **`/booking/complete?method=kakaopay`**.
- **`GET .../fail`**, **`GET .../cancel`**: **`releasePaymentLock` + 쿠키 삭제** 후 각각 `/booking?failed=true`, `/booking?cancelled=true`.
- **`src/app/booking/page.tsx`**: 연습실만 **포인트 / 카카오페이** 선택 UI, 모바일은 `next_redirect_mobile_url` 우선.
- **`src/app/booking/complete/page.tsx`**: `method=kakaopay` 시 카카오페이·원 표시.
- **`POST /api/reservations/create`**: 주석 명시(포인트 전용), INSERT에 **`payment_method: "points"`**, **`points_used`**.
- **`POST /api/reservations/cancel`**: `payment_method === "kakaopay"` 이면 **포인트 환불 없음**, `cancelled_at`·`kakaopay_refund_pending` 응답 — **카드 환불은 `cancelPayment` 연동 또는 수동** (운영 DB에 `payment_method`, `kakaopay_*`, `cancelled_at` 등 컬럼 필요).

### 2. 파티룸 카카오페이 승인 후 SMS

- **`src/app/api/party-room/payments/kakao/approve/route.ts`**: 예약 INSERT 후 **`sendMessage` + `getPartyRoomConfirmMessage` + `message_logs`** (`try/catch`, SMS 실패 시에도 리다이렉트 유지). INSERT에 `kakaopay_payment_status`, `kakaopay_approved_at` 보강.

### 3. SMS 테스트 모드

- **`src/lib/sms.ts` — `sendSMS`**: `SMS_PROVIDER === "test"` 이면 실제 발송 없이 로그 후 `success: true` (`messageId: sms-test-mode`).

### 4. Git 커밋 참고(예)

- `fix: 파티룸 카카오페이 결제 후 SMS 발송 추가`
- `feat: 연습실 예약에 카카오페이 결제 추가`

---

## 📝 최근 수정 사항 (2026-04-28)

### 1. PaymentLock — 카카오 실패/취소 시 즉시 해제·재시도 UX

- **`src/lib/payment-lock.ts`**: `deleteExpiredPaymentLocksForUser`, `getActivePaymentLocksForUser` 추가.
- **연습실** `GET /api/reservations/payments/kakao/fail`, **`.../cancel`**: 로그인 사용자 + `practice_kakao_order_id` 쿠키로 **`releasePaymentLock(userId, "practice-room", partner_order_id)`**, 관련 쿠키 삭제 후 리다이렉트.
- **연습실** `POST .../kakao/ready`: ready 직전 **만료 락 정리**; **활성 `practice-room` 락**이 있으면 **409** + **`retryAfter`(초)**; `acquirePaymentLock` 실패 시에도 가능하면 동일 409 또는 **500**.
- **파티룸** `POST .../kakao/ready`: **`acquirePaymentLock(..., "party-room", orderId, 600)`** 도입(기존에는 락 없음). 만료 정리·활성 락 409·예외 시 `releasePaymentLock` 동일 패턴.
- **파티룸** `GET .../approve`: 성공 후 **`releasePaymentLock`**; **catch**에서 쿠키 `party_order_id`로 락 해제 시도.
- **파티룸** `GET .../fail`, **`.../cancel`**: `party_order_id`로 **`releasePaymentLock`** 후 기존 파티 쿠키 전부 삭제.
- **클라이언트** `src/app/booking/page.tsx`, `src/app/party-room/booking/page.tsx`: **409** 이고 **`retryAfter`** 가 있으면 분 단위 안내(진행 중 결제).

### 2. Git 커밋 참고

- `fix: PaymentLock 자동 삭제 및 만료 락 정리 구현`

---

## 📝 최근 수정 사항 (2026-05-01)

### 자유게시판(`board_posts`) 기능 제거

- **삭제**: `src/lib/board-db.ts`, `src/app/board/**`(목록·상세·글쓰기), `POST /api/board`(`src/app/api/board/route.ts`), `src/components/board/BoardWriteForm.tsx`.
- **`src/lib/constants.ts`**: 게시판 메뉴에서 **자유게시판** 항목 제거, 부모 **`href`** 를 `/notices` 로 변경.
- **Prisma/schema·마이그레이션 미변경** — DB에 `board_posts` 테이블이 남아 있어도 앱은 참조하지 않음.
- *(역사)* `## 📝 최근 수정 사항 (2026-04-22)` **§3** 을 **폐기·역사** 로 재표기함(중복 서술 정리).
- *(갱신)* 이후 **`src/app/api/board/**`** 에 Prisma `BoardPost` · `BoardComment` · `BoardLike` 기반 API가 **재구축**됨 — 아래 **「자유게시판 API」** 절. **`BoardCategory` 모델은 제거**되고 **`BoardPost.categoryText`** 자유 텍스트 + 집계 기반 정식 카테고리로 전환(아래 **「자유게시판 카테고리 `categoryText`」**).

### AI_TRANSFER_PROMPT 최신화 (문서만, v2.40)

- **2026-04-22 §3**: 활성 기능처럼 읽히지 않도록 **현행 vs 당시(역사)** 를 분리했다.
- **코드 정합**(앱 레이어): **`src/`** 에 레거시 Raw **`board_posts`** 접근 문자열 없음 유지 목표.(**`prisma/schema.prisma`** 의 `BoardPost @@map("board_posts")` 는 별개 — 문자열 검색에 잡힐 수 있음.)
- **`NAV_LINKS` 점검**: 게시판에 **`/board`·「자유게시판」** 이 남아 있으면 라우트가 없어 **깨진 링크**가 된다. 위 삭제와 맞추려면 **`src/lib/constants.ts`** 에서 부모 `href` 를 `/notices` 로 두고 자유게시판 항목을 제거할 것 **(워크트리별로 확인)**.

### Vercel 빌드 — Prisma Client 생성 명시 (`vercel.json`)

- **루트 `vercel.json`** (추가): `buildCommand` = `prisma generate && npm run build`, `installCommand` = `npm install`, `framework` = `nextjs`, **`$schema`**: `openapi.vercel.sh` (배포 시 대시보드와 무관하게 generate→빌드 순서 고정).
- **`package.json`**: `scripts.build` 및 `postinstall` 에 이미 `prisma generate` 포함 **(변경 없을 수 있음)** — Vercel 루트 스크립트와 이중 실행은 허용 오버헤드 목적 허용.
- **`.vercelignore`**: 없거나 `prisma/` 제외 패턴 없음 유지 (**스키마는 배포에 필요**).

### Prisma 자유게시판 모델 (`prisma/schema.prisma`)

- **`BoardCategory` 삭제**(테이블 `board_categories` 스키마에서 제외).
- **`BoardPost`**: `categoryText`(→ `category_text`, 선택 문자열)·`comments`/`likes` 관계.`@@map("board_posts")` · `@@index([categoryText])` 등.
- **`BoardComment`**, **`BoardLike`**: 변경 없음(게시글에 종속).
- **운영 DB**: DDL/마이그레이션은 별도.(`category_id` 등 레거시 컬럼이 있으면 앱 로직과 **대조 필요** — 마이그레이션 금지 시나리오도 있음.)

### 자유게시판 카테고리 `categoryText` (임계치 10건)

- 글 작성 시 **20자 이하 자유 입력**(선택). 동일 문자열이 **숨김 제외 게시글**에 **10건 이상**이면 **`GET /api/board/categories`** 에 `{ name, count, isOfficial: true }` 로 노출(집계: `groupBy categoryText`).
- 목록 필터 **`GET /api/board?category=`** 는 **완전 일치** `categoryText` 쿼리.
- 간단 금칙어(`욕설`/`비속어`/`광고` 포함 문자열 차단 등)는 **`POST /api/board/create`** 에서 처리.

### 자유게시판 API (Prisma·Supabase 세션)

- **`GET /api/board/categories`** — 정식 카테고리만(임계치 이상), `threshold` 응답 포함. (**`POST` 없음**.)
- **`GET /api/board`** — 쿼리 **`category`**(텍스트), `page`, `limit`(최대 100), 숨김 제외·미리보기.
- **`POST /api/board/create`** — `categoryText`(선택, 검증 포함).
- **`GET/DELETE /api/board/[id]`** — 상세에 `categoryText`, 조회수 +1·댓글 트리, 삭제는 작성자.
- **`POST /api/board/[id]/comments`**, **`POST /api/board/[id]/like`** — 기존과 동일.
- 공통: `export const dynamic = "force-dynamic"` · `@/lib/db` 등.

### 자유게시판 UI (클라이언트 페이지)

- **`/board`** : 정식 카테고리 칩 + 검색(입력 문자열을 `?category=` 로 이동). `/api/board/categories`, `/api/board`.
- **`/board/write`** : **카테고리 텍스트** 단일 입력(드롭다운 없음).
- **`/board/[id]`** : `categoryText` 뱃지.
- **`/board/guide`** : 이용 안내(공지 `/notices` 링크). `motion` 미사용·정적 카드 레이아웃.

### 관리자 게시판 (`/admin/board`) — 목록 조회·복수 선택 삭제

- **`src/app/api/admin/board/route.ts`**: Supabase 세션 필요(비로그인 **401**) · 헤더 **`x-admin-password`** = 서버 **`ADMIN_PASSWORD`**(다른 관리자 게시판/후기 API와 동일) · **`GET`** 페이지네이션(`page`,`limit`, 응답 `pagination.total` 등) · **`DELETE`** JSON `{ postIds }` 후 `deleteMany`(댓글·좋아요는 Prisma 스키마 `onDelete` 전제로 연쇄 삭제).
- **`src/app/admin/board/page.tsx`**: 관리 세션 기반 로드 · 체크박스 일괄 삭제 확인 후 API 호출.
- **`src/app/admin/page.tsx`**: 탭 **「게시판 관리」** 추가, `/admin/board` 이동 링크.

### 결제 락 `lock_type` 통일 + 결제 에러 `reason` (`payment-errors.ts`, 2026-05-01)

- **`payment_locks.lock_type`**: 연습실·파티룸 카카오 ready/approve/cancel/fail 및 파티룸 포인트 생성의 `acquirePaymentLock` / `releasePaymentLock` / `deleteExpiredPaymentLocksForUser` / `getActivePaymentLocksForUser` 인자를 **`"reservation"`** 단일 값으로 통일(기존 `"practice-room"` / `"party-room"` 제거). **`reservation_type`·`room_id`·URL 경로·UI 라벨은 변경 없음**. 포인트 충전 락 `"charge"` 유지.
- **`src/lib/payment-errors.ts`**: `PaymentErrorReason` · `getPaymentErrorMessage` · `classifyKakaoPayError` · (루트 catch용) **`reasonFromCaughtKakaoError`**.
- **JSON 에러 응답**: `GET/POST`가 `NextResponse.json`으로 실패를 주는 예약·충전 ready/승인 일부·포인트 예약 생성 라우트에 **`reason`** 필드 추가, `error`는 매핑 메시지 또는 기존 문구 유지. **`/api/charge/approve`**, **`…/kakao/cancel`**, **`…/kakao/fail`** 은 리다이렉트 전용이라 본 패턴 미적용.

### `POST /api/members/profile` — 전화번호 중복 검사 (`src/app/api/members/profile/route.ts`)

- **`upsert` 전**: 요청 **`phone`** 이 있고 기존 사용자 `phone` 과 다를 때, 본인 `id` 제외하고 동일 번호 행이 있으면 **409** · `success: false` · `errorCode: "PHONE_ALREADY_EXISTS"` · `"이미 다른 계정에서 사용 중인 전화번호입니다."` (DB **`users.phone` @unique** 와 일치하는 애플리케이션 검증.)
- **온보딩 클라이언트** (`src/app/onboarding/phone/page.tsx`): SMS 검증 후 프로필 `POST` 응답이 위 **409** 이고 `PHONE_ALREADY_EXISTS` 이면 `error` 배너로 `"이 전화번호는 이미 다른 계정에서 사용 중입니다."`, 그 외는 `error` 문자열 또는 기본 실패 메시지 · 성공 시 `router.push("/")`.

### `AI_TRANSFER_BRIEF.md` (요약 레이어, 2026-05-01)

- 긴 본 문서 대신 다른 AI에게 **프로젝트 범위·스택·도메인·경로표**만 빠르게 넘길 때 사용. 상세·역사·운영 노트는 **본 문서 유지**.
- 소개 블록(상단 blockquote 옆)·`## 📂 파일 구조` 목록에 **상호 참조** 추가.

---

## 📝 최근 수정 사항 (2026-05-03)

### 1. 전달 문서 동기화

- **`AI_TRANSFER_PROMPT.md`**: 상단 HTML 메타·중간 고정 메타(`**작성일**` / `**버전**`)·본 절(2026-05-03) 반영.
- **`AI_TRANSFER_BRIEF.md`**: 요약 레이어 버전·동기 날짜 갱신, 결제 `reason`·배포 문서 예시 정합 요약 추가.

### 2. 결제 에러 `reason` + `payment-errors.ts`

- **`src/lib/payment-errors.ts`**: `PaymentErrorReason`, `getPaymentErrorMessage`, `classifyKakaoPayError`, `reasonFromCaughtKakaoError` — 실패 JSON에 **`error`(한글)** 와 **`reason`(머신 코드)** 병행(클라이언트·로그 분류용).
- **연습실·파티룸 카카오** `POST …/kakao/ready`, `GET …/kakao/approve`(일부): 인증·검증·슬롯 충돌·락·카카오 예외 등에 매핑; **`retryAfter`** 등 기존 필드 유지.
- **`POST /api/charge/ready`**: 동일 패턴; `catch`에서 카카오 메시지 휴리스틱 시 `reasonFromCaughtKakaoError`.
- **`POST /api/reservations/create`**, **`POST /api/party-room/reservations/create`**: 주요 JSON 오류에 `reason` 추가; 파티룸 포인트 예약의 `acquirePaymentLock` 두 번째 인자를 **`"reservation"`** 으로 통일(카카오·연습실 예약과 **`payment_locks.lock_type`** 정합). 도메인 **`reservation_type`**, URL, UI 라벨은 변경 없음.

### 3. 온보딩·프로필

- **`POST /api/members/profile`** 전화 중복 **409** (`PHONE_ALREADY_EXISTS`) · **`src/app/onboarding/phone/page.tsx`** 에러 표시 — 2026-05-01 절과 동일 취지, 워크트리에서 UI·흐름 정리.

### 4. 배포·로컬 접근 문서

- **`MOBILE_ACCESS.md`**, **`VERCEL_DEPLOY.md`**: 예시 환경변수 블록에서 **`GOOGLE_CLIENT_SECRET`**, **`BETTER_AUTH_SECRET`** 행 제거(실제 스택·Supabase OAuth 설정과 예시 정합).

---

## 📝 최근 수정 사항 (2026-04-29)

> **역사 기록:** 이 절은 당시 문서 대규모 구조 갱신 배치를 남긴 것이다. **현재 문서 버전·최종 수정일**은 파일 **상단 HTML 주석**과 **아래 고정 메타**(`**작성일**` / `**버전**`)를 본다. 이후 **`cf43f93`**(글로벌 error/not-found·logger·middleware) 등은 **`## 🔧 최근 주요 변경사항`** 및 **`## 📝 최근 수정 사항 (2026-04-25)`** 참고.

### 1. 문서 구조 갱신

- 상단 **HTML 메타 주석**(버전·최종 수정일·작성자).
- **`## 🔧 최근 주요 변경사항`**: PaymentLock 정리(`b83db1b`), 예약 실패 자동 환불(`d0aa9ae`) — 문제/해결/영향 요약.
- **`## 🔍 안정성 검토 (2026-04-25)`**, **`## 🧪 중요 테스트 시나리오`** 추가.
- **`## 📂 파일 구조`** 하위에 **`### 결제 및 예약 안정성 (주요 파일)`** 보강.

### 2. Git 커밋 참고

- `docs: AI_TRANSFER PaymentLock·환불·안정성·테스트 반영 (v2.29)` (당시 문서 전용 커밋; 이후 버전은 상단 메타 기준)

---

## 📝 최근 수정 사항 (2026-04-25)

### 1. AI_TRANSFER_PROMPT.md 최신화 (문서만, 당시 기록)

- 상단·하단 메타는 이후 **v2.31 → v2.33 → v2.34**로 누적 갱신됨(현재 **v2.34** / **최종 수정 2026-04-25**). 아래 `cf43f93` 반영·안정성 절은 **당시** 문서 작업을 보존한 것.
- **`## 🔧 최근 주요 변경사항`**에 **`cf43f93`** 요약 절 추가(글로벌 error/not-found, `logger`, middleware 프로덕션 `/login`).
- **`## 📂 파일 구조` → `### 결제 및 예약 안정성`**: 앱 공통 안정성 경로 보강.
- **`## 🎯 현재 상태 요약`**: 글로벌 에러·404·미들웨어 동작 한 줄 반영.
- **`## 📝 최근 수정 사항 (2026-04-23)` §12**: 커밋·일자 명시.
- 말미 **`## 📝 최근 수정 사항 (2026-04-29)`**: 역사 기록 안내(blockquote).

### 2. Git 커밋 참고 (코드, 이미 반영됨)

- `cf43f93` — `feat: 안정성 개선 - 에러 페이지, 프로덕션 로거, middleware 개선`

### 3. 안정성 보강 추가 (2026-04-25, 문서 반영)

- **`src/app/global-error.tsx`**: 루트 에러 바운더리, 프로덕션에서 전체 `error` 객체 `console.error` 억제.
- **`src/lib/auth-client.tsx`**, **`src/app/auth/callback/route.ts`** (1차): `console.log` / `console.warn` 는 비프로덕션 가드; **(2차, 아래 §4)** 동일 경로는 `logger`로 치환 — 동작·레벨별 정책은 `src/lib/logger.ts`·§4 참고.
- **`middleware.ts`**: `catch`에 **`[middleware] session refresh failed`** 로그.
- **`src/app/api/party-room/payments/kakao/approve/route.ts`**: 쿼리 `tid` ≠ 쿠키 `party_kakao_tid` → **400** `tid_mismatch`; 카카오 기본 콜백만으로는 `tid` 없을 수 있음(`TODO(stability)`).

### 4. 안정성 2차 보완 (2026-04-25, 코드)

- **`next.config.ts`**: `headers()` — 전 경로 `/:path*`에 **HSTS**(`Strict-Transport-Security`), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` 설정. (`images`·`experimental` 등 기존 옵션 그대로)
- **로거** (`src/lib/logger.ts` 확인 후): `src/lib/auth-client.tsx`, `src/app/auth/callback/route.ts` — `console.log`/`console.warn` → `logger` (프로덕션 `log`는 무음, `error`는 유지)
- **타입**: `calcPoints` 호출 3곳 — `getPriceType` 결과는 `as PriceType` 또는 단언 제거(연습실 kakao ready/approve); `Header.tsx` — `NAV_LINKS` 항목 `NavLinkItem` 교차 타입으로 `isNew` 정리(기존 `link as any` 제거)
- **파티룸 카카오 ready** (`src/app/api/party-room/payments/kakao/ready/route.ts`): `readyPayment` 응답 `tid` 없음/빈 문자열 시 **500** `kakao_tid_missing` + 락 해제; `tid` 있을 때 `party_kakao_tid` 쿠키 `httpOnly`·`secure`(production)·`sameSite: lax`·`maxAge: 600`. 성공 JSON 필드(`redirect_url`, `tid`) 유지

### 5. AI_TRANSFER_PROMPT.md 정합 (2026-04-25, 문서)

- **메타·버전**: HTML 주석·말미 `**작성일**` / `**버전**` = **2.34** (당시 최신), **최종 수정 2026-04-25** — 이후 **§6**에서 **v2.35**로 누적.
- **§1**: 구 메타 `v2.31`만 언급하던 문구를 **버전 누적·당시 v2.34**로 정리(역사 보존).
- **§3 vs §4**: `auth-client` / `auth/callback` — **1차(가드)** 와 **2차(logger)** 서술을 나란히 명시해 모순 제거.
- **참고** (`src/lib/logger.ts`): `log`·`info`·`debug`·`warn`·`error`·`payment` 는 항목별로 다름 — 상세는 소스·§4 확인.

### 6. AI_TRANSFER_PROMPT.md·안정성 3차 (2026-04-25)

- **문서**: HTML 주석·말미 `**작성일**` / `**버전**` → **2.35** (당시), 이후 **§7**에서 **v2.36** 누적.
- **`src/lib/auth-client.tsx` (3차 검증)**: `console.log` / `console.warn` 잔여 **없음** (2차 §4 반영됨). `console.error` **2곳** 유지. `import { logger } from '@/lib/logger'` 기존. **코드 diff 없음** 가능. `npm run build` 통과(검증 시점 기준).

### 7. 보안·안정성 4차 (2026-04-25)

- **`GET /api/reservations/payments/kakao/approve`**: 쿠키 **`practice_kakao_tid`** 없음·빈 문자열 → **400** `tid_missing`; 쿼리 **`tid`** 존재·비공백이고 쿠키 값과 불일치 → **400** `tid_mismatch` (파티룸 승인과 동일 패턴). 그 다음 기존 `approvePayment`·예약 INSERT.
- **`POST /api/admin/auth`**: **`ADMIN_PASSWORD_HASH`** 있으면 **`bcryptjs`** `compare`; 없으면 **`ADMIN_PASSWORD`** 평문 비교 + **`console.warn`** 평문 fallback 안내.
- **`POST /api/contact`**: HTML 파트에 **`escapeHtml`** 로 name·phone·subject·message 이스케이프 (`text` 본문 미변경).
- **`useIsAdult`** (`auth-client`): `loading` 분기 **`setState`** 동일 값 생략 가드.
- **ESLint `--fix`**: exit **1**, 잔존 위반 **다수** — 자동수정만 선택 유지·롤백 분리는 워킹트리 혼재 시 사용자 판단.

### 8. ESLint `set-state-in-effect` 등 (2026-04-25, 5차)

- **`src/lib/auth-client.tsx`**: `?refresh=` 시 **`setRefreshKey(Date.now())`** + 해당 줄 **`eslint-disable-next-line`**; `loading`/비인증·페치 전 **`setState`** 는 함수형 가드(미발동 줄은 disable 생략).
- **`Header.tsx`** (`pathname` 동기화), **`EquipmentDetailView.tsx`**, **`admin-context.tsx`**: 필요 줄 **`eslint-disable-next-line`** + 동작 동일한 `setState`.
- **`src/lib/payment-lock.ts`**: `getUserActiveLocks` 반환 **`PaymentLockRow[]`** (`Record<string, unknown>`).
- **미사용 변수 정리**: `Header`, `charge/cancel`, `login`, `guide`, `Hero`, 파티룸 카카오 승인, `supabase/client` 등 — **`npm run lint`** 에 오류·경고 잔존.
