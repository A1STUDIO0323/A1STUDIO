# A1 STUDIO 홈페이지 - AI 컨텍스트 프롬프트

이 문서는 A1 STUDIO 웹사이트의 전체 구조와 정보를 GPT/Claude 등 AI 어시스턴트에게 전달하기 위한 포괄적인 컨텍스트입니다.

---

## 📋 프로젝트 개요

**프로젝트명**: A1 STUDIO 웹사이트  
**목적**: 보컬·댄스·연기·뮤지컬 연습실 소개 및 예약 플랫폼  
**위치**: 서울시 송파구 문정동 70-13 B1  
**연락처**: 010-5401-0732 (24시간 운영)  
**특징**: 15평 단독 공간, 4가지 용도 활용 가능

---

## 🛠 기술 스택

### 프론트엔드
- **Next.js 16.1.6** (App Router)
- **React 19.2.3**
- **TypeScript 5**
- **Tailwind CSS 4** (@tailwindcss/postcss)
- **Motion (Framer Motion) 12.38.0** - 스크롤/인터랙션 애니메이션
- **Lucide React 0.576.0** - 아이콘 라이브러리

### 백엔드 & 데이터베이스
- **Prisma 7.4.2** (ORM)
- **PostgreSQL** (Supabase 호스팅)
- **Supabase Auth** (@supabase/ssr 0.9.0, @supabase/supabase-js 2.100.1)
- **pg, postgres** - PostgreSQL 드라이버

### 유틸리티
- **date-fns 4.1.0** - 날짜 처리
- **zod 4.3.6** - 스키마 검증
- **clsx, tailwind-merge** - 클래스 병합
- **bcryptjs** - 비밀번호 해싱
- **@sendgrid/mail 8.1.6** - 이메일 발송

---

## 🎨 디자인 시스템

### 브랜드 컬러 팔레트
```css
/* 배경 */
--color-bg:           #F7F3EB  /* 밀키 화이트 (페이지 기본 배경) */
--color-surface:      #EFE7DA  /* 크림 아이보리 (카드/패널) */
--color-border:       #D8CCBC  /* 밝은 베이지 오크 (보더/구분선) */

/* 텍스트 */
--color-text:         #3B342F  /* 딥 토프 (본문/제목) */
--color-text-muted:   #6f655d  /* 웜 뉴트럴 (보조 텍스트) */
--color-text-subtle:  #9b9189  /* 소프트 그레이 (힌트/플레이스홀더) */
--color-text-lighter: #b0a89e  /* 매우 밝은 그레이 */

/* 강조 */
--color-accent:       #B98768  /* 뮤트 클레이 (CTA/강조) */
--color-accent-hover: #a9785c  /* 강조 hover */
```

### 타이포그래피
- **Sans-serif**: Geist (본문, UI)
- **Serif**: Cormorant Garamond (장식적 타이틀)
- **Korean Serif**: Noto Serif KR (한글 세리프)

### 디자인 원칙
- **프리미엄 미니멀**: 차분하고 세련된 웜 톤
- **부드러운 곡선**: rounded-xl (12px), rounded-2xl (16px)
- **섬세한 효과**: 글로우, 그림자, 블러, backdrop-blur
- **예술적 감성**: 베이지/크림 톤 중심, 자연스러운 애니메이션

---

## 🗄 데이터베이스 스키마 (Prisma + PostgreSQL)

### 인증 관련
```prisma
model User {
  id        String   @id @db.Uuid
  email     String?  @unique
  name      String?
  avatarUrl String?
  provider  String?  // "google", "kakao", "email"
  createdAt DateTime
  updatedAt DateTime
}

model EmailAuthUser {
  email        String   @id
  passwordHash String
  name         String?
}

model PasswordResetToken {
  token     String   @id
  email     String
  expiresAt DateTime
  usedAt    DateTime?
}
```

