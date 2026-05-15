# 홈페이지 자동 제작 티어별 플레이북 (Tier 1~5)

> `/intake` 의뢰를 받았을 때, **3번 항목(target_tier)** 을 기준으로 이 플레이북을 따라 빌드한다.
> 모든 단계는 [INTAKE_BUILD_RULES.md](./INTAKE_BUILD_RULES.md)의 **절대지침**을 준수한다.
> 각 티어는 누적식이다: 2단계는 1단계 포함, 3단계는 1+2 포함 …
>
> **참고**: 이 플레이북은 [/intake/details](../src/app/intake/details/page.tsx)의 견적 산정 기준과 1:1 정합한다.
> details 페이지는 고객 견적 안내용(할 수 있을 것 기준)이고, 이 플레이북은 실제 작업 기준이라 **구현 검증 상태 표시가 다름**.

---

## 🏷️ 구현 검증 상태 표기 (★ 항상 확인)

각 항목 앞에 다음 마커가 붙는다. 마커는 **A1STUDIO 코드베이스 기준 2026-05-13**.

| 마커 | 의미 | 빌드 시 행동 |
|---|---|---|
| ✅ | A1STUDIO에 검증된 코드 있음 — 재사용/복제만 하면 됨 | 그대로 사용. 일정·견적 확정 |
| ⚠️ | 부분 구현·일부 검증 필요 | 빌드 전 해당 영역 코드 점검, 필요 시 보강 |
| ❌ | 미검증·신규 개발 필요 | **고객에게 사전 고지**: 신규 개발 일정·견적 가산 명시 |

❌ 항목이 다수 포함된 의뢰 → 일정 산정 시 **개발·테스트 여유분 50% 이상 추가**, 일부는 외주 권장.

---

## 📋 빌드 전 공통 절차 (모든 티어)

### A. Intake 데이터 수신·검증
1. `/intake` 제출본 (`intake_submissions` 테이블 또는 첨부) 전체 읽기
2. **필수 항목** 누락 체크:
   - 1번: 사업자명, 사업자등록번호, 대표 연락처
   - 2번: 홈페이지 목적 (최소 1개)
   - 3번: target_tier 선택
   - 4번: 로고 상태, 대표 색상
   - 13번: 희망 오픈일
3. 누락 시 → **빌드 중단**, 누락 항목 리스트와 함께 사용자에게 회신

### B. 티어 자동 판정 (사용자가 "잘 모르겠음" 선택 시)
| Intake 응답 패턴 | 추천 티어 |
|---|---|
| 2번에 "회사·매장 소개" + "고객 문의 받기" 만 체크 | 1단계 |
| 위 + "회원 관리" 체크 | 2단계 |
| 위 + "예약 받기" 체크 | 3단계 |
| 위 + "상품·서비스 판매(결제)" 체크 + 통신판매업 신고 보유 | 4단계 |
| 위 + 5번에 "쿠폰/포인트/정산/세금계산서" 언급 | 5단계 |

판정 결과를 **반드시 사용자에게 먼저 보고하고 동의 받은 후** 빌드 진행.

### C. 신규 프로젝트 셋업 (모든 티어 공통)

**C-0. 제로베이스 최초 할 일 (사용자 PC에 개발 환경이 없을 때)**
A1STUDIO 리포 복제 또는 신규 Next.js 프로젝트 시작 **전에** 사용자 PC에 다음이 준비돼야 한다.
- [ ] Node.js 설치 — https://nodejs.org/ko/download (LTS 버전 권장)
- [ ] 작업 폴더 생성 — 업체명(영문 소문자, 하이픈 허용) 으로 빈 폴더 생성
- [ ] 해당 폴더에서 `npx create-next-app@latest` 실행 (신규 베이스로 시작할 때만; A1STUDIO 클론 시 생략)
- [ ] 위 3단계 완료 후 아래 Claude 작업 진행

**Claude 작업:**
- [ ] A1STUDIO 리포 복제 → 새 리포로
- [ ] `package.json` name, 회사명 리브랜딩
- [ ] `app/layout.tsx` metadata (title, description, OG) 교체
- [ ] `tailwind.config` 색상 토큰 교체 (4-2번 답변 기준)
- [ ] 로고 파일 교체 (`/public/logo.*`)
- [ ] 기존 A1STUDIO 콘텐츠 → intake 6-1번 답변으로 교체
- [ ] `.env.example` 정리
- [ ] `README.md` 재작성
- [ ] 절대지침 8-1: 사용 안 하는 모듈 삭제

