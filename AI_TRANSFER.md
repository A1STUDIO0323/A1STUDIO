# A1 STUDIO — AI 인계 문서

마지막 갱신: 2026-06-26
원천: 현재 코드베이스 기준 스냅샷 + AI 작업 메모리. 의심되면 항상 코드를 우선합니다.

## 최근 변경 사항 (2026-06-26)

- **CM 권한 user.id 기준 일원화 (유령 CM 버그 수정)** — 과거엔 CM 권한이 이메일 기반 `member_roles` 테이블에 저장되고 역할 조회가 이메일로 폴백 → Supabase에서 계정 삭제 후 같은 이메일로 재가입하면 새 MEMBER 계정에 옛 CM이 복원되던 버그.
  - **권한의 진실 = `users.role`(계정 id 기준)** 으로 통일. 이메일 폴백 제거: `/api/member-roles/role`(GET), `/api/admin/members`(목록) 모두 `users.role`만 사용.
  - CM 신청 승인(`/api/admin/cm-applications/[id]`)이 이제 `users.role='CM'`도 동기화(ADMIN 제외). `cm_profiles`/`member_roles`는 기존대로 유지(레거시 호환·관리자 목록).
  - 마이그레이션: **`supabase-migration-cm-role-unify.sql`** — `cm_profiles` 있는 계정 CM 백필 + `users.role=CM` 아닌 이메일의 레거시 `member_roles` CM 행 정리.
  - 진단 스크립트: `prisma/scripts/diagnose-cm-roles.mjs` (읽기 전용, 어댑터+dotenv).
  - 메모리 규칙(신규=MEMBER, 관리자 UI 수동 승격)과 일치. 관리자 승격 UI(`/api/admin/members/[id]/role`)는 기존대로 `users.role` 갱신.

- **OAuth 신규 가입 약관 동의 게이트** — 로그인 버튼(`/login`)으로 들어온 신규 사용자도 필수 약관에 동의하도록 강제. 기준은 `users.terms_agreed` 컬럼.
  - 회원가입(`/signup`): 약관 체크 → OAuth 직전 동의 내용을 쿠키(`a1_signup_consent`, SameSite=Lax, 10분)에 담아 전송 → 콜백에서 DB 저장.
  - 로그인 우회 신규자: 콜백(`/auth/callback`)에서 쿠키 없음 + `terms_agreed=false` 감지 시 `/signup?needConsent=1` 로 유도(세션 유지). 회원가입 페이지가 로그인 상태를 감지해 "약관 동의 게이트" 모드로 전환, 동의 시 `/api/members/agree-terms` 호출 후 온보딩 진행.
  - 신규 API: **`/api/members/agree-terms`** (POST) — 필수약관 동의 저장(privacy/terms=true, marketing 선택).
  - 신규 컬럼: `users.privacy_agreed`, `users.terms_agreed`, `users.terms_agreed_at`. 적용 SQL: **`supabase-migration-terms-consent.sql`** (기존 회원 grandfather UPDATE 포함). ⚠️ 배포 전 이 SQL 먼저 실행 필요.

## 최근 변경 사항 (2026-06-10)

- **Supabase RLS 3단계 적용 완료** — `supabase/rls/` 의 SQL 3개 (legacy 토큰 deny-all → 사용자 데이터 본인-only → 공개/관리자). 적용 후 anon key 로 본인 외 데이터 노출 차단.
- **`is_admin()` SECURITY DEFINER 헬퍼 추가** — `public.is_admin()` 으로 RLS 정책 내부에서 관리자 우회. `users.role='ADMIN'` 매칭.
- **예약 충돌 검사 service_role 전환** — `src/lib/space-availability.ts` 의 fetchPracticeIntervals/fetchPartyIntervals 가 `getAdminClient()` 사용해 RLS 우회. 모든 사용자 예약을 보고 정확한 충돌 검사.
- **`src/lib/supabase/admin.ts` 신규** — service-role 클라이언트 싱글톤. 서버 전용, 클라이언트 노출 절대 금지.
- **카카오 콜백 phone_duplicate 정리 강화** — 휴대폰 중복 시 방금 생성된 auth.users + public.users 행 삭제 + 세션 종료 후 `/signup/error` 리다이렉트.
- **자정 넘김 예약 지원** — `/booking` 연습실 시간제에서 익일 07:00까지 예약 가능. `reservations.end_date` (nullable date) 컬럼 신규. `calcHourlyMixed` 4번째 인자 `endsNextDay` 추가. mypage/complete 표시 "익일 HH:MM" 형식.
- **예약 enum 케이스 분리** — `RESERVATION_STATUSES`(대문자 enum 전용) vs `PARTY_STATUSES`(text 컬럼 혼용) — 카카오 승인 시 lowercase 'confirmed' 호환.