### 연습실 & 예약
```prisma
model Room {
  id          String
  name        String
  slug        String   @unique
  description String?
  capacity    Int
  sizeM2      Float
  amenities   Json     // ["전신거울", "전자피아노", ...]
  images      Json     // ["/연습실.jpg", ...]
  isActive    Boolean
}

model PricingRule {
  id            String
  roomId        String
  label         String   // "평일 비피크", "주말 피크타임" 등
  dayOfWeekMask Int      // 비트마스크 (Sun=1, Mon=2, ..., Sat=64)
  timeStart     String   // "00:00"
  timeEnd       String   // "18:00"
  pricePerHour  Int
  minHours      Int
  isPackage     Boolean
  packageName   String?
  packageHours  Int?
  packagePrice  Int?
}

enum ReservationStatus {
  HOLD      // 임시 예약 (10분)
  PAID      // 결제 완료
  CANCELLED // 취소됨
  EXPIRED   // 만료
  REFUNDED  // 환불 완료
}

model Reservation {
  id          String
  roomId      String
  userId      String?
  guestName   String
  guestPhone  String
  guestEmail  String?
  date        String   // "YYYY-MM-DD"
  startTime   String   // "HH:MM"
  endTime     String   // "HH:MM"
  headcount   Int
  status      ReservationStatus
  totalAmount Int
  memo        String?
  authCode    String?  // 비회원 조회용
}

model ReservationHold {
  id            String
  reservationId String   @unique
  roomId        String
  date          String
  startTime     String
  endTime       String
  expiresAt     DateTime  // 10분 후 자동 만료
}

model BlockedSlot {
  id        String
  roomId    String
  date      String
  startTime String
  endTime   String
  reason    String
}
```

### 결제
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
  id                 String
  reservationId      String   @unique
  provider           String   // "toss", "kakao"
  providerPaymentKey String?
  orderId            String   @unique
  amount             Int
  status             PaymentStatus
  requestedAt        DateTime
  approvedAt         DateTime?
  rawResponse        Json?
}

enum RefundStatus {
  REQUESTED
  APPROVED
  REJECTED
}

model Refund {
  id          String
  paymentId   String
  amount      Int
  reason      String
  status      RefundStatus
  processedAt DateTime?
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
  id              String
  title           String
  teacherName     String
  teacherProfile  String   @db.Text
  teacherImage    String?
  classType       String   // "VOCAL", "DANCE", "ACT", "MUSICAL"
  description     String   @db.Text
  desiredDate     DateTime
  durationMinutes Int      @default(120)
  minHeadcount    Int      @default(8)
  maxHeadcount    Int      @default(15)
  pricePerPerson  Int
  status          OneDayClassStatus
  confirmedDate   DateTime?
  isPublished     Boolean
}

model OneDayClassApplication {
  id          String
  classId     String
  userId      String?
  guestName   String
  guestPhone  String
  guestEmail  String?
  headcount   Int      @default(1)
  message     String?
  isCancelled Boolean  @default(false)
}
```

### 후기, 공지, 이벤트
```prisma
model Review {
  id            String
  reservationId String   @unique
  rating        Int
  content       String
  nickname      String?
  isVisible     Boolean  @default(false)
}

model Notice {
  id          String
  title       String
  content     String
  isPublished Boolean  @default(false)
  isPinned    Boolean  @default(false)
}