**외부 작업 (사용자):**
- [ ] 신규 GitHub 리포 생성 → URL 회신
- [ ] Vercel 프로젝트 생성 → 리포 연결
- [ ] 도메인 구매 (intake 8번 기준) — 미보유 시
- [ ] 도메인 DNS A/CNAME 설정 (Vercel 안내대로)

### D. 모든 티어 공통 결정 사항 (intake에서 사전 확인)
이 6개 변수가 견적·일정·작업 범위를 크게 좌우한다. 빌드 시작 전 명시적으로 확인.

| 변수 | 영향 | 기본값 |
|---|---|---|
| 디자인 — 템플릿 / 맞춤 | 맞춤은 +30~50% 작업 | 템플릿 (검증된 A1STUDIO 베이스) |
| 수정 횟수 — 3회 / 무제한 | 무제한 시 +20~30% | 시안 단계 3회 |
| 콘텐츠 — 고객 제공 / 제작 대행 | 대행 시 카피·촬영 외주 발생 | 고객 제공 |
| 촬영 — 기존 자료 / 신규 촬영 | 신규 시 외주 연결 | 기존 자료 |
| 일정 — 정상 / 긴급 | 긴급 시 +30~50% | 정상 |
| 유지보수 — 1년 무상 / 영구 / 월 정기 | 영구는 +20~40% | 1년 무상 |

---

## 🟢 1단계 — 일반 소개 페이지

### 목표
회사·매장 소개, 문의받기. 정적 사이트.

### Claude가 만들 페이지·기능 (기본 포함)
- [ ] ✅ **/** (홈) — 메인 비주얼, 한 줄 소개, CTA
- [ ] ✅ **/about** — 회사 소개 (intake 6-1)
- [ ] ✅ **/services** — 서비스/상품 안내 (intake 6-2)
- [ ] ✅ **/contact** — 문의 폼 (이메일 발송) / 카카오톡 채널 링크
- [ ] ✅ **/location** — 오시는 길 (지도 임베드)
- [ ] ✅ **/privacy** — 개인정보처리방침 (기본 템플릿 + intake 1번 자동 채움)
- [ ] ✅ **/terms** — 이용약관
- [ ] ✅ 헤더/푸터 + **사업자 정보 표기** (전상법)
- [ ] ✅ 모바일 반응형
- [ ] ✅ **기본 SEO** (`metadata`, `sitemap.xml`, `robots.txt`, OG)
- [ ] ✅ 404 페이지
- [ ] ✅ 1년 호스팅 안내 (운영 매뉴얼 문서로 제공)

### 선택 기능 (intake 답변에 따라 자동 포함)
- [ ] ❌ **카피라이팅 대행** — 외주 안내만 (Claude는 초안 작성 가능, 전문 카피라이터 외주는 별도)
- [ ] ❌ **전문 촬영/보정** — 외주 연결만
- [ ] ❌ **맞춤 일러스트/아이콘** — 외주 또는 별도 제작
- [ ] ⚠️ **애니메이션·인터랙션** — `motion` 라이브러리 설치됨, 단순 효과는 검증, 복잡한 인터랙션은 신규
- [ ] ❌ **다국어 지원** (한/영) — i18n 라이브러리 미설치, 신규 도입 필요 (next-intl 등 추가 + 콘텐츠 번역)
- [ ] ❌ **광고 픽셀 자동 삽입** — 자동 주입 코드 없음. 수동 삽입은 가능

### 로깅 (절대지침 1번)
- [ ] 문의 폼 제출: `[Contact][START]` → `[Contact][SUCCESS]` / `[Contact][FAIL]`
- [ ] 이메일 발송 결과 로그 (SMTP 응답 코드 포함)

### 외부 작업 (사용자)
1. **이메일 발송 SMTP 설정** — Gmail 앱비번 / SendGrid / Resend 중 택1
2. **카카오 지도 API 키** (지도 페이지에 사용 시)
3. **카카오톡 채널 ID** (intake에서 문의 채널로 선택 시)
4. **네이버 서치어드바이저 / 구글 서치콘솔** 등록
5. **광고 픽셀 ID** (구글 애즈·네이버 광고 사용 시)
6. **도메인 연결 확인**
7. **사진/로고 원본 파일 전달** (구글 드라이브·MYBOX 링크)

