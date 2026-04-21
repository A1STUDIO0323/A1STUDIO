# A1 STUDIO 웹사이트 - 완전한 프로젝트 컨텍스트

> 이 문서는 A1 STUDIO 웹사이트의 전체 구조, 기능, 코드베이스를 다른 AI 어시스턴트(GPT, Claude 등)에게 전달하기 위한 포괄적인 가이드입니다.

---

## 📋 프로젝트 개요

**프로젝트명**: A1 STUDIO 웹사이트  
**목적**: 보컬·댄스·연기·뮤지컬 연습실 예약 및 관리 플랫폼  
**주소**: 서울시 송파구 문정동 70-13 B1  
**연락처**: 010-5401-0732 (24시간 운영)  
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
  "결제": ["Kakao Pay (포인트 충전 & 파티룸)", "Toss Payments (준비중)"],
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
POST /api/reservations/create            # 예약 생성
POST /api/reservations/cancel            # 예약 취소
POST /api/reservations/holds/expire      # 만료된 HOLD 정리

파티룸 API (신규)
GET  /api/party-room/reservations/available # 파티룸 예약 가능 시간 조회
POST /api/party-room/reservations/create    # 파티룸 예약 생성
POST /api/party-room/reservations/cancel    # 파티룸 예약 취소
POST /api/party-room/payments/kakao/ready   # 카카오페이 결제 준비
GET  /api/party-room/payments/kakao/approve # 카카오페이 결제 승인
GET  /api/party-room/payments/kakao/fail    # 결제 실패
GET  /api/party-room/payments/kakao/cancel  # 결제 취소

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

**포인트 기반 즉시 확정 예약**

```
1. 사용자가 날짜 + 시간 선택 (/booking)
2. GET /api/reservations/available?date=2026-04-15
   → 이미 예약된 시간대 + BlockedSlot 조회
3. 예약 가능 확인 후 "예약하기" 클릭
4. POST /api/reservations/create
   - 포인트 잔액 확인
   - use_points() RPC 호출 (Atomic 차감)
   - Reservation 생성 (status: "confirmed")
   - SMS 발송 (예약 확정 알림)
5. 리다이렉트 → /booking/complete?id={reservationId}&points={차감포인트}
```

### 4. 예약 프로세스 (파티룸)

**카카오페이 직접 결제**

```
1. 사용자가 날짜 + 시간 + 옵션 선택 (/party-room/booking)
2. GET /api/party-room/reservations/available?date=2026-04-15
   → 예약된 시간대 조회
3. "결제하기" 클릭
4. POST /api/party-room/payments/kakao/ready
   - PaymentLock 생성 (중복 방지)
   - 카카오페이 결제 준비
   - next_redirect_pc_url로 리다이렉트
5. 카카오페이 결제 승인
6. GET /api/party-room/payments/kakao/approve?pg_token=...
   - Reservation 생성 (status: "PAID")
   - Payment 생성
   - SMS 발송
   - PaymentLock 삭제
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

```typescript
// src/lib/refund-policy.ts

export const REFUND_POLICY = {
  cancellationDeadlineHours: 2,  // 예약 시작 2시간 전까지만 취소 가능
};

// src/app/api/reservations/cancel/route.ts
// 프로세스:
// 1. 예약 조회 (status === 'confirmed' 확인)
// 2. 시작 시간 체크 (now + 2시간 < reservation_start)
// 3. 예약 업데이트 (status = 'cancelled', refund_points = points_used)
// 4. 포인트 환불:
//    - user_points.balance += points_used
//    - user_points.total_used -= points_used
//    - point_transactions INSERT (type: 'refund')
// 5. SMS 발송 (취소 확인)
```

### 7. SMS 발송 시스템

```typescript
// src/lib/sms.ts

// 지원 프로바이더: SOLAPI, COOLSMS
// 환경변수 SMS_PROVIDER로 선택 ("auto" 기본값)

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
// src/lib/payment-lock.ts

// 동시 결제 방지 (중복 결제 차단)
export async function createPaymentLock(
  userId: string,
  lockType: 'charge' | 'reservation' | 'party-room',
  lockKey: string,
  expiresInMinutes: number = 10
): Promise<boolean>

export async function deletePaymentLock(
  userId: string,
  lockType: string,
  lockKey: string
): Promise<void>