model Event {
  id          String
  title       String
  content     String
  thumbnail   String?
  startsAt    DateTime?
  endsAt      DateTime?
  isPublished Boolean  @default(false)
}
```

---

## 🌐 페이지 구조 & API 엔드포인트

### 주요 페이지
```
/                           # 홈페이지 (히어로 스크롤, 소개, 갤러리, 가격 등)
/spaces                     # 연습실 목록
/spaces/[id]                # 연습실 상세 (라이트박스 갤러리)
/pricing                    # 요금안내 상세
/guide                      # 이용안내
/availability               # 실시간 예약 현황
/booking                    # 예약하기 (달력 + 시간 선택)
/booking/complete           # 예약 완료
/booking/payment/...        # 결제 프로세스 (Toss, Kakao)
/reviews                    # 후기 목록
/notices                    # 공지사항
/events                     # 이벤트
/one-day-class              # 원데이클래스 공고
/one-day-class/requests     # 클래스 요청
/one-day-class/announcements # CM(클래스마스터) 공고 등록
/contact                    # 문의하기
/location                   # 오시는 길
/login                      # 로그인 (Google/Kakao OAuth)
/signup                     # 회원가입 (현재 리다이렉트)
/forgot-password            # 비밀번호 찾기
/reset-password             # 비밀번호 재설정
/onboarding/phone           # 휴대폰 인증
/onboarding/profile         # 추가 정보 입력 (생년월일 등)
/mypage                     # 마이페이지 (포인트, 예약내역, 계정)
/charge                     # 포인트 충전
/charge/success             # 충전 완료
/charge/cancel              # 충전 취소
/charge/fail                # 충전 실패
/dashboard                  # 사용자 대시보드
/admin                      # 관리자 대시보드
/admin/members              # 회원 관리
/admin/class-requests       # 클래스 요청 관리
```

### API 엔드포인트
```
# 인증
POST /api/auth/email-signup
POST /api/auth/password-reset/request
POST /api/auth/password-reset/confirm
POST /api/auth/sms/send-code
POST /api/auth/sms/verify-code
GET  /auth/callback            # OAuth 콜백

# 예약
GET  /api/reservations         # 예약 목록
GET  /api/reservations/available # 사용 가능한 시간 조회
POST /api/reservations/create  # 예약 생성
POST /api/reservations/cancel  # 예약 취소
POST /api/reservations/holds/expire # 만료된 HOLD 정리

# 결제 (Toss)
POST /api/payments/toss/confirm
POST /api/payments/toss/webhook

# 결제 (Kakao)
POST /api/payments/kakao/ready
POST /api/payments/kakao/approve

# 포인트 충전 (Kakao Pay)
POST /api/charge/ready         # 결제 준비
GET  /api/charge/approve       # 결제 승인 (콜백)

# 회원
GET  /api/members/profile
POST /api/members/profile
POST /api/members/sync
POST /api/members/withdraw

# 관리자
POST /api/admin/auth
GET  /api/admin/dashboard
GET  /api/admin/members
POST /api/admin/members/actions

# 원데이클래스
GET  /api/one-day-class
POST /api/one-day-class

# 공지/이벤트/후기
GET  /api/notices
GET  /api/events
GET  /api/reviews (미구현)

# 문의
POST /api/contact

# 회원 등급
GET  /api/member-roles/role
```

---

## 🎯 핵심 비즈니스 로직

### 1. 가격 체계 (2026년 4월 이벤트 기준)

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

// 이벤트 기간: 2026-04-08부터 계속
function isEventPeriod(date: Date): boolean
function getPriceType(date: Date, startTime: string): PriceType
function calcPoints(date: Date, startTime: string, endTime: string): number
```

### 2. 예약 프로세스

```
1. 사용자가 날짜 + 시간 선택 (/booking)
2. GET /api/reservations/available?date=2026-04-15
   → 이미 예약된 시간대 반환
3. 사용자가 "예약하기" 클릭
4. POST /api/reservations/create
   - 포인트 차감 (use_points RPC 호출)
   - Reservation 생성 (status: "confirmed")
   - ReservationHold 없음 (포인트 결제는 즉시 확정)
5. 리다이렉트 → /booking/complete?id={reservationId}&points={차감포인트}
```

### 3. 포인트 시스템 (Supabase RLS + PostgreSQL Function)

```sql
-- Supabase 테이블
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
  -- 잔액 확인 + 차감
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

  -- 트랜잭션 기록
  INSERT INTO point_transactions (user_id, type, amount, balance_after, description)
  VALUES (p_user_id, 'use', p_points, o_new_balance, p_description)
  RETURNING id INTO o_transaction_id;

  o_success := TRUE;
END;
$$ LANGUAGE plpgsql;
```