### 완료 체크
- [ ] 모든 페이지 200 응답
- [ ] 모바일 Lighthouse 90+ (성능/접근성)
- [ ] 문의 폼 실제 발송 테스트
- [ ] 푸터 사업자 정보 정확
- [ ] 시안 컨펌 1회 + 추가 수정 정책 합의

### 예상 작업 시간 / 견적 범위
- 3~7일 / 30~200만원

---

## 🟡 2단계 — 회원 + 게시판

> **누적**: 1단계 모두 + 아래

### Claude가 만들 페이지·기능 (기본 포함)
- [ ] ✅ **/signup** — 회원가입 (Supabase Auth + 이메일 인증)
- [ ] ✅ **/login**, **/logout**
- [ ] ✅ **/forgot-password**, **/reset-password**, **/find-account** — 검증됨
- [ ] ✅ **/mypage** — 내 정보 수정, 비번 변경
- [ ] ✅ **/notices** — 공지사항 (관리자만 작성)
- [ ] ✅ **/admin** — 관리자 대시보드
- [ ] ✅ **권한 관리** (member-role, admin-auth) — 절대지침 3-1 준수
- [ ] ⚠️ **Supabase RLS 정책** — 기존 테이블 검증됨, 신규 테이블은 매번 수동 적용

### 선택 기능 (intake 9번·답변 따라)
- [ ] ⚠️ **소셜 로그인** — auth-client에 흔적 있음, 실제 OAuth 가동 여부 빌드 시 검증 필요 (카카오/네이버/구글 각각 콘솔 설정)
- [ ] ⚠️ **휴대폰 본인인증** — `sms-otp` (자체 SMS OTP)는 검증, 정식 본인인증 ASP(NICE/KCB/다날)는 신규 ❌
- [ ] ✅ **다중 게시판** — board/reviews/notices 검증됨, 패턴 복제
- [ ] ⚠️ **회원 등급** — member-role 구조 있음, "등급별 우선 예약권" 같은 비즈 로직은 신규
- [ ] ❌ **댓글·좋아요·신고** — 코드 없음, 신규 개발
- [ ] ❌ **이미지 자동 압축** (sharp/Cloudinary) — 라이브러리 미설치
- [ ] ⚠️ **자료실** — board 패턴 재활용 가능, 파일 다운로드 처리 보강 필요
- [ ] ⚠️ **관리자 통계 대시보드** — admin 페이지 검증, 통계 위젯은 의뢰별 신규
- [ ] ✅ **SendGrid 이메일 자동 발송** — @sendgrid/mail 설치·운영 중

### DB 모델 (Prisma)
```prisma
model User { ... role @default(MEMBER) phoneVerified Boolean? }
model Post { ... category notice|review|qna|files }
model Comment { ... }
model PostLike { ... }
model PostReport { ... }
```

### 로깅 (절대지침 1번)
- [ ] 회원가입: `[Auth][SIGNUP][START]` → SUCCESS/FAIL
- [ ] 이메일 인증: `[Auth][EMAIL_VERIFY][SENT/CONFIRMED/EXPIRED]`
- [ ] 로그인: `[Auth][LOGIN]` (실패 사유 마스킹: 비밀번호 불일치 vs 미가입)
- [ ] 비밀번호 재설정: `[Auth][PWD_RESET][REQUEST/SUCCESS/FAIL]`
- [ ] OAuth: `[Auth][OAUTH][provider=kakao]` 시작/성공/실패
- [ ] 휴대폰 본인인증: `[Auth][PHONE_VERIFY][START/SUCCESS/FAIL]`
- [ ] 게시글: `[Board][CREATE/UPDATE/DELETE]` postId, userId, category
- [ ] 권한 변경: `[Admin][ROLE_CHANGE] from=X to=Y by=adminId` (감사 로그)
- [ ] 신고: `[Board][REPORT]` postId, reporterId, reason

### 외부 작업 (사용자)
1. **Supabase 신규 프로젝트 생성** — 서울 리전, URL/anon key/service_role 회신
2. **OAuth 설정** (선택 시)
   - 카카오: https://developers.kakao.com → REST API 키, 리다이렉트 URI
   - 네이버: https://developers.naver.com
   - 구글: https://console.cloud.google.com