export async function cleanupExpiredLocks(): Promise<void>
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
4. 전화: 010-5401-0732, 운영시간 00:00–24:00

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
GOOGLE_CLIENT_SECRET="..."
NEXT_PUBLIC_GOOGLE_CONFIGURED="true"

# ── Kakao OAuth ──
AUTH_KAKAO_ID="..."
AUTH_KAKAO_SECRET="..."
BETTER_AUTH_SECRET="..."
NEXT_PUBLIC_KAKAO_CONFIGURED="true"

# ── 결제 (Toss) ──
NEXT_PUBLIC_TOSS_CLIENT_KEY=""
TOSS_SECRET_KEY=""

# ── 결제 (KakaoPay) ──
KAKAOPAY_SECRET_KEY="..."
KAKAOPAY_CID="TC0ONETIME"                # 포인트 충전용
KAKAOPAY_PARTY_CID="TC0ONETIME"          # 파티룸 직접 결제용

# ── SendGrid ──
SENDGRID_API_KEY="..."
CONTACT_TO_EMAIL="..."
CONTACT_FROM_EMAIL="..."

# ── SMS (SOLAPI - 주력) ──
SMS_PROVIDER="auto"
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
export const STUDIO_PHONE = "010-5401-0732";
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
│   │       │   ├── create/route.ts
│   │       │   ├── cancel/route.ts
│   │       │   ├── available/route.ts
│   │       │   └── holds/expire/route.ts
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
│       ├── kakaopay.ts                     # 카카오페이 API
│       ├── payment-lock.ts                 # 결제 락
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
├── AI_TRANSFER_PROMPT.md                   # AI 전달 프롬프트 (최신)
├── HOMEPAGE_SPECIFICATION.md               # 홈페이지 상세 명세
├── KAKAO_CONSENT_SETUP.md                  # 카카오 동의 설정
├── VERCEL_DEPLOY.md                        # Vercel 배포 가이드
├── MOBILE_ACCESS.md                        # 모바일 접속 가이드
└── docs/
    └── SMS_SETUP.md                        # SMS 설정 가이드
```

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
- ✅ 라우트 가드 미들웨어 (인증 & 온보딩 체크, Prisma 기반)
- ✅ 예약 시스템 (연습실 - 포인트 결제)
- ✅ 파티룸 예약 (카카오페이 직접 결제)
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
- ✅ 카카오페이 결제 연동 (포인트 충전 + 파티룸)
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
- `exchangeCodeForSession` 성공 후 `supabase.auth.getUser()`로 확정된 사용자에 대해, **`user.id` = `auth.users.id`**로 `prisma.user.upsert` 실행 (email, name, avatarUrl, provider — `/api/members/sync`와 동일한 metadata 매핑 헬퍼 사용).
- **카카오**에서 이름·출생연도·전화번호 등 추가 반영: 서버 내부 `fetch('/api/members/profile')` 호출 **제거** (같은 요청에서 세션 쿠키가 내부 fetch에 안 실려 401이 나기 쉬움) → **`prisma.user.update`**로 동일 핸들러 내 직접 갱신.
- upsert/update 실패 시 `console.error`만 남기고 **리다이렉트(`next`) 흐름은 유지**.

### 2. 카카오 `signInWithOAuth` — `scopes` 문자열 (`src/lib/auth-client.tsx`, `src/app/signup/page.tsx`)
- **진입점**: `/login`은 `signIn('kakao', …)` → `auth-client.tsx`의 `signInWithOAuth`; `/signup`은 `signup/page.tsx`에서 직접 `signInWithOAuth`.
- Supabase Auth(GoTrue)는 `options.scopes`에 **공백으로 구분된 scope 목록**을 기대함. 쉼표-only 문자열은 authorize 단계에서 Kakao와 맞지 않을 수 있어 **`name birthyear phone_number`** 형태(공백 구분)로 통일.
- **`openid` scope**: Kakao Developers 앱에서 **OpenID Connect가 꺼져 있으면** `openid` 요청 시 **KOE205 / invalid_scope**가 발생할 수 있음 → 운영에서는 **`openid`를 넣지 않음**. ID 토큰·OIDC가 필요하면 **카카오 콘솔에서 OpenID Connect 활성화** 후 코드에 `openid`를 다시 넣는 방식으로 검토.

---

**작성일**: 2026-04-21  
**버전**: 2.6 (최신)  
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