### 4. 카카오페이 충전 프로세스

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
//    - charge_packages에서 패키지 정보 조회
//    - kakaopay.readyPayment() 호출 → tid 받기
//    - 쿠키에 tid, partner_order_id, package_id 저장
//    - next_redirect_pc_url로 리다이렉트
// 2. 사용자가 카카오페이에서 결제 승인
// 3. GET /api/charge/approve?pg_token=...
//    - 쿠키에서 tid, package_id 읽기
//    - kakaopay.approvePayment() 호출
//    - Supabase 트랜잭션:
//      a. user_points 업데이트 (balance += points + bonus)
//      b. point_transactions INSERT (type: 'charge')
//      c. point_transactions INSERT (type: 'bonus') if bonus > 0
//    - 리다이렉트 → /charge/success?points={총충전포인트}
```

### 5. 예약 취소 & 환불 정책

```typescript
// src/app/api/reservations/cancel/route.ts

// 정책:
// - 예약 시작 2시간 전까지만 취소 가능
// - 취소 시 사용한 포인트 전액 환불

// 프로세스:
// 1. 예약 조회 (status === 'confirmed' 확인)
// 2. 시작 시간 체크 (now + 2시간 < reservation_start)
// 3. 예약 업데이트 (status = 'cancelled', refund_points = points_used)
// 4. 포인트 환불:
//    - user_points.balance += points_used
//    - user_points.total_used -= points_used
//    - point_transactions INSERT (type: 'refund')
```

### 6. 회원 등급 시스템

```typescript
// 로컬 스토리지 기반 (간단한 MVP)
// src/lib/member-role.ts

type MemberRole = "NONE" | "CM"; // CM = Class Master (클래스마스터)

// CM 권한:
// - 원데이클래스 공고 등록 (/one-day-class/announcements)
// - 클래스 요청 확인 불가 (일반 회원 전용)

