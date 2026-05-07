# A1 STUDIO — AI 인계 문서

마지막 갱신: 2026-05-06
원천: 현재 코드베이스 기준 스냅샷 + AI 작업 메모리. 의심되면 항상 코드를 우선합니다.

---

## 1. 프로젝트 개요

서울 송파구 문정동에 위치한 보컬·댄스·연기·뮤지컬 연습실 **A1 STUDIO**의 공식 웹사이트 + 예약 시스템.

- **메인 도메인 기능**: 시간대별 연습실 예약, 카카오페이 결제, 포인트 충전·사용, 원데이클래스 모집, 자유게시판, 분실물·공지·후기 관리
- **별도 흐름**: 파티룸 예약(독립 결제 CID/테이블)
- **유저 흐름**: Supabase 인증(이메일/카카오/구글) → 휴대폰 인증 온보딩 → 예약/충전/사용

---

## 2. 기술 스택

- **프레임워크**: Next.js 16.1.6 (App Router) + React 19.2.3
- **스타일**: Tailwind CSS 4 (`@tailwindcss/postcss`)
- **DB**: PostgreSQL + Prisma 7.7.0 (`@prisma/adapter-pg`)
- **인증**: Supabase Auth (`@supabase/ssr`, v2.100.1) — 이메일/비밀번호, 카카오 OAuth, 구글 OAuth, 휴대폰 OTP
- **결제**: 카카오페이 API (Ready → Approve → Refund)
- **SMS/카카오톡**: CoolSMS 또는 SolAPI (env로 선택)
- **이메일**: SendGrid (문의 폼 등)
- **지도**: 네이버 지도 (클라이언트 SDK)
- **유틸**: bcryptjs, date-fns, zod, lucide-react, motion

---

## 3. 라우트

### Public 페이지 (`src/app/`)
홈, 소개(/about/company, /ceo, /space), /equipment, /equipment/[id], /spaces/[id], /booking + /booking/complete + /booking/payment/kakao/{success,cancel,fail}, /charge + /charge/{success,cancel,fail}, /pricing, /guide, /location, /contact, /events, /notices, /reviews, /one-day-class + /announcements + /requests, /party-room + /party-room/booking + /party-room/booking/complete, /board + /board/[id] + /board/write + /board/guide + /board/lost, /mypage, /dashboard, /login, /signup, /signup/error, /forgot-password, /reset-password, /find-account, /onboarding/phone, /onboarding/profile, /privacy, /terms

### Admin 페이지
/admin, /admin/board, /admin/class-requests, /admin/members, /admin/reservations/calendar, /admin/reviews
- sessionStorage 기반 비밀번호 보호 (`ADMIN_PASSWORD` 환경변수)