> **신규 문서 참조 (자동 홈페이지 제작 의뢰 처리)**:
> - [docs/INTAKE_BUILD_RULES.md](docs/INTAKE_BUILD_RULES.md) — `/intake` 의뢰 받아 신규 홈페이지 자동 빌드 시 적용할 통합 절대지침
> - [docs/INTAKE_TIER_PLAYBOOK.md](docs/INTAKE_TIER_PLAYBOOK.md) — 티어 1~5 단계별 빌드 플레이북 (✅⚠️❌ 구현 검증 마커 포함)

---

## 1. 프로젝트 개요

서울 송파구 문정동에 위치한 보컬·댄스·연기·뮤지컬 연습실 **A1 STUDIO**의 공식 웹사이트 + 예약 시스템.

- **메인 도메인 기능**: 시간대별 연습실 예약, 카카오페이 결제, 포인트 충전·사용, 원데이클래스 모집·신청·정산, 자유게시판, 분실물·공지·후기 관리
- **별도 흐름**: 파티룸 예약(독립 결제 CID/테이블)
- **부가 흐름**: 웹사이트 제작 의뢰(인테이크) — `/intake` 단계별 폼, 관리자 백오피스에서 처리
- **유저 흐름**: Supabase 인증(이메일/카카오/구글) → 휴대폰 인증 온보딩 → 예약/충전/사용
- **권한 흐름**: MEMBER(기본) / CM(코디네이터·원데이클래스 강사) / ADMIN(운영자) — `users.role` 컬럼 기반

---

## 2. 기술 스택

- **프레임워크**: Next.js 16.1.6 (App Router) + React 19.2.3
- **스타일**: Tailwind CSS 4 (`@tailwindcss/postcss`)
- **DB**: PostgreSQL + Prisma 7.7.0 (`@prisma/adapter-pg`)
- **인증**: Supabase Auth (`@supabase/ssr`, v2.100.1) — 이메일/비밀번호, 카카오 OAuth, 구글 OAuth, 휴대폰 OTP
- **결제**: 카카오페이 API (Ready → Approve → Refund)
- **SMS/카카오톡**: CoolSMS 또는 SolAPI (env로 선택)
- **이메일**: SendGrid (문의 폼·인테이크 알림 등)
- **지도**: 네이버 지도 (클라이언트 SDK)
- **유틸**: bcryptjs, date-fns, zod, lucide-react, motion

---

## 3. 라우트

### Public 페이지 (`src/app/`)
홈, 소개(/about/company, /ceo, /space), /equipment, /equipment/[id], /spaces/[id], /booking + /booking/complete + /booking/payment/kakao/{success,cancel,fail}, /charge + /charge/{success,cancel,fail}, /pricing, /guide, /location, /contact, /events, /notices, /reviews, /one-day-class + **/one-day-class/announcements** (CM·ADMIN 공고 등록 — `class_offerings` type='oneday', 실제 DB) + /one-day-class/list + /one-day-class/requests (MEMBER 전용) + /one-day-class/apply-cm + **/one-day-class/cm-list** (can_oneday=true 승인 CM 공개), **/lessons** + **/lessons/announcements** (CM·ADMIN 공고 등록 — `class_offerings` type='lesson', 실제 DB) + /lessons/list + /lessons/requests (MEMBER 전용) + **/lessons/cm-list** (can_lesson=true 승인 CM 공개), /party-room + /party-room/booking + /party-room/booking/complete, **/reservations/status** (통합 예약현황 캘린더 — 연습실·파티룸·장기대관 시간 블록), **/long-term/apply** (고객용 장기대관 신청 폼, status='REQUESTED'로 저장), /board + /board/[id] + /board/write + /board/guide + /board/lost, /mypage, /dashboard, /login, /signup, /signup/error, /forgot-password, /reset-password, /find-account, /onboarding/phone, /onboarding/profile, /privacy, /terms, **/intake + /intake/details** (웹사이트 제작 의뢰 인테이크 폼)

### Admin 페이지 (`/admin/*`)
/admin, /admin/board, /admin/class-offerings, /admin/class-requests, /admin/cm-applications, /admin/cm-settlements, /admin/intakes, /admin/members, /admin/reservations/calendar, /admin/reviews

- **이중 가드 (Phase B-3 마이그레이션 중)**:
  1. `middleware.ts` — `/admin` 진입 시 Supabase 세션 + `users.role === "ADMIN"` 검증, 아니면 `/`로 리다이렉트
  2. 페이지 내부 sessionStorage 비밀번호 인증(레거시) — Phase B-5에서 제거 예정