// 일반회원 권한:
// - 클래스 요청 등록 (/one-day-class/requests)
// - 클래스 공고 신청
```

---

## 🎬 홈페이지 섹션 상세

### 1. HeroScroll (히어로 스크롤)
- **높이**: 300vh (3배수 스크롤)
- **배경 전환**: #0f0e0d (다크) → #F7F3EB (라이트)
- **애니메이션 시퀀스**:
  1. **0~30%**: A1 STUDIO 로고 표시, 페이드아웃 + 축소 + 상단 이동
  2. **16~46%**: 스튜디오 정보 오버레이 (반투명 글래스 패널)
  3. **24~62%**: "One Space · Four Uses" 미리보기 카드 (4칸 그리드)

### 2. StudioIntro (스튜디오 소개)
- 라벨: "Premium Practice Studio"
- 타이틀: "A1 STUDIO"
- 서브타이틀: "보컬·댄스·연기·뮤지컬 연습실"
- 주소 및 교통, 비품 정보

### 3. AboutSection (대표 소개)
- 대표 사진 플레이스홀더 (3:4 비율)
- 주요 출연작 그리드 (15개 뮤지컬):
  - 2011 삼총사, 2013 The Promise, 2016 맘마미아
  - 2017 맨 오브 라만차, 2019 킹키부츠, 2020 프랑켄슈타인
  - 2021 마리 앙투아네트, 2022 레베카, 2023 엘리자벳
  - 2024 지킬앤하이드, 2024 라흐마니노프, 2024 시라노
  - 2024 웃는 남자, 2025 미드나잇 인 파리, 2025 슈가
- 클래스 철학 3개 카드:
  1. 현장의 감각을 그대로
  2. 누구나 부담 없이
  3. 한 번에도 분명한 성취

### 4. 활용 용도 (One Space · Four Uses)
1. **VOCAL (보컬)** - Mic2 아이콘
   - "전자피아노로 반주하며 보컬 연습"
2. **DANCE (댄스)** - Music2 아이콘
   - "전신거울 앞에서 안무 연습"
3. **ACT (연기)** - Clapperboard 아이콘
   - "촬영용 조명·삼각대로 셀프 촬영·연기 연습"
4. **MUSICAL (뮤지컬)** - Star 아이콘
   - "전자피아노·전신거울로 뮤지컬 연습"

### 5. 구비 비품 (Equipment)
1. 전신 거울 - "댄스·연기·뮤지컬 연습 필수"
2. 촬영용 조명 - "영상·사진 촬영 가능"
3. 삼각대 - "스마트폰·카메라 거치"
4. 전자피아노 - "보컬·뮤지컬 반주 연습"
5. 요가매트 - "몸풀기·스트레칭"
6. 폼롤러 - "근막이완·근육 회복"

### 6. GallerySection (갤러리)
- **이미지 5장**:
  - `/연습실.jpg` (메인, 2×2 큰 영역, "A1 Room · 15평 단독 공간" 오버레이)
  - `/1.jpg`, `/2.jpg`, `/3.jpg`, `/8.jpg` (서브)
- **라이트박스 기능**:
  - 클릭 시 전체화면 모달
  - 좌우 화살표 네비게이션
  - 키보드 (←/→/Esc) 지원
  - 이미지 카운터 표시 (예: 1/5)

### 7. PricingSummary (요금 요약) - 오픈 이벤트
- **오픈 이벤트 배너**: 2026-04-08부터 계속 표시
- **4개 카드** (sm: 2열, xl: 4열):
  1. **평일 비피크** (월~금 00:00~18:00)
     - 원가: ~~9,000원~~ → **7,000원/시간**
     - 2시간: ~~14,000원~~ → **13,000원**
     - 하이라이트: "조용한 오전·오후 시간대", "최소 1시간부터 예약 가능"
  
  2. **평일 피크타임** (월~금 18:00~00:00)
     - 원가: ~~11,000원~~ → **9,000원/시간**
     - 2시간: ~~18,000원~~ → **17,000원**
     - 하이라이트: "퇴근 후 저녁 타임", "심야(23시 이후) 이용 가능"
  
  3. **주말/공휴일 비피크** [인기 배지] (토·일·공휴일 00:00~13:00)
     - 원가: ~~10,000원~~ → **8,000원/시간**
     - 2시간: ~~16,000원~~ → **15,000원**
     - 하이라이트: "여유로운 오전 타임"
  
  4. **주말/공휴일 피크타임** (토·일·공휴일 13:00~00:00)
     - 원가: ~~12,000원~~ → **10,000원/시간**
     - 2시간: ~~20,000원~~ → **19,000원**
     - 하이라이트: "주말 오후·저녁 집중 타임"

- **안내**: "* 이용 시간에는 준비 및 정리 시간이 포함됩니다."

### 8. ReviewsPreview (후기 미리보기)
- 후기 카드 슬라이더 또는 그리드
- `/reviews` 페이지로 연결

### 9. LocationSection (오시는 길)
- **지도**: 네이버 지도 임베드 (또는 플레이스홀더)
- **교통정보 카드 4개**:
  1. 주소: 서울시 송파구 문정동 70-13 B1
  2. 대중교통: 8호선 문정역(도보 8분), 장지역(도보 10분)
  3. 주차: 건물 주차 가능, 인근 공영주차장
  4. 전화: 010-5401-0732, 운영시간 00:00–24:00

### 10. 하단 CTA 배너
- "오늘 연습, 지금 예약하세요"
- "실시간 예약현황 확인 · 10분 내 결제 · 즉시 확정"
- 버튼: 현재 비활성화 (예약 시스템 준비 중)

---

## 🎨 주요 컴포넌트

### 레이아웃
- **Header**: sticky 네비게이션, 로고, 메뉴, 포인트 잔액 표시 (로그인 시)
- **Footer**: 스튜디오 정보, 소셜 링크, 저작권
- **StickyBookingCTA**: 스크롤 시 하단 고정 예약 버튼

### 애니메이션
- **FadeInSection**: viewport 진입 시 fadeUp (opacity 0→1, y: 32→0)
- **HeroScroll**: useScroll + useTransform (스크롤 진행도 → CSS 변환)
- **useReducedMotion**: 접근성 고려 (사용자 설정 감지)

### 폼
- **입력 필드 label 추가됨** (PC/모바일 모두):
  - `/onboarding/profile`: 이메일, 생년월일, 전화번호
  - `/onboarding/phone`: 휴대폰 번호, 인증번호
  - `/forgot-password`: 가입한 이메일
  - `/reset-password`: 새 비밀번호, 비밀번호 확인

---

## 🔐 인증 & 환경 변수

### Supabase Auth
- **OAuth**: Google, Kakao (Supabase Providers 활성화 필요)
- **Phone OTP**: SMS 인증 (NEXT_PUBLIC_PHONE_OTP_ENABLED="true")
- **Email/Password**: EmailAuthUser 테이블 (별도 관리)

### 환경 변수 (.env.local)
```bash
# 데이터베이스
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Supabase 클라이언트
NEXT_PUBLIC_SUPABASE_URL="https://czscrcsaoefoqpynpbyv.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."