3. **휴대폰 본인인증 ASP 가입** (선택 시) — NICE/KCB/다날
4. **SendGrid (또는 Resend) 가입** — API 키 회신
5. **첫 관리자 계정 수동 승격 SQL** (절대지침 3-1)
   ```sql
   UPDATE users SET role = 'STUDIO_ADMIN' WHERE email = '{관리자_이메일}';
   ```

### 완료 체크
- [ ] 회원가입/이메일인증/탈퇴 E2E
- [ ] 비밀번호 재설정 메일 실제 도착
- [ ] 비회원 접근 시 보호 페이지 리다이렉트
- [ ] RLS 정책 확인 (타인 글 수정 불가)
- [ ] 관리자만 공지 작성 가능

### 예상 작업 시간 / 견적 범위
- 2~3주 / 100~600만원

---

## 🟠 3단계 — 예약 시스템 (★ 결제 미포함)

> **누적**: 1+2단계 모두 + 아래
> ⚠️ **3단계에는 결제 시스템이 포함되지 않는다.** 무료 예약·현장 결제·계좌이체 안내만 제공.
> 온라인 결제(예약금·전액)가 필요하면 **4단계로 안내**.

### Claude가 만들 페이지·기능 (기본 포함)
- [ ] ✅ **/reservation** — 예약 캘린더 (booking/reservations 검증)
- [ ] ✅ **예약 슬롯 관리 + 동시성** (`lib/payment-lock.ts` 검증)
- [ ] ✅ **예약 가능 시간 설정** (availability 페이지 존재)
- [ ] ✅ **예약 신청·확인·취소** (party-room/booking 검증)
- [ ] ✅ **취소·환불 정책** (`lib/refund-policy.ts` 검증, *환불 정산은 4단계*)
- [ ] ✅ **예약 시 이메일/SMS 자동 발송** (SendGrid + 솔라피 검증)
- [ ] ✅ **/admin/reservations** — 관리자 캘린더
- [ ] ⚠️ **/admin/stats** — 의뢰별 통계 위젯은 신규 구성
- [ ] ✅ **결제 안내 페이지** — 현장/계좌이체 안내 (단순 정적 페이지)

### 선택 기능 (intake 답변 따라)
- [ ] ✅ **복수 예약 항목** (룸/파티룸/일일클래스 검증)
- [ ] ✅ **유연한 슬롯** (시간 단위 검증, 15/30분 혼합은 보강 필요)
- [ ] ✅ **시점별 환불 정책** (`refund-policy.ts` 검증)
- [ ] ✅ **솔라피 SMS + 예약 발송 + 카운팅** (검증·운영 중)
- [ ] ❌ **카카오 알림톡** — SMS는 검증, 알림톡(템플릿/비즈채널) 별도 구현 필요
- [ ] ⚠️ **자동 리마인드 (Vercel Cron)** — 솔라피 예약발송으로 대체 검증, Cron 자체는 보강 가능
- [ ] ❌ **노쇼 자동 차단** — 코드 없음, 신규 개발
- [ ] ❌ **회원 등급별 우선 예약권** — 신규 개발
- [ ] ❌ **예약 변경 (이동)** — 취소는 검증, 변경/이동은 신규
- [ ] ⚠️ **관리자 일괄 슬롯 생성/휴무** — 부분 구현, 의뢰별 보강
- [ ] ⚠️ **다중 운영자 권한 분리** — `admin-auth`/`cm` 구조 있음, 매장별 세분화는 신규
- [ ] ✅ **장기대관 안내문 자동 발송** (`lib/long-term-template.ts` 검증, 절대지침 9-2)
- [ ] ✅ **장기대관 고객 신청 폼** (`/long-term/apply` + `POST /api/long-term/apply` 검증 — 어드민 분리, `status='REQUESTED'`, 관리자 SMS+이메일 알림)
- [ ] ✅ **통합 예약현황 캘린더** (`/reservations/status` + `GET /api/reservations/status?month=YYYY-MM` 검증 — 연습실/파티룸/장기대관 시간 블록 통합)
- [ ] ✅ **클래스/레슨 공고 등록(CM 셀프 등록)** (`/one-day-class/announcements`, `/lessons/announcements` + `POST /api/class-offerings` 검증 — 공유 컴포넌트 `AnnouncementsClient`, type 분기, CM·ADMIN 게이트, 본인 공고 삭제까지)
- [ ] ✅ **CM 카드 분류별 공개 노출 + 위치 독립 토글** (`CmCardSection type='oneday'|'lesson' variant='section'|'list'` + `/one-day-class/cm-list`, `/lessons/cm-list` 검증 — `cm_applications.can_oneday/can_lesson` 자동 분류, `cm_profiles.show_in_section`/`show_in_list` 컬럼으로 마이페이지에서 본문 카드/목록 페이지 노출 개별 ON/OFF)