### API 라우트 (`src/app/api/`)
- **인증**: /auth/email-signup, /auth/callback, /auth/password-reset/{request,confirm}, /auth/sms/{send-code,verify-code}
- **예약**: /reservations/{available,cancel,create}, /reservations/holds/expire, /reservations/payments/kakao/{ready,approve,cancel,fail}
- **결제**: /payments/kakao/{ready,approve}, /charge/{ready,approve}
- **파티룸**: /party-room/reservations/{available,create,cancel}, /party-room/payments/kakao/{ready,approve,cancel,fail}
- **게시판**: /board (CRUD), /board/[id], /board/[id]/{comments,like}, /board/categories
- **회원**: /members/{profile,sync,withdraw}, /member-roles/role, /account/delete
- **관리자**: /admin/{auth,board,dashboard,members,reservations/calendar,reservations/cancel,reviews}
- **기타**: /lost-items, /notices, /events, /one-day-class, /find-account, /contact, /test/send-sms, /debug/*

---

## 4. 네비게이션 구조 (`src/lib/constants.ts NAV_LINKS`)

- **홈** → `/`
- **소개** ▼ 회사 소개 / 대표 소개 / 공간 소개 / 비품 및 시설
- **예약하기** → `/booking`
- **원데이클래스** ▼ 클래스 공고 등록 / 클래스 요청
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
| users | Supabase 인증 + 프로필(이름·전화·생년·약관 동의) |
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
| PaymentLock | 결제 트랜잭션 동시성 보호 |
| MemberRole | 멤버 역할 테이블 (CM = 코디네이터; MEMBER가 기본·미저장) |
| banned_members | 차단 이메일 |
| OneDayClass / OneDayClassApplication | 원데이클래스 모집·신청 |
| Notice / LostItem / Event | 공지·분실물·이벤트 |
| BoardPost / BoardComment / BoardLike | 자유게시판 (카테고리 자유텍스트, 답글·좋아요) |
| message_logs | SMS·알림톡 로그 |
| party_reservations | 파티룸 예약 (별도 스키마) |
| password_reset_tokens | 비밀번호 재설정 토큰 |

---

## 7. 홈페이지 섹션 순서 (`src/app/page.tsx`)

1. **HeroScroll** — 풀스크린 히어로 애니메이션
2. **StudioIntro** — 스튜디오명·태그라인·간단 소개
3. **One Space · Four Uses** — VOCAL/DANCE/ACT/MUSICAL 활용 카드
4. **Equipment** — 비품 8종 (전신거울, 촬영조명, 삼각대, 전자피아노, 보면대, 무선마이크, 요가매트, 폼롤러)
5. **GallerySection** — 연습실 사진 갤러리
6. **PricingSummary** — 요금 요약 ("합리적인 요금, 행복한 시간들!")
7. **ReviewsPreview** — 최근 후기
8. **LocationSection** — 네이버 지도 + 주소·전화
9. **하단 CTA 배너** — "오늘 연습, 지금 예약하세요"

---

## 8. 주요 기능 메모

- **인증**: Supabase Auth — 카카오/구글 OAuth + 이메일/비밀번호. 가입 후 휴대폰 OTP 온보딩(`NEXT_PUBLIC_PHONE_OTP_ENABLED`).
- **결제**: 카카오페이 — 본 예약과 파티룸이 별도 CID(`KAKAOPAY_CID`, `KAKAOPAY_PARTY_CID`).
- **포인트**: 패키지 충전 → 결제 승인 시 `user_points` 적립; 예약 시 `use_points` RPC로 차감.
- **공휴일/피크 가격**: `checkIsHoliday()`에 2026년 공휴일 하드코딩. 평일/주말·피크/오프피크 분리. 로컬 타임존 기준.
- **이벤트 가격**: 시작일 2026-04-08, 종료일 없음(상시 적용).
- **파티룸**: day/night/allday 패키지, 본 예약과 완전 분리된 흐름·테이블·CID.
- **자유게시판**: 카테고리는 작성자가 자유 텍스트 입력. 관리자가 핀/숨김/공지 표시.
- **분실물 게시판**: `/board/lost` — 관리자 전용 작성, 모두 열람.
- **원데이클래스**: 모집/확정/취소/완료 라이프사이클, 최소·최대 인원.
- **회원 역할**: 신규 가입자는 항상 MEMBER (테이블에 row 없음). 관리자 UI에서만 수동으로 CM 승격.
- **관리자**: 페이지 진입 시 비밀번호 입력 → sessionStorage 저장 (브라우저 닫으면 초기화).
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
- **관리자**: `ADMIN_PASSWORD`, `ADMIN_PASSWORD_HASH`
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

### 10-3. 회원 역할: CM 자동 부여 없음

신규 사용자는 항상 `MEMBER` (테이블에 row 없음 → 기본값). 관리자 UI(`/admin/members`, `/one-day-class/announcements`)에서만 수동으로 CM 승격.

- **이유**: CM이 드물고, 관리자 판단 하에 수동 할당.
- **코드 위치**:
  - `src/lib/member-role.ts` — `getMemberRoleByEmail`, `setMemberRoleByEmail`
  - `src/app/api/member-roles/route.ts` — GET/POST
  - Prisma: `getRoleByEmail`, `upsertRoleByEmail`

### 10-4. 연습실/파티룸은 한 공간 (예약 슬롯 공유)

연습실과 파티룸은 **같은 물리 공간**을 모드만 다르게 운영. 한쪽에서 예약이 잡히면 다른 상품 유형의 같은 시간대도 막혀야 정상.

- **이유**: 단일 공간을 용도별로 상품을 나눠 판매.
- **적용**:
  - `/api/reservations/available` 가 `reservation_type` 필터 없이 모든 예약을 반환하는 것은 **의도된 동작 (버그 아님)**
  - 중복 예약 체크도 `room_id` / `reservation_type` 분기 없이 같은 날짜·시간 충돌만 확인
  - 관리자 캘린더, 가용 시간 조회에서도 두 상품을 함께 표시

### 10-5. 기타

- **언어**: 코드 주석·커밋 메시지·UI 텍스트는 한국어.
- **메모리 원본**: 위 지침은 `~/.claude/projects/C--Users-zxcv9-A1STUDIO/memory/` 에 저장됨. 새 지침이 추가되면 이 문서도 갱신.

---

## 11. 신뢰성 주의

이 문서는 **2026-05-05 시점의 스냅샷**입니다. 코드는 계속 변경되니, 어긋나는 부분이 있으면 **항상 코드를 정답으로 삼고** 이 문서를 갱신해주세요. 특히 다음은 빠르게 바뀝니다:
- 가격/이벤트 기간/공휴일 목록
- 네비게이션 메뉴
- 출연작·후기 등 컨텐츠