### 신원확인 게이트 (전화번호 인증 — `middleware.ts`)
- **보안 낮은 경로(`LOW_SECURITY_PATHS`)**: 홈(`/`)·소개(`/about/*`)·`/equipment`·`/spaces`·이용안내(`/pricing`,`/guide`)·`/location`·`/contact`·공지·이벤트(`/notices`)·후기(`/reviews`)·`/events`·`/availability`·`/privacy`·`/terms`. 로그인/전화번호 인증 없이 누구나 열람 가능(비로그인은 `PUBLIC_PATHS`로도 허용). ※ 게시판이지만 `/notices`·`/reviews`는 열람 공개.
- **신원확인 필요 경로(그 외 전부)**: 예약하기(`/booking`,`/party-room`,`/reservations`,`/long-term`)·원데이클래스(`/one-day-class`)·개인레슨(`/lessons`)·게시판 글쓰기·자유게시판(`/board`)·`/mypage`·`/charge`·`/dashboard` 등. 로그인 사용자가 진입 시 프로필 미완성→`/onboarding/profile`, 전화번호 미인증→`/onboarding/phone` 강제 리다이렉트(카카오 사용자는 자동완성으로 스킵). 비로그인은 `/login?next=...`.
- **방식**: 보안 낮은 경로만 화이트리스트(`LOW_SECURITY_PATHS`)로 열고 나머지는 기본 인증 강제 → 분류 누락 시 더 안전한 쪽(인증 강제)으로 동작.

### API 라우트 (`src/app/api/`)
- **인증**: /auth/email-signup, /auth/callback, /auth/password-reset/{request,confirm}, /auth/sms/{send-code,verify-code}
- **예약**: /reservations/{available,cancel,create}, /reservations/holds/expire, /reservations/payments/kakao/{ready,approve,cancel,fail}, **/reservations/status** (GET ?month=YYYY-MM, 읽기 전용 통합 조회 — 연습실/파티룸/장기대관), **/reservations/check-conflict** (POST {date,startTime,endTime}, 읽기 전용 선예약 충돌 사전 확인 — 두 테이블 교차검사, 예약 진행 전 팝업 안내용)
- **결제**: /payments/kakao/{ready,approve}, /charge/{ready,approve}
- **파티룸**: /party-room/reservations/{available,create,cancel}, /party-room/payments/kakao/{ready,approve,cancel,fail}
- **장기대관**: **/long-term/apply** (POST, 고객용 공개 신청 — 어드민 인증 없음, `long_term_bookings`에 `status='REQUESTED'` 저장 + 관리자에게 SMS+이메일 알림)
- **클래스/레슨 공고**: **/class-offerings** (GET 공개 — OPEN 상태 목록, POST CM/ADMIN 전용 — `class_offerings`에 즉시 OPEN 저장), **/class-offerings/[id]** (DELETE — CM은 본인 공고+신청자 0건일 때만, ADMIN은 제한 없음). 어드민 라우트(`/api/admin/class-offerings`)는 별도 유지
- **게시판**: /board (CRUD), /board/[id], /board/[id]/{comments,like}, /board/categories
- **회원**: /members/{profile,sync,withdraw,agree-terms}, /member-roles/role, /account/delete
  - **agree-terms** (POST): 로그인 우회 신규 가입자의 필수약관 동의 저장(privacy/terms=true, marketing 선택 → `users.terms_agreed` 등)