### DB 모델 (Prisma)
```prisma
model ReservationSlot { startsAt, endsAt, capacity, resourceId, ... }
model Resource { name, type, ... }  // 룸·강사·장비
model Reservation { userId, slotId, status, cancelledAt, paymentMethod /* onsite|bank_transfer */, paymentStatus /* pending|confirmed */, ... }
model RefundPolicy { hoursBefore, refundRate, ... }
model NoShowRecord { userId, count, blockedUntil, ... }
```

### 로깅 (절대지침 1번 + 1-2번 ★ 3단계)
- [ ] `[Reservation][START] userId=X slotId=Y resourceId=Z`
- [ ] `[Reservation][SUCCESS] reservationId=R`
- [ ] `[Reservation][FAIL] reason=slot_full|already_booked|invalid_time|noshow_blocked`
- [ ] `[Reservation][CANCEL] reservationId hoursBefore refundRate`
- [ ] `[Reservation][CHANGE] reservationId from=X to=Y`
- [ ] `[Notification][SMS|ALIMTALK|EMAIL][START/SUCCESS/FAIL]` solapi_groupId
- [ ] 솔라피 발송 카운트 증가 (절대지침 9-1)
- [ ] `[Reservation][PAYMENT_PENDING]` — 입금 대기 (3단계는 결제 모듈 없음, 상태만 추적)

### 외부 작업 (사용자)
1. **솔라피 가입 & API 키 발급** (선택 시) — https://solapi.com
2. **발신번호 등록** (솔라피 콘솔)
3. **알림톡 템플릿 등록** (선택 시) — 카카오 비즈채널 필요
4. **카카오 비즈채널 개설** — 사업자등록증 필요
5. **Vercel Cron 활성화** (리마인드용)
6. **계좌이체용 입금 계좌 정보** 회신 (사업자 명의)

### 완료 체크
- [ ] 동시 예약 충돌 방지 (트랜잭션·유니크 제약)
- [ ] 환불률 정책 정확히 계산·표시
- [ ] 알림 실제 발송 (테스트 번호)
- [ ] 관리자 수동 예약·취소·환불 확인 가능
- [ ] 노쇼 차단 동작 확인

### 예상 작업 시간 / 견적 범위
- 3~5주 / 400~800만원

### ★ 4단계로 안내해야 할 신호
다음 중 하나라도 해당하면 **고객에게 4단계 권유**:
- 온라인 결제로 예약금 받기 원함
- 정기결제(멤버십·구독) 필요
- 환불 자동화 필요
- PG사 연동·자동 영수증 필요

---

## 🔴 4단계 — 결제 시스템

> **누적**: 1+2+3단계 모두 + 아래
> ⚠️ 절대지침 4번 전체 적용

### 사전 확인 (Claude가 빌드 시작 전 반드시 점검)
- [ ] intake 11-1: **통신판매업 신고 완료** 체크 여부 — **미입력 시 빌드 시작 불가** (intake 폼 자체에서 4단계 이상 선택 시 필수 검증)
- [ ] 미신고 시 → 빌드 중단, 1~3단계로 우선 빌드 제안
- [ ] **카카오페이 심사 중**인 기존 프로젝트는 절대지침 4-3 적용 (수정 금지)
- [ ] **사이버배상책임보험** 가입 권장 안내 (연 30~80만원)
- [ ] **카카오페이 심사 필수 페이지**: `/privacy`, `/terms` 사전 구축 + 푸터 링크 노출 (절대지침 4-5)
- [ ] **푸터 사업자정보 5종**: 상호명/대표자명/사업자등록번호/사업장 주소/전화번호 (절대지침 4-6)
  - 모든 항목 **사업자등록증과 100% 일치** (실측 카카오페이 거절 사례 1순위)
  - 사업자등록증 사본 vs 푸터 표기 육안 대조 후 빌드 완료 처리