# 앱 설정
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_BOOKING_ENABLED="false"
NEXT_PUBLIC_PHONE_OTP_ENABLED="true"

# 관리자
ADMIN_PASSWORD="..."

# OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
NEXT_PUBLIC_GOOGLE_CONFIGURED="true"

AUTH_KAKAO_ID="..."
AUTH_KAKAO_SECRET="..."
BETTER_AUTH_SECRET="..."
NEXT_PUBLIC_KAKAO_CONFIGURED="true"

# 결제
NEXT_PUBLIC_TOSS_CLIENT_KEY="..."
TOSS_SECRET_KEY="..."
KAKAOPAY_SECRET_KEY="..."
KAKAOPAY_CID="TC0ONETIME"

# 이메일
SENDGRID_API_KEY="..."
CONTACT_TO_EMAIL="..."
CONTACT_FROM_EMAIL="..."
```

---

## 📱 반응형 디자인

### 브레이크포인트
- **모바일**: < 640px
- **sm**: ≥ 640px (태블릿)
- **md**: ≥ 768px
- **lg**: ≥ 1024px (데스크톱)
- **xl**: ≥ 1280px

### 패턴
1. **그리드**: 1~2열 (모바일) → 3~4열 (데스크톱)
2. **타이포그래피**: text-sm (모바일) → text-lg (데스크톱)
3. **패딩/마진**: p-4/py-14 (모바일) → p-6/py-20 (데스크톱)

---

## 🚀 개발 & 배포

### 로컬 개발
```bash
npm run dev          # 개발 서버 (Webpack)
npm run dev:turbo    # 개발 서버 (Turbopack)
npm run build        # 프로덕션 빌드
npm start            # 프로덕션 서버
```

### Prisma
```bash
npm run db:push      # 스키마 → DB 동기화
npm run db:migrate   # 마이그레이션 생성/실행
npm run db:seed      # 시드 데이터 삽입
npm run db:studio    # Prisma Studio 실행
```

### Vercel 배포
1. **환경 변수 설정** (Dashboard → Settings → Environment Variables)
   - 모든 `NEXT_PUBLIC_*` 변수 추가
   - OAuth, 결제, DB 등 민감 정보 추가
2. **Supabase Redirect URL 추가**:
   - `https://your-domain.vercel.app/auth/callback`
3. **재배포**: git push 또는 Deployments → Redeploy

---

## 💡 추가 정보