- **인테이크**: /intake/submit (zod 검증 + Prisma 저장 + SendGrid 메일 + SolAPI/CoolSMS 알림)
- **관리자**: /admin/{auth,board,dashboard,members,members/actions,reservations/calendar,reservations/cancel,reviews,intakes,intakes/[id],cm-applications,cm-applications/[id],cm-list,cm-settlements,cm-settlements/[id],class-offerings,class-offerings/[id],class-offerings/[id]/enrollments,class-enrollments/[id]}
- **기타**: /lost-items, /notices, /events, /one-day-class, /find-account, /contact, /test/send-sms, /debug/*

---

## 4. 네비게이션 구조 (`src/lib/constants.ts NAV_LINKS`)

- **홈** → `/`
- **소개** ▼ 회사 소개 / 대표 소개 / 공간 소개 / 비품 및 시설
- **예약하기** ▼ 예약현황(`/reservations/status`) / 연습실(`/booking`) / 파티룸(`/party-room`) / 장기대관(`/long-term/apply`)
- **원데이클래스** ▼ 안내(`/one-day-class`) / 공고 목록(`/one-day-class/list`) / 공고 등록(`/one-day-class/announcements`, CM·ADMIN 전용) / 요청(`/one-day-class/requests`, MEMBER 전용) / CM 목록(`/one-day-class/cm-list`, can_oneday=true 승인 CM)
- **개인레슨** ▼ 안내(`/lessons`) / 공고 목록(`/lessons/list`) / 공고 등록(`/lessons/announcements`, CM·ADMIN 전용) / 요청(`/lessons/requests`, MEMBER 전용) / CM 목록(`/lessons/cm-list`, can_lesson=true 승인 CM)
- **요금안내** → `/pricing`
- **이용안내** ▼ 이용수칙 / FAQ
- **게시판** ▼ 공지·이벤트 / 자유게시판 / 분실물 / 후기
- **오시는길** → `/location`
- **문의** → `/contact`

푸터 하단: 개인정보처리방침 / 서비스 이용약관 (`/terms`)

---

## 5. 핵심 상수 (`src/lib/constants.ts`)

| 항목 | 값 |
|---|---|
| 스튜디오명 | A1 STUDIO |
| 태그라인 | 보컬·댄스·연기·뮤지컬 연습실 |
| 주소 | 서울시 송파구 문정동 70-13 B1 (도로명: 새말로 103 지하1층) |
| 위치 안내 | 문정역 도보 8분 · 장지역 도보 10분 |
| 좌표 | 37.4828998, 127.1256066 |
| 전화 | 010-2994-0323 (운영 10:00–22:00) |
| 카카오 채널 | https://pf.kakao.com/_pwxldX |
| 인스타 | https://www.instagram.com/a1studio.munjeong |
| 네이버 플레이스 ID | 2012721420 |
| HOLD 만료 | 10분 |

---

## 6. 도메인 모델 (`prisma/schema.prisma`)

| 모델 | 용도 |
|---|---|
| users | Supabase 인증 + 프로필(이름·전화·생년·약관 동의) + **role** 컬럼("MEMBER"\|"CM"\|"ADMIN", 기본 MEMBER, `@@index([role])`) |
| Account/Session/VerificationToken | OAuth 세션 |
| Room | 연습실 (이름/수용/시설) |
| PricingRule | 요일·시간대·패키지별 가격 규칙 |
| Reservation | 예약 (HOLD→PAID→CONFIRMED, 환불 지원) |
| ReservationStatus(enum) | HOLD/PAID/CANCELLED/EXPIRED/REFUNDED/CONFIRMED |
| Payment | 결제 기록 (카카오페이) |
| Refund | 환불 (REQUESTED→APPROVED→REJECTED) |
| ChargePackage | 포인트 충전 패키지 (보너스율 포함) |
| user_points / point_transactions | 포인트 잔액 + 원장 |
| BlockedSlot / ExternalReservation | 슬롯 차단·외부 예약 동기화 |
| PaymentLock / public_PaymentLock | 결제 트랜잭션 동시성 보호 |
| MemberRole | (레거시) 이메일 기반 역할 테이블 — 신규 코드는 `users.role` 사용 |
| banned_members | 차단 이메일 |
| OneDayClass / OneDayClassApplication | 원데이클래스 모집·신청 (구 흐름) |
| **class_offerings / class_enrollments** | 신규 원데이클래스 공고·수강 신청 (CM이 등록·진행) |
| **cm_applications** | CM 지원서 (관리자 승인/반려) |
| **cm_profiles** | 승인된 CM의 프로필 정보 |
| **cm_settlements** | CM 정산 (REQUESTED→APPROVED→PAID, approver/payer FK → users) |
| **intake_submissions** | 웹사이트 제작 의뢰 폼 응답 (단계별 상세, target_tier 1~5/unsure) |
| Notice / LostItem / Event | 공지·분실물·이벤트 |
| BoardPost / BoardComment / BoardLike | 자유게시판 (카테고리 자유텍스트, 답글·좋아요) |
| message_logs | SMS·알림톡 로그 |
| party_reservations | 파티룸 예약 (별도 스키마) |
| **long_term_bookings** | 장기대관. status: `REQUESTED`(고객 신청) → `DRAFT` → `PENDING_PAYMENT` → `SCHEDULED` → `COMPLETED` / `CANCELLED`. usage_dates(Int[]) + usage_month + start_hour/end_hour로 일자×시간 표현(start/end_hour는 **대표/기본** 시간 — 날짜별 예외 시간은 등록 시 계산 반영 후 `admin_memo`에 기록). 가격 필드는 관리자가 검토 후 산정 |
| password_reset_tokens | 비밀번호 재설정 토큰 |
| reviews | 후기 |
| reservation_holds | HOLD 상태 보조 테이블 |
| email_auth_users | Supabase auth.users 미러 (참조용) |

---

## 7. 홈페이지 섹션 순서 (`src/app/page.tsx`)

1. **HeroScroll** — 풀스크린 히어로 애니메이션
2. **StudioIntro** — 스튜디오명·태그라인·간단 소개
3. **One Space · Four Uses** — VOCAL/DANCE/ACT/MUSICAL 활용 카드
4. **Equipment** — 비품 (전신거울, 촬영조명, 삼각대, 전자피아노, 보면대, 무선마이크, 요가매트, 폼롤러, TV)
5. **GallerySection** — 연습실 사진 갤러리
6. **PricingSummary** — 요금 요약 ("합리적인 요금, 행복한 시간들!")
7. **ReviewsPreview** — 최근 후기
8. **LocationSection** — 네이버 지도 + 주소·전화
9. **하단 CTA 배너** — "오늘 연습, 지금 예약하세요"

---

## 8. 주요 기능 메모

- **인증**: Supabase Auth — 카카오/구글 OAuth + 이메일/비밀번호. 가입 후 휴대폰 OTP 온보딩(`NEXT_PUBLIC_PHONE_OTP_ENABLED`).
- **권한 모델**: `users.role` 단일 컬럼 (MEMBER/CM/ADMIN). 신규 가입자는 항상 MEMBER. 자동 승격 없음 — 관리자 UI(`/admin/members`, `/admin/cm-applications`)에서 수동 변경.
- **관리자 인증 (Phase B 마이그레이션 중)**:
  - 신규: Supabase 세션 + `users.role === "ADMIN"` (`src/lib/admin-auth.ts`의 `requireAdmin()`, `requireRole()`, `requireAdminOrLegacy()`)
  - 레거시: `x-admin-password` 헤더 또는 `/api/admin/auth`의 비밀번호 — 점진적으로 제거 중
  - `/api/admin/auth` POST 시 **세션 → role → 비밀번호** 3중 검증, 실패 시 status별로 다른 한국어 에러 메시지를 클라이언트에 전달 (`AdminLoginResult` 타입)
  - `middleware.ts`는 `/admin/*` 진입 자체를 ADMIN role로 차단 (DB 조회 실패 시 production은 차단, dev는 통과)
- **결제**: 카카오페이 — 본 예약과 파티룸이 별도 CID(`KAKAOPAY_CID`, `KAKAOPAY_PARTY_CID`).
- **포인트**: 패키지 충전 → 결제 승인 시 `user_points` 적립; 예약 시 `use_points` RPC로 차감.
- **공휴일/피크 가격**: `checkIsHoliday()`에 2026년 공휴일 하드코딩. 평일/주말·피크/오프피크 분리. 로컬 타임존 기준.
- **이벤트 가격**: 시작일 2026-04-08, 종료일 없음(상시 적용).
- **파티룸**: day/night/allday 패키지, 본 예약과 완전 분리된 흐름·테이블·CID. **단, 같은 물리 공간이라 예약 슬롯은 공유 (10-4 참고)**.
- **원데이클래스 (신규 흐름 `class_offerings`)**: CM이 공고 등록 → 회원이 신청(`class_enrollments`) → 관리자/CM이 확정·취소 → 종료 후 `cm_settlements`로 정산 요청 → 관리자 승인 → 송금 처리(PAID).
- **인테이크 (`/intake`)**: 웹사이트 제작 의뢰 단계별 폼. 1~5단계 티어(소개·회원·예약·결제·플랫폼) + "잘 모르겠음". 제출 시 zod 검증 → Prisma 저장 → SendGrid 메일 → SMS/알림톡(`sendMessage`) 트리거. 관리자는 `/admin/intakes`에서 조회·상태 관리.
- **자유게시판**: 카테고리는 작성자가 자유 텍스트 입력. 관리자가 핀/숨김/공지 표시.
- **분실물 게시판**: `/board/lost` — 관리자 전용 작성, 모두 열람.
- **지도**: 네이버 플레이스(2012721420) 기반 좌표·라벨, "지도로 보기"는 플레이스 페이지로 직접 이동.

---

## 9. 환경 변수

- **DB**: `DATABASE_URL`, `PG_ALLOW_SELF_SIGNED_CERT`
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **OAuth**: `AUTH_KAKAO_ID`, `AUTH_KAKAO_SECRET`, `NEXT_PUBLIC_KAKAO_CONFIGURED`, `NEXT_PUBLIC_GOOGLE_CONFIGURED`
- **결제**: `KAKAOPAY_CID`, `KAKAOPAY_PARTY_CID`, `KAKAOPAY_SECRET_KEY`
- **SMS**: `SMS_PROVIDER`, `COOLSMS_API_KEY`/`SECRET`/`FROM_NUMBER`, `SOLAPI_API_KEY`/`SECRET`/`FROM_NUMBER`, `SOLAPI_KAKAO_ENABLED`, `SOLAPI_KAKAO_PF_ID`, `NEXT_PUBLIC_PHONE_OTP_ENABLED`
- **이메일**: `SENDGRID_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL`
- **지도**: `NEXT_PUBLIC_NAVER_MAP_CLIENT_ID`
- **관리자**: `ADMIN_PASSWORD`, `ADMIN_PASSWORD_HASH` (Phase B-5에서 제거 예정)
- **사이트**: `NEXT_PUBLIC_SITE_URL`, `NODE_ENV`
- **Cron**: `CRON_SECRET`

---

## 10. 작업 절대 지침 (AI 메모리 기반)

> 새 AI 세션은 이 섹션을 가장 먼저 읽고 시작할 것.

### 10-1. Git 작업은 사용자가 수동으로

자동으로 git 작업을 하지 말 것. 단, 사용자가 명시적으로 요청하면(`"git pull 해줘"`, `"커밋해줘"`) 실행해도 됨.

- **이유**: 사용자가 git workflow를 직접 통제. 커밋 메시지·타이밍·푸시 여부를 직접 관리.
- **적용**:
  - 파일 수정 후 자동으로 `git add`/`commit`/`push` 금지
  - 사용자가 직접 요청한 git 명령은 실행 가능

### 10-2. 외부 작업 필요 시 사용자에게 알리기

작업 중 사용자가 직접 외부에서 수행해야 하는 작업(Supabase SQL 실행, DB 마이그레이션, 외부 서비스 설정, 환경변수 추가 등)이 발생하면:

1. 코드 작업은 끝까지 완료할 것
2. 작업 종료 후 **"이 부분은 직접 해주세요"** 라고 명확히 알리고, 그대로 복붙해서 실행할 수 있는 형태(SQL 쿼리 전문 등)로 명령 제공

- **이유**: 외부 작업이 있다는 사실을 놓치면 코드만 반영되고 실제 동작이 안 되는 상황이 생김.
- **적용**:
  - Supabase 콘솔 SQL → 코드 블록으로 전체 SQL 제공
  - 환경변수 추가 → 변수명·예시값·어느 파일에 넣는지 명시
  - 외부 서비스 설정(카카오페이 콘솔, OAuth 등) → 어느 페이지에서 어떤 값을 입력할지 단계별 안내
  - "DB에 컬럼 추가가 필요하다" 식으로 언급만 하고 끝내지 말 것

### 10-3. 회원 역할: CM/ADMIN 자동 부여 없음

신규 사용자는 항상 `users.role = "MEMBER"` (기본값). 관리자 UI(`/admin/members`, `/admin/cm-applications`)에서만 수동으로 CM/ADMIN 승격. ADMIN 부트스트랩은 Supabase SQL로 직접 INSERT·UPDATE.

- **이유**: 권한 부여는 운영자 판단 하에서만.
- **코드 위치**:
  - `src/lib/admin-auth.ts` — `requireAdmin`, `requireRole`, `requireAdminOrLegacy`, `getCurrentUserWithRole`
  - `prisma/schema.prisma` — `users.role` 컬럼
  - `middleware.ts` — `/admin/*` 가드
  - 레거시: `src/lib/member-role.ts`, `src/app/api/member-roles/route.ts` (제거 예정)

### 10-4. 연습실/파티룸은 한 공간 (예약 슬롯 공유)

연습실과 파티룸은 **같은 물리 공간**을 모드만 다르게 운영. 한쪽에서 예약이 잡히면 다른 상품 유형의 같은 시간대도 막혀야 정상.

- **이유**: 단일 공간을 용도별로 상품을 나눠 판매.
- **적용**:
  - `/api/reservations/available` 가 `reservation_type` 필터 없이 모든 예약을 반환하는 것은 **의도된 동작 (버그 아님)**
  - 중복 예약 체크도 `room_id` / `reservation_type` 분기 없이 같은 날짜·시간 충돌만 확인
  - 관리자 캘린더, 가용 시간 조회에서도 두 상품을 함께 표시
- **두 테이블 교차검사** (`src/lib/space-availability.ts`): 예약은 `reservations`(연습실 + `/booking` 파티룸)와 `party_reservations`(`/party-room/booking`) **두 테이블**로 나뉘어 저장된다. 같은 물리 공간이므로 양쪽을 **반드시 교차검사**해야 한다.
  - `hasPracticeConflict` / `hasPartyConflict` / `hasAnySpaceConflict`: 후보 예약이 상대(또는 양쪽) 테이블 점유와 시간 겹침인지 확인. **자정 넘김(overnight) 인식**(나잇 19:00→익일 07:00 등).
  - 🔑 **RLS 우회 필수**: 두 테이블 SELECT 정책이 `user_id = auth.uid() OR is_admin()`라, 세션 클라이언트로는 **본인 예약만** 보인다. 충돌·가용성 검사는 모든 사용자 예약을 봐야 정확하므로 **service-role 클라이언트**(`src/lib/supabase/admin.ts`, RLS 우회)로 조회한다. (세션 클라이언트로 검사하면 교차 사용자 이중예약을 못 막음.)
  - ⚠️ **status 컬럼 타입 차이**: `reservations.status`는 **Postgres ENUM**(`ReservationStatus`) → `.in()`에 소문자 넣으면 enum 캐스트 에러로 쿼리 전체 실패. 대문자만(`PAID/HOLD/CONFIRMED`). `party_reservations.status`는 text → 카카오 승인이 소문자 `confirmed` 저장하므로 대소문자 모두 포함.
  - 적용 지점: 파티룸 `available`/`create`/`kakao ready`/`kakao approve` → 연습실 교차검사, 연습실 `available`/`create`/`kakao ready`/`kakao approve` → 파티룸 교차검사. `/reservations/check-conflict`는 진행 전 팝업용 사전검사.
  - 과거 버그: ① 두 테이블이 서로를 안 봐서 연습실 `00:00~02:00` 예약이 전날 파티룸 나잇/올데이를 안 막음. ② 검사를 세션 클라이언트(RLS)로 돌려 본인 외 예약을 못 봄. ③ enum 컬럼에 소문자 status 넣어 쿼리가 fail-open으로 조용히 통과.

### 10-5. 상세 에러/로그 메시지 필수

모든 구현에 추적·조치 가능한 로그 포함. 결제·예약·인증은 **start / success / failed 3단계** 로그 (`[prefix:scope] start ...`, `[prefix:scope] success ...`, `[prefix:scope] failed reason=... ...`).

### 10-6. DB 접근 패턴

- 인증(세션·user.id 추출)은 **Supabase**, 비즈로직 CRUD(role·예약·결제·게시판 등)는 **Prisma**
- 한 파일·한 함수 안에서 두 클라이언트를 섞지 않음
- 예외: `src/lib/admin-auth.ts`처럼 "Supabase로 user.id 받고 → Prisma로 role 조회" 같은 명확한 분리는 OK

### 10-7. 할인 중복 규칙

- 오픈이벤트 + 장기대관 → **중복 가능**
- 패키지 + 장기대관 → **중복 불가**

### 10-8. 🔒【절대지침】작업량 권장 레벨 매 요청 안내 + 확인 후 진행

매 요청 첫 줄에 `권장 작업량: <레벨>` 명시 (low/medium/high/max) + "바꾸셨나요?" 확인 → 사용자 응답 받은 후에만 작업. **곧장 작업 시작 금지.**

### 10-9. 장기대관 안내문 자동 발송

- 등록 시: 요금안내문 **즉시** 솔라피 발송
- 매 이용일 KST 10시: 이용안내문 솔라피 **예약** 발송
- 코드: `lib/long-term-template.ts`, `api/admin/long-term-bookings/[id]`
- 솔라피 예약 SMS는 발송 카운트 추적 (운영자가 한도 파악)
- **예외 시간(날짜별 다른 시간) 지원** (2026-06-30): 신규 등록 폼의 "예외 시간" 칸에 `7,9 12-15 / 8 13-16` 형식 입력 → 해당 날짜만 기본 start/end 대신 그 시간 적용. `POST`(+`preview`)에 `timeOverrides:[{day,startHour,endHour}]` 전달. 예외 날짜는 `usage_dates`에 자동 합집합 포함, 가격/총시간/요금·이용 안내문 시간그룹 표기·이용안내문 발송시각(시작-오프셋)까지 자동 반영. **DB 컬럼 추가 없음**(db push 금지) — 예외 시간 명세는 `admin_memo`에 `[예외 시간]`으로 append 기록. `start_hour/end_hour`는 대표(기본) 시간만 저장. 사후 "이용안내 추가" 재등록 경로는 균일 시간 기준(예외 미반영)이라는 한계 있음

### 10-9-3. CM 공개 노출 분류·위치 정책

- **노출 분류 기준**: `cm_applications.status='APPROVED'` + `can_oneday` / `can_lesson` 플래그
  - 원데이만 승인 → `/one-day-class/*`에만 노출
  - 레슨만 승인 → `/lessons/*`에만 노출
  - 둘 다 승인 → 두 메뉴 모두 노출
- **노출 위치 2곳 — 독립 토글로 제어** (Phase 2 적용 — `cm_profiles` 컬럼 분리):
  1. **본문 자동 카드** — `/one-day-class`, `/lessons` 메인 페이지의 `CmCardSection type="<type>" variant="section"` → 컬럼 `show_in_section`
  2. **CM 목록 페이지** — `/one-day-class/cm-list`, `/lessons/cm-list` (`CmCardSection ... variant="list"`) → 컬럼 `show_in_list`
- **마이페이지** (`CmProfileSection`)에서 두 위치를 개별 ON/OFF
- **`is_public` (레거시)** — `show_in_section || show_in_list` 와 자동 동기화. 신규 코드는 사용하지 말 것
- **마이그레이션 SQL**: `prisma/migrations/add_cm_profile_visibility_toggles.sql` — Supabase SQL Editor에서 실행 (백필 포함)
- **fallback**: `show_in_section`/`show_in_list` 컬럼이 아직 없는 환경(마이그레이션 전)에서 `CmCardSection`은 자동으로 `is_public` 으로 fallback 쿼리

### 10-9-2. 클래스/레슨 공고 등록 권한 정책

- **공고 등록**(`/one-day-class/announcements`, `/lessons/announcements`) — **CM 또는 ADMIN만** 가능
  - 두 페이지 모두 `src/components/class-offerings/AnnouncementsClient.tsx`를 type prop으로 공유
  - 실제 DB(`class_offerings`)에 저장. **localStorage 기반(`oneDayClassStore`)은 폐기**됨 (2026-05-13)
  - API: `POST /api/class-offerings` → Supabase 세션 + `users.role` 검증, CM이면 `cm_user_id` 자동 세팅, `status='OPEN'` 즉시 노출
  - 본인 공고 삭제: `DELETE /api/class-offerings/[id]` (신청자 0건일 때만, ADMIN은 제한 없음)
- **요청**(`/one-day-class/requests`, `/lessons/requests`) — **MEMBER만** 가능 (CM/ADMIN은 제출 차단)

### 10-9-1. 장기대관 고객 신청 흐름 (`/long-term/apply`)

- 고객 공개 폼 → `POST /api/long-term/apply` → `long_term_bookings.status='REQUESTED'`로 저장
- **어드민 페이지(`/admin/*`)로 고객이 진입하지 않도록 별도 공개 라우트 사용** (어드민 인증 없음)
- 가격 필드(`hourly_rate` / `gross_amount` / `discount_*` / `final_amount`)는 0으로 저장 — 관리자가 검토 후 정식 등록(요금 안내문 발송)할 때 산정
- 신청 접수 시 관리자에게 **SMS + 이메일** 동시 발송 (실패해도 신청 자체는 성공 응답)
- 어드민 목록(`/admin/long-term-bookings`)에서 `REQUESTED`는 **"신청"** 뱃지(로즈)로 표시
- 필요 env: `ADMIN_NOTIFY_PHONE` (없으면 `STUDIO_PHONE`), `ADMIN_NOTIFY_EMAIL` (없으면 `CONTACT_TO_EMAIL`)

### 10-10. ⚠️ 카카오페이 심사 중 — 결제 영역 변경 금지

심사 통과 전까지 **수정 금지** 영역:
- 테이블: `payments`, `reservations`, `party_reservations`
- 컬럼: `kakaopay_*` 전체
- 라우트: `/api/payments/**`, `/api/charge/**`, `/api/party-room/payments/**`, `/api/reservations/payments/**`
- **`prisma db push` 금지** (운영 DB)

읽기는 가능, 어떤 변경도 금지. 심사 완료 후 메모리 `project_kakaopay_review_in_progress.md` 갱신.

### 10-11. /intake 의뢰 → 신규 홈페이지 자동 제작

`/intake`로 외부 회사 홈페이지 의뢰가 들어오면:
1. `docs/INTAKE_BUILD_RULES.md` 절대지침 확인
2. `docs/INTAKE_TIER_PLAYBOOK.md`에서 target_tier 섹션 + 하위 누적 섹션 실행
3. **각 항목의 ✅⚠️❌ 마커 확인** — ❌ 항목은 신규 개발이므로 고객에게 일정·견적 가산 사전 고지
4. A1STUDIO 코드 검증된 부분(카카오페이·예약·솔라피·CM 등)은 재사용, 미검증 영역은 신규 개발

### 10-12. 기타

- **언어**: 코드 주석·커밋 메시지·UI 텍스트는 한국어.
- **메모리 원본**: 위 지침은 `~/.claude/projects/C--Users-zxcv9-A1STUDIO/memory/` 에 저장됨. 새 지침이 추가되면 이 문서도 갱신.

---

## 11. 진행 중인 마이그레이션

### Phase B: 관리자 인증 모던화 (sessionStorage 비번 → Supabase 세션 + role)

- **B-1~B-2 완료**: `users.role` 컬럼 추가, `src/lib/admin-auth.ts` 헬퍼 도입
- **B-3 진행 중**: `middleware.ts` `/admin` 가드, `/api/admin/auth` 3중 검증, AdminLoginResult 타입화
- **B-4 예정**: 모든 `/api/admin/*` 라우트를 `requireAdmin()` 또는 `requireAdminOrLegacy()`로 통일
- **B-5 예정**: sessionStorage 비밀번호 인증 UI 제거, `ADMIN_PASSWORD`/`ADMIN_PASSWORD_HASH` env 폐기
- **B-6 예정**: `MemberRole` 테이블·`src/lib/member-role.ts` 제거

---

## 12. 신뢰성 주의

이 문서는 **2026-05-13 시점의 스냅샷**입니다. (마지막 갱신: CM 노출 위치 독립 토글 — Phase 2 완료) 코드는 계속 변경되니, 어긋나는 부분이 있으면 **항상 코드를 정답으로 삼고** 이 문서를 갱신해주세요. 특히 다음은 빠르게 바뀝니다:
- 가격/이벤트 기간/공휴일 목록
- 네비게이션 메뉴
- 출연작·후기 등 컨텐츠
- 관리자 인증 마이그레이션 단계 (Phase B)