### Claude가 만들 페이지·기능 (기본 포함)
- [ ] ✅ **결제 페이지·완료·실패** (booking/payment/kakao/* 검증)
- [ ] ✅ **/api/payments/kakao/{ready,approve}** — 검증·운영 중
- [ ] ✅ **환불 처리** (`/api/reservations/cancel` 검증, 전액 환불 위주)
- [ ] ✅ **PG 웹훅** (`/api/webhooks/solapi` 패턴 검증, 카카오페이 웹훅은 보강 가능)
- [ ] ✅ **★ amount 위변조 방지** (lib/kakaopay·payment 구조에서 서버 검증)
- [ ] ✅ **/mypage** 결제 내역 — 검증
- [ ] ✅ **/admin/payments** — 검증
- [ ] ⚠️ **자동 영수증 발급** — 카카오페이 자체 영수증은 검증, 자체 발급은 보강 필요
- [ ] ✅ **/terms/refund** 환불 규정 페이지
- [ ] ✅ **사업자 정보 표기** (전상법)

### 선택 기능 (intake 답변 따라)
- [ ] ❌ **토스페이먼츠 추가** — A1STUDIO는 카카오페이만. 토스 신규 구현 필요
- [ ] ❌ **네이버페이 추가** — 신규
- [ ] ❌ **다중 PG 라우터** — 신규
- [ ] ❌ **정기결제(구독)** — 단건만 검증, 정기결제 신규
- [ ] ❌ **쿠폰·할인코드** — 코드 없음, 신규
- [ ] ⚠️ **포인트·적립금** — `supabase-points` 있음, 결제 연동은 검증 필요
- [ ] ⚠️ **부분 환불 + 사유 분기** — 전액 환불 위주, 부분 환불 보강 필요
- [ ] ❌ **비회원 결제** — 회원 중심, 비회원 흐름 신규
- [ ] ⚠️ **결제 실패 알림** (Slack/이메일) — 로그는 검증, 별도 알림 채널 신규
- [ ] ❌ **Sentry 연동** — 미설치, 신규
- [ ] ❌ **일일 정산 리포트** — 신규

### DB 모델 (예시)
```prisma
model Payment {
  id, reservationId, orderId, userId, amount, method,
  pgTid, pgApproveAt, status, // ready|paid|cancelled|partial_cancelled
  cancelAmount, cancelReason, cancelAt,
  rawRequest Json, rawResponse Json, // 감사용
}
model Coupon { code, type, value, validFrom, validUntil, usedAt, ... }
model Point { userId, amount, source, expireAt, ... }
```

### 로깅 (★★ 절대지침 1-2 강제 적용)
**결제 흐름 모든 단계에 3단계 로그:**
```
[Payment][REQUEST][START] userId orderId amount method
[Payment][REQUEST][SUCCESS] tid=T0001 next_redirect_url=...
[Payment][REQUEST][FAIL] reason code message

[Payment][APPROVE][START] tid pg_token
[Payment][APPROVE][SUCCESS] paymentId amount approved_at
[Payment][APPROVE][FAIL] reason code

[Payment][AMOUNT_MISMATCH] expected=10000 received=1 → 결제 거부 (★ 위변조 시도)

[Payment][CANCEL][START] paymentId reason amount
[Payment][CANCEL][SUCCESS] cancelled_at refund_amount
[Payment][CANCEL][FAIL] reason

[Payment][WEBHOOK][RECEIVED] tid signature_valid=true
[Payment][WEBHOOK][DUPLICATE] tid → 멱등 처리
```

민감정보 마스킹 (절대지침 1-4):
- 카드번호: `****-****-****-1234`
- 토큰: 앞 8자 + `...`

### 외부 작업 (사용자) — ★ 가장 긴 단계
**1. 사업자 사전 준비**
- 통신판매업 신고 (미신고 시): https://www.ftc.go.kr → 약 3~7일
- 사업자 명의 정산 계좌
- 사이버배상책임보험 가입 (권장, 연 30~80만원)

**2. PG 가입·심사 (병렬 진행)**
- **카카오페이** — https://business.kakao.com/info/kakaopaymerchant — 2~4주
- **토스페이먼츠** — https://www.tosspayments.com — 1~2주
- **네이버페이** — 선택, 5단계 권장
- 필요 서류: 사업자등록증, 통신판매업 신고증, 대표자 신분증, 정산계좌 사본

**3. 환불 정책 운영자 입력** (관리자 페이지)
**4. 웹훅 URL을 PG 콘솔에 등록**
**5. Sentry 프로젝트 생성** (선택 시) — DSN 회신

### 빌드 순서 권장
1. 1~3단계 완료·배포 후 4단계 시작
2. 결제 라우트는 placeholder ("결제 시스템 준비 중")로 우선 배포
3. PG 심사 진행 동안 결제 코드 작성·테스트(PG 테스트 모드)
4. 심사 완료 후 환경변수 주입 → 결제 활성화

### 완료 체크
- [ ] PG 테스트 모드 결제 성공
- [ ] **amount 위변조 시도 → 거부** (수동 테스트)
- [ ] 환불 전액/부분 모두 확인
- [ ] 웹훅 중복 처리 (멱등성)
- [ ] 결제 실패 시 예약 상태 정확히 롤백
- [ ] 환불 정책 3곳(푸터/약관/결제 직전) 노출
- [ ] 결제 내역 CSV 다운로드 (관리자)
- [ ] Sentry 에러 수집 확인

### 예상 작업 시간 / 견적 범위
- 4~7주 (PG 심사 포함) / 600~1,200만원

---

## 🟣 5단계 — 풀 커스텀 플랫폼

> **누적**: 1+2+3+4단계 모두 + 아래

> ⚠️ **5단계는 A1STUDIO 코드베이스 외 영역이 대다수**. 의뢰 시 ❌ 항목 일정·견적 가산 필수.

### Claude가 만들 페이지·기능 (기본 포함)
- [ ] ❌ **다중 PG 동시 운영** — 카카오만 검증, 토스·네이버 라우터 신규
- [ ] ⚠️ **다중 사용자 권한 매트릭스** — CM/admin 구조 있음, 5+ 역할 세분화는 신규
- [ ] ❌ **정산 자동화** — 판매자별 수수료·매출 집계 신규 (CM 정산은 ✅ `admin/cm-settlements` 검증)
- [ ] ✅ **ERD·API 명세서 문서화** (Claude가 docs로 생성)
- [ ] ❌ **Sentry + Vercel Analytics** — 미설치, 신규
- [ ] ⚠️ **Supabase 자동 백업** — Supabase Pro 기능, 활성화만 필요. **외부 백업(S3)** 은 신규 ❌
- [ ] ✅ **1개월 집중 AS** — 운영 절차, 코드 아님

### 선택 기능 (intake 답변 따라) — ★ 대부분 신규 개발
- [ ] ❌ **마켓플레이스 (판매자 가입·심사·정산)** — 신규
- [ ] ❌ **세금계산서 (포핀/팝빌)** — 신규
- [ ] ❌ **배송 API (CJ·우체국·한진)** — 신규
- [ ] ❌ **재고 관리** — 신규
- [ ] ❌ **AI 추천** — 신규 (협업 필터링·OpenAI 등 별도 설계)
- [ ] ❌ **PWA** — manifest·service worker 미구성, 신규
- [ ] ❌ **다국어** (1단계 ❌ 참조)
- [ ] ❌ **다중 통화·환율 API** — 신규
- [ ] ❌ **고급 통계 (코호트·퍼널·LTV)** — 신규
- [ ] ❌ **부하 테스트·재해복구 계획** — 신규 문서·절차

### DB 모델 추가
```prisma
model Seller { ... approveStatus settlementBank ... }
model Settlement { period, sellerId, gross, fee, net, status, paidAt }
model TaxInvoice { paymentId, sellerId, status, issuedAt, providerTid }
model Inventory { productId, stock, threshold }
model Shipment { paymentId, carrier, trackingNumber, status }
```

### 로깅 (절대지침 1번 전체 + 정산은 별도 감사 로그)
- [ ] 모든 결제 로그 (4단계 동일)
- [ ] `[Coupon][ISSUE/USE/EXPIRE]`
- [ ] `[Point][EARN/USE/EXPIRE]`
- [ ] `[Settlement][CALCULATE/PAYOUT][START/SUCCESS/FAIL]` — 금액 감사 필수
- [ ] `[TaxInvoice][ISSUE/CANCEL][START/SUCCESS/FAIL]`
- [ ] `[Inventory][DECREASE/RESTOCK/LOW_ALERT]`
- [ ] `[Shipment][CREATE/UPDATE/DELIVERED]`

### 외부 작업 (사용자)
1. **추가 PG 가입·심사** (네이버페이 등)
2. **세금계산서 ASP 가입** — 인증서·API 키
3. **배송 API 계약** (CJ·우체국 등)
4. **회계 시스템 연동** (해당 시)
5. **정산 계좌 다수 등록** (마켓플레이스)
6. **개인정보 영향평가 / ISMS** (대규모 시 — 법무 검토)
7. **백업 저장소** (S3·Backblaze·R2 등)
8. **Sentry·Vercel Analytics 유료 플랜**

### 완료 체크
- [ ] 다중 PG 라우팅 정상
- [ ] 정산 계산 정확 (소수점·수수료·VAT)
- [ ] 세금계산서 발행 테스트
- [ ] 쿠폰/포인트 동시 적용 우선순위 명확
- [ ] 대시보드 응답 속도 (인덱스·캐싱)
- [ ] 부하 테스트 (예상 트래픽 2배)
- [ ] 재해복구 시뮬레이션 (백업 복원)

### 예상 작업 시간 / 견적 범위
- 6~12주 / 800~2,000만원+

---

## 💰 인프라 운영비 (모든 티어 별도, 고객 부담)

| 항목 | 비용 | 시작 티어 |
|---|---|---|
| 도메인 등록 | 연 1.5~3만원 | 1단계 |
| Vercel Pro 호스팅 | 월 $20 (~3만원) | 1~5단계 권장 |
| Supabase Free | 0원 | 2단계 시작 |
| Supabase Pro | 월 $25 (~3.5만원, 자동 백업) | 3단계+ |
| SendGrid 메일 | 월 100통 무료, 이후 $19~ | 2단계+ |
| 솔라피 SMS | 건당 9~30원 | 3단계+ |
| 솔라피 알림톡 | 건당 7~10원 | 3단계+ |
| PG 수수료 | 결제액의 2.5~3.3% | 4단계+ |
| 사이버배상책임보험 | 연 30~80만원 (권장) | 4단계+ |

부담 주체는 intake 14번 답변 기준:
- **고객 명의 직접 가입·결제** (소유권 명확)
- **제작자 통합 운영** (월 유지보수료에 포함)

---

## 💳 결제 방식 (제작비용 분할)

| 방식 | 적용 | 비율 |
|---|---|---|
| 일시불 | 1~2단계 소규모 | 100% (완료 후) |
| 50:50 | 일반적 | 계약 50% + 인수인계 50% |
| 30:40:30 | 4~5단계 | 계약 30% + 중간컨펌 40% + 인수인계 30% |

---

## 📦 모든 티어 완료 후 인계 절차

### Claude 산출물
- [ ] `README.md` — 프로젝트 개요, 로컬 실행
- [ ] `docs/OPERATIONS.md` — 일일 운영 매뉴얼
- [ ] `docs/ADMIN.md` — 관리자 페이지 사용법
- [ ] `docs/INCIDENT.md` — 장애 대응 (로그 위치·확인 항목)
- [ ] `.env.example` — 모든 환경변수 키
- [ ] `docs/EXTERNAL_ACCOUNTS.md` — 외부 계정 리스트와 소유자

### 사용자에게 회신할 최종 보고서 양식
```markdown
## ✅ {회사명} 홈페이지 빌드 완료 ({티어}단계)

### 배포 정보
- 도메인: https://...
- 관리자 페이지: https://.../admin
- 첫 관리자 계정: {이메일} (비밀번호 별도 안내)

### 외부 작업 잔여 ({N}건)
1. ...

### 운영 매뉴얼
- 일일 점검: docs/OPERATIONS.md
- 장애 대응: docs/INCIDENT.md

### 모니터링
- 로그: Vercel Dashboard > {project} > Logs
- DB: Supabase Dashboard > {project} > Logs
- 결제: PG 콘솔 / Sentry

### 다음 단계 권장
- [티어 업그레이드 가능성 안내]
```

---

## 변경 이력
| 날짜 | 변경 | 작성 |
|------|------|------|
| 2026-05-13 | 초안 작성 | Claude |
| 2026-05-13 | /intake/details 정합성 보완 — 3단계 결제 완전 분리, 공통+1~5단계 누락 항목 전체 추가 | Claude |
| 2026-05-13 | **구현 검증 상태 마커(✅⚠️❌) 전 항목 추가** — A1STUDIO 코드베이스 실제 점검 기준. ❌ 항목은 신규 개발 일정·견적 가산 필수 | Claude |