### 주요 상수 (src/lib/constants.ts)
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
```

### 디자인 철학
1. **프리미엄 감성**: 차분한 베이지/크림 톤, 세련된 세리프
2. **명확한 정보 전달**: 직관적 섹션, 아이콘+텍스트 조화
3. **부드러운 인터랙션**: 자연스러운 페이드/슬라이드, 호버 효과
4. **접근성**: 시맨틱 HTML, 키보드 네비게이션, 애니메이션 감소 모드

### SEO & 최적화
- **next/image**: 이미지 최적화
- **next/font/google**: 폰트 최적화
- **metadata**: 각 페이지 SEO 설정
- **다크모드**: 현재 미지원 (브랜드 톤 고정)

---

## 📂 파일 구조

```
A1STUDIO/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # 홈페이지
│   │   ├── layout.tsx               # 루트 레이아웃
│   │   ├── globals.css              # 글로벌 스타일
│   │   ├── spaces/                  # 연습실 관련
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── booking/                 # 예약
│   │   │   ├── page.tsx
│   │   │   ├── complete/page.tsx
│   │   │   └── payment/...
│   │   ├── charge/                  # 포인트 충전
│   │   ├── mypage/page.tsx          # 마이페이지
│   │   ├── onboarding/              # 추가 정보 입력
│   │   │   ├── phone/...
│   │   │   └── profile/...
│   │   ├── one-day-class/           # 원데이클래스
│   │   ├── admin/                   # 관리자
│   │   └── api/                     # API Routes
│   │       ├── auth/...
│   │       ├── reservations/...
│   │       ├── payments/...
│   │       ├── charge/...
│   │       └── ...
│   ├── components/
│   │   ├── HeroScroll.tsx
│   │   ├── FadeInSection.tsx
│   │   ├── home/                    # 홈 섹션들
│   │   │   ├── StudioIntro.tsx
│   │   │   ├── AboutSection.tsx
│   │   │   ├── GallerySection.tsx
│   │   │   ├── PricingSummary.tsx
│   │   │   └── ...
│   │   └── layout/                  # 레이아웃 컴포넌트
│   │       ├── Header.tsx
│   │       ├── Footer.tsx
│   │       └── ...
│   └── lib/
│       ├── constants.ts             # 상수
│       ├── pricing.ts               # 가격 계산 로직
│       ├── kakaopay.ts              # 카카오페이 API
│       ├── supabase/                # Supabase 클라이언트
│       ├── auth-client.tsx          # 인증 Context
│       └── ...
├── prisma/
│   ├── schema.prisma                # DB 스키마
│   └── seed.ts                      # 시드 데이터
├── public/
│   ├── logo.png
│   ├── 연습실.jpg
│   ├── 1.jpg, 2.jpg, 3.jpg, 8.jpg
│   └── ...
├── .env.local                       # 로컬 환경 변수
├── .env                             # 공개 템플릿
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── HOMEPAGE_SPECIFICATION.md        # 상세 명세서
```

---

## 🎯 현재 상태 요약

### ✅ 구현 완료
- 반응형 홈페이지 (히어로 스크롤, 소개, 갤러리, 가격 등)
- 스튜디오/대표 소개, 용도/비품 안내
- 라이트박스 갤러리 (PC/모바일)
- 요금 안내 (이벤트 가격 적용)
- 인증 시스템 (Google/Kakao OAuth, Phone OTP)
- 포인트 충전 (Kakao Pay)
- 예약 시스템 (달력, 시간 선택, 포인트 결제)
- 마이페이지 (포인트, 예약내역, 계정)
- 예약 취소 & 환불
- 원데이클래스 (공고, 신청, 요청)
- 회원 등급 (CM)
- 관리자 대시보드 (기본)
- 문의하기, 공지/이벤트

### ⏳ 준비 중
- 네이버 지도 임베드 (현재 플레이스홀더)
- 고급 관리자 기능 (통계, 정산 등)
- 리뷰 시스템 (UI만 존재)
- 회원 탈퇴 처리

---

## 📋 사용 예시

이 프롬프트를 GPT/Claude에게 전달할 때:

```
아래는 A1 STUDIO 웹사이트의 전체 구조와 정보입니다.
이 컨텍스트를 바탕으로 [여기에 구체적인 요청 사항을 입력하세요].

[AI_CONTEXT_PROMPT.md 전체 내용 붙여넣기]
```

예시:
- "예약 시스템의 포인트 차감 로직을 개선해줘"
- "새로운 원데이클래스 신청 플로우를 추가해줘"
- "관리자 대시보드에 월별 매출 통계를 추가해줘"
- "카카오페이 외에 토스페이먼츠도 지원하도록 수정해줘"

---

**작성일**: 2026-04-11  
**버전**: 1.0  
**프로젝트**: A1 STUDIO (https://your-domain.vercel.app)
