import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "단계별 상세 안내 — 홈페이지 제작 의뢰",
  description: "A1STUDIO 홈페이지 제작 단계별 비용 산정 기준 상세 안내",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

type Tier = {
  emoji: string;
  title: string;
  oneliner: string;
  minPrice: string;
  maxPrice: string;
  duration: string;
  baseFeatures: string[];
  minScenario: { label: string; items: string[] };
  maxScenario: { label: string; items: string[] };
  priceFactors: { factor: string; addCost: string }[];
  notIncluded?: string[];
};

const TIERS: Tier[] = [
  {
    emoji: "🟢",
    title: "1단계 — 일반 소개 페이지",
    oneliner: "회사·매장을 인터넷에 알리고 문의 받는 정적 페이지",
    minPrice: "30만원",
    maxPrice: "200만원",
    duration: "3~7일",
    baseFeatures: [
      "반응형 (PC·태블릿·모바일)",
      "회사·매장 소개 섹션",
      "서비스/상품 안내 섹션",
      "오시는 길 (네이버 지도)",
      "문의 폼 또는 카톡 채널 연결",
      "푸터 사업자 정보 표기",
      "기본 SEO (검색엔진 최적화)",
      "1년 호스팅 포함",
    ],
    minScenario: {
      label: "💰 30만원 — 최소 비용 케이스",
      items: [
        "원페이지 (스크롤만으로 모든 정보)",
        "고객이 사진·로고·텍스트 모두 제공",
        "기존 템플릿 그대로 사용 (색상만 변경)",
        "1차 시안 컨펌 후 추가 수정 1회",
        "문의 폼은 이메일 발송만",
      ],
    },
    maxScenario: {
      label: "💎 200만원 — 최대 비용 케이스",
      items: [
        "5~7페이지 (홈/소개/서비스/포트폴리오/문의)",
        "고객 자료 부족 → 카피라이팅 대행",
        "전문 사진 촬영 또는 보정 작업",
        "맞춤 일러스트/아이콘 제작",
        "애니메이션·인터랙션 효과",
        "다국어 지원 (한국어/영어)",
        "구글/네이버 광고 픽셀 설치",
        "수정 횟수 무제한 (시안 단계)",
      ],
    },
    priceFactors: [
      { factor: "페이지 수가 많을수록", addCost: "+10~30만원/페이지" },
      { factor: "고객 자료 미비 (글·사진 제작 대행)", addCost: "+30~80만원" },
      { factor: "맞춤 디자인 (템플릿 미사용)", addCost: "+50~100만원" },
      { factor: "애니메이션·인터랙션", addCost: "+20~50만원" },
      { factor: "다국어 지원 (페이지당)", addCost: "+30만원" },
      { factor: "전문 촬영/보정", addCost: "+30~80만원 (외주)" },
    ],
    notIncluded: [
      "도메인 비용 (연 1.5~3만원, 별도)",
      "프로 호스팅 비용 (월 0~3만원, 1년 후부터)",
      "전문 카피라이터·사진가 (요청 시 외주 연결)",
    ],
  },
  {
    emoji: "🟡",
    title: "2단계 — 회원 + 게시판",
    oneliner: "회원가입·로그인·콘텐츠 관리가 필요한 사이트",
    minPrice: "100만원",
    maxPrice: "600만원",
    duration: "2~3주",
    baseFeatures: [
      "1단계 모든 기능 포함",
      "회원가입/로그인 (이메일 인증)",
      "비밀번호 찾기/재설정",
      "마이페이지 (정보 수정)",
      "공지사항 게시판 (CRUD)",
      "관리자 페이지 (회원·게시글 관리)",
      "권한 관리 (일반/관리자)",
      "Supabase DB 셋업 + RLS 보안",
    ],
    minScenario: {
      label: "💰 100만원 — 최소 비용 케이스",
      items: [
        "이메일 가입만 (소셜 로그인 X)",
        "게시판 1개 (공지사항)",
        "회원 등급 단일",
        "관리자 기능 기본 (목록·삭제)",
        "이미지 업로드 5MB 이하",
      ],
    },
    maxScenario: {
      label: "💎 600만원 — 최대 비용 케이스",
      items: [
        "카카오/네이버/구글 소셜 로그인 통합",
        "게시판 다수 (공지·후기·QnA·자료실)",
        "회원 등급 다중 (일반/VIP/정회원)",
        "댓글·좋아요·신고 시스템",
        "이미지 다수 업로드 + 자동 압축",
        "관리자 통계 대시보드",
        "이메일 발송 자동화 (가입·게시글 알림)",
        "개인정보처리방침 페이지",
      ],
    },
    priceFactors: [
      { factor: "소셜 로그인 (개당)", addCost: "+30~50만원" },
      { factor: "게시판 추가 (개당)", addCost: "+30~80만원" },
      { factor: "회원 등급 시스템", addCost: "+50~100만원" },
      { factor: "댓글·좋아요·신고", addCost: "+50~100만원" },
      { factor: "관리자 통계 대시보드", addCost: "+80~150만원" },
      { factor: "이메일 자동 발송 (SendGrid 연동)", addCost: "+30~60만원" },
      { factor: "휴대폰 본인인증", addCost: "+50만원 (외부 API)" },
    ],
  },
  {
    emoji: "🟠",
    title: "3단계 — 예약 시스템",
    oneliner: "캘린더 기반 예약·슬롯 관리·자동 알림이 핵심",
    minPrice: "400만원",
    maxPrice: "800만원",
    duration: "3~5주",
    baseFeatures: [
      "2단계 모든 기능 포함",
      "캘린더 UI (월/주/일 뷰)",
      "예약 슬롯 자동 관리 (중복 방지)",
      "예약 가능/불가능 시간 설정",
      "예약 신청·확인·취소",
      "취소·환불 정책 자동 적용",
      "예약 시 이메일 자동 발송",
      "관리자 예약 캘린더",
      "예약 통계 (일/주/월)",
    ],
    minScenario: {
      label: "💰 400만원 — 최소 비용 케이스",
      items: [
        "1가지 예약 항목 (예: 룸 1개)",
        "고정 시간 슬롯 (1시간 단위)",
        "단일 환불 정책",
        "이메일 알림만",
        "기본 캘린더 뷰 (1개)",
      ],
    },
    maxScenario: {
      label: "💎 800만원 — 최대 비용 케이스",
      items: [
        "복수 예약 항목 (룸 5개+, 강사 다수)",
        "유연한 슬롯 (15분/30분/시간 단위 동시)",
        "시점별 환불 정책 (당일/3일/7일 차등)",
        "카카오 알림톡 + SMS + 이메일",
        "예약 1시간 전 자동 리마인드",
        "노쇼 자동 차단 시스템",
        "회원 등급별 우선 예약권",
        "관리자 일괄 슬롯 생성/휴무 등록",
        "예약 변경 (날짜·시간 이동)",
      ],
    },
    priceFactors: [
      { factor: "복수 예약 항목 (룸/강사 등)", addCost: "+50~150만원" },
      { factor: "카카오 알림톡 연동", addCost: "+50~100만원 + 발송비/건" },
      { factor: "자동 리마인드 (Cron)", addCost: "+30~60만원" },
      { factor: "복잡한 환불 정책 (시점별 차등)", addCost: "+50~100만원" },
      { factor: "노쇼 차단 시스템", addCost: "+50만원" },
      { factor: "예약 변경/날짜 이동", addCost: "+50~100만원" },
      { factor: "다중 운영자 권한 분리", addCost: "+80만원" },
    ],
    notIncluded: [
      "알림톡 발송 비용 (건당 약 7~10원, 고객 부담)",
      "SMS 발송 비용 (건당 약 9~30원)",
      "카카오 비즈메시지 가입 (별도 절차)",
    ],
  },
  {
    emoji: "🔴",
    title: "4단계 — 결제 시스템",
    oneliner: "PG 연동, 자동 영수증, 환불 처리가 포함된 온라인 결제",
    minPrice: "600만원",
    maxPrice: "1,200만원",
    duration: "4~7주",
    baseFeatures: [
      "3단계 모든 기능 포함",
      "PG 1개 연동 (토스페이먼츠 또는 카카오페이)",
      "결제 금액 위변조 방지 검증",
      "주문서·결제 흐름 UI",
      "자동 영수증 발급",
      "환불 처리 (전액/부분)",
      "결제 내역 관리 페이지",
      "이용약관·개인정보처리방침·결제대행 동의",
      "사업자 정보 표기 (전자상거래법)",
    ],
    minScenario: {
      label: "💰 600만원 — 최소 비용 케이스",
      items: [
        "토스페이먼츠 1개 연동 (가장 단순)",
        "단일 상품 결제",
        "전액 환불만",
        "비회원 결제 X (회원만)",
        "기본 결제 내역 조회",
      ],
    },
    maxScenario: {
      label: "💎 1,200만원 — 최대 비용 케이스",
      items: [
        "다중 PG (토스 + 카카오 + 네이버페이)",
        "정기결제(구독) 관리 + 해지 흐름",
        "쿠폰·할인코드 시스템",
        "포인트·적립금 사용",
        "부분 환불 + 사유 분기",
        "비회원 결제 (주문번호+전화 인증)",
        "결제 실패 알림 (Slack/이메일)",
        "Sentry 에러 추적 연동",
        "일일 정산 리포트 자동 발송",
      ],
    },
    priceFactors: [
      { factor: "PG 추가 (개당)", addCost: "+150~300만원" },
      { factor: "정기결제(구독) 시스템", addCost: "+200~400만원" },
      { factor: "쿠폰·할인코드", addCost: "+100~200만원" },
      { factor: "포인트·적립금", addCost: "+150~250만원" },
      { factor: "복잡한 환불 (부분/사유별)", addCost: "+80~150만원" },
      { factor: "비회원 결제 흐름", addCost: "+50~100만원" },
      { factor: "Sentry 에러 추적", addCost: "+30만원" },
      { factor: "정산 리포트 자동화", addCost: "+50~100만원" },
    ],
    notIncluded: [
      "PG 가입 심사 (1~3주, 고객 직접)",
      "통신판매업 신고 (고객 사업자명의)",
      "PG 수수료 (결제액의 2.5~3.3%)",
      "사이버배상책임보험 (연 30~80만원, 권장)",
    ],
  },
  {
    emoji: "🟣",
    title: "5단계 — 풀 커스텀 플랫폼",
    oneliner: "정산·세금계산서·외부 API까지 포함한 본격 플랫폼",
    minPrice: "800만원",
    maxPrice: "2,000만원+",
    duration: "6~12주",
    baseFeatures: [
      "4단계 모든 기능 포함",
      "다중 PG 동시 운영 (라우팅)",
      "다중 사용자 권한 매트릭스",
      "정산 자동화 (판매자별 수수료)",
      "ERD·API 명세서 문서화",
      "Sentry + Vercel Analytics",
      "Supabase 자동 백업 + 외부 백업",
      "1개월 집중 AS",
    ],
    minScenario: {
      label: "💰 800만원 — 최소 비용 케이스",
      items: [
        "단일 사업자 정산",
        "기본 권한 (관리자/일반)",
        "외부 API 연동 1~2개",
        "기본 리포트 대시보드",
      ],
    },
    maxScenario: {
      label: "💎 2,000만원+ — 최대 비용 케이스",
      items: [
        "마켓플레이스형 (다수 판매자)",
        "세분화 권한 (5+ 역할)",
        "세금계산서 자동 발행 (포핀/팝빌)",
        "배송 API 연동 (CJ/우체국)",
        "재고 관리 + 자동 알림",
        "AI 추천 시스템",
        "PWA (모바일 앱처럼)",
        "다국어 + 다중 통화",
        "고급 통계 (코호트·퍼널)",
        "부하 테스트·재해복구 계획",
      ],
    },
    priceFactors: [
      { factor: "마켓플레이스 구조 (판매자 가입·정산)", addCost: "+500~1,000만원" },
      { factor: "세금계산서 API (포핀/팝빌)", addCost: "+150~300만원" },
      { factor: "배송 API 연동 (개당)", addCost: "+100~200만원" },
      { factor: "재고 관리 시스템", addCost: "+200~400만원" },
      { factor: "AI 추천 시스템", addCost: "+300~600만원" },
      { factor: "PWA 변환", addCost: "+150~300만원" },
      { factor: "다국어 (언어당)", addCost: "+100만원" },
      { factor: "다중 통화 + 환율 API", addCost: "+200만원" },
    ],
  },
];

const COMMON_PRICE_FACTORS = [
  { factor: "디자인 — 템플릿 사용 vs 맞춤 디자인", note: "맞춤은 +30~50%" },
  { factor: "수정 횟수 — 3회 vs 무제한", note: "무제한은 +20~30%" },
  { factor: "콘텐츠 — 고객 제공 vs 제작 대행", note: "대행 시 +30~80만원" },
  { factor: "촬영 — 기존 자료 vs 신규 촬영", note: "신규는 +30~80만원" },
  { factor: "긴급 일정 (정상 기간 절반)", note: "+30~50%" },
  { factor: "유지보수 — 1년 무상 vs 영구 무상", note: "영구는 +20~40%" },
];

const INFRA_COSTS = [
  { item: "도메인 등록", cost: "연 1.5~3만원", note: ".com / .co.kr / .kr 등" },
  { item: "Vercel 호스팅 (Pro)", cost: "월 $20 (~3만원)", note: "1~5단계 모두 권장" },
  { item: "Supabase (Free)", cost: "0원", note: "DB 500MB 미만, 2단계 시작" },
  { item: "Supabase (Pro)", cost: "월 $25 (~3.5만원)", note: "DB 8GB, 자동 백업, 3단계+" },
  { item: "SendGrid 메일", cost: "월 100통 무료, 이후 $19~", note: "2단계+" },
  { item: "솔라피 SMS", cost: "건당 9~30원", note: "3단계+ (예약 알림)" },
  { item: "솔라피 알림톡", cost: "건당 7~10원", note: "3단계+ (선택)" },
  { item: "PG 수수료", cost: "결제액의 2.5~3.3%", note: "4단계+ (고객 부담)" },
];

export default function IntakeDetailsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-2xl p-8 shadow-md">
          <Link
            href="/intake"
            className="inline-flex items-center gap-2 text-violet-100 hover:text-white text-sm mb-4 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            의뢰서로 돌아가기
          </Link>
          <h1 className="text-3xl font-bold mb-2">단계별 상세 안내</h1>
          <p className="text-violet-100 text-sm leading-relaxed">
            왜 같은 단계인데 가격 폭이 큰지 궁금하셨죠?<br />
            각 단계의 <strong>최소 비용 / 최대 비용 / 비용에 영향을 주는 요인</strong>을 정리했습니다.<br />
            <span className="text-violet-200">정확한 견적은 1차 상담 후 안내드립니다.</span>
          </p>
        </div>

        {/* 비용 변동 핵심 */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h2 className="font-bold text-lg text-amber-900 mb-3">📌 비용 폭이 큰 이유</h2>
          <ul className="text-sm text-amber-900 space-y-2 leading-relaxed">
            <li>
              ① <strong>같은 단계 안에서도 기능 옵션이 다양</strong>합니다. 예) 4단계의 PG 1개 vs 3개는 작업량이 3배.
            </li>
            <li>
              ② <strong>고객이 제공하는 자료 수준</strong>에 따라 결정됩니다. 글·사진 다 있으면 빠르고, 없으면 제작 대행 추가.
            </li>
            <li>
              ③ <strong>디자인 맞춤 정도</strong>가 큽니다. 검증된 템플릿 활용 vs 처음부터 맞춤 디자인.
            </li>
            <li>
              ④ <strong>일정</strong>이 영향을 줍니다. 정상 일정 vs 긴급 (+30~50%).
            </li>
            <li>
              ⑤ <strong>유지보수 범위</strong>도 견적에 포함됩니다. 1년 무상 / 영구 무상 / 월 정기 계약.
            </li>
          </ul>
        </div>

        {/* 단계별 카드 */}
        {TIERS.map((t) => (
          <div key={t.title} className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
            {/* 헤더 */}
            <div className="border-b border-zinc-100 bg-zinc-50/50 px-6 py-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">
                    {t.emoji} {t.title}
                  </h2>
                  <p className="text-sm text-zinc-600 mt-1">{t.oneliner}</p>
                </div>
                <div className="text-right">
                  <div className="text-violet-600 font-bold">
                    {t.minPrice} ~ {t.maxPrice}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">{t.duration}</div>
                </div>
              </div>
            </div>

            {/* 기본 포함 */}
            <Section title="✅ 기본 포함 사항">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-zinc-700">
                {t.baseFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 mt-0.5">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </Section>

            {/* 최소 / 최대 비교 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 py-4">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                <h3 className="font-bold text-emerald-900 text-sm mb-2">{t.minScenario.label}</h3>
                <ul className="space-y-1 text-xs text-emerald-900">
                  {t.minScenario.items.map((it) => (
                    <li key={it} className="flex items-start gap-1.5">
                      <span>•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-violet-50 border border-violet-200 p-4">
                <h3 className="font-bold text-violet-900 text-sm mb-2">{t.maxScenario.label}</h3>
                <ul className="space-y-1 text-xs text-violet-900">
                  {t.maxScenario.items.map((it) => (
                    <li key={it} className="flex items-start gap-1.5">
                      <span>•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 비용 가산 요인 */}
            <Section title="💸 비용에 영향을 주는 옵션">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-zinc-100">
                  {t.priceFactors.map((p) => (
                    <tr key={p.factor}>
                      <td className="py-2 text-zinc-700">{p.factor}</td>
                      <td className="py-2 text-right text-violet-600 font-medium whitespace-nowrap">{p.addCost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            {/* 미포함 */}
            {t.notIncluded && t.notIncluded.length > 0 && (
              <Section title="⚠️ 비용에 포함되지 않은 항목">
                <ul className="space-y-1 text-xs text-zinc-600">
                  {t.notIncluded.map((n) => (
                    <li key={n} className="flex items-start gap-1.5">
                      <span>•</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        ))}

        {/* 공통 비용 변동 요인 */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6">
          <h2 className="font-bold text-lg text-zinc-900 mb-4">⚙️ 모든 단계에 공통 적용되는 변동 요인</h2>
          <div className="space-y-2">
            {COMMON_PRICE_FACTORS.map((c) => (
              <div key={c.factor} className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-2 last:border-0">
                <span className="text-sm text-zinc-700">{c.factor}</span>
                <span className="text-xs text-zinc-500 whitespace-nowrap">{c.note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 인프라 운영비 */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6">
          <h2 className="font-bold text-lg text-zinc-900 mb-2">🌐 인프라 운영비 (별도, 고객 부담)</h2>
          <p className="text-xs text-zinc-500 mb-4">
            제작 비용과는 별도로, 사이트 운영을 위해 매월 발생하는 비용입니다. <br />
            고객 명의로 직접 가입·결제 또는 제작자가 통합 운영 (월 유지보수료에 포함) 중 선택 가능합니다.
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="text-left py-2 text-xs font-semibold text-zinc-500">항목</th>
                <th className="text-right py-2 text-xs font-semibold text-zinc-500">비용</th>
                <th className="text-left py-2 text-xs font-semibold text-zinc-500 pl-4">비고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {INFRA_COSTS.map((c) => (
                <tr key={c.item}>
                  <td className="py-2 text-zinc-700">{c.item}</td>
                  <td className="py-2 text-right text-violet-600 font-medium whitespace-nowrap">{c.cost}</td>
                  <td className="py-2 text-xs text-zinc-500 pl-4">{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 결제 방식 */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6">
          <h2 className="font-bold text-lg text-zinc-900 mb-3">💳 결제 방식 (분할 가능)</h2>
          <ul className="space-y-2 text-sm text-zinc-700">
            <li className="flex items-start gap-2">
              <span className="text-violet-600">•</span>
              <span>
                <strong>일시불</strong> — 작업 완료 후 일괄 결제 (소규모 1~2단계)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-600">•</span>
              <span>
                <strong>50:50</strong> — 계약 시 50%, 인수인계 시 50% (가장 일반적)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-600">•</span>
              <span>
                <strong>30:40:30</strong> — 계약 30%, 중간 컨펌 40%, 인수인계 30% (4~5단계)
              </span>
            </li>
          </ul>
        </div>

        {/* 견적 받는 법 */}
        <div className="bg-gradient-to-br from-violet-100 to-purple-100 border border-violet-200 rounded-2xl p-6 text-center">
          <h2 className="font-bold text-lg text-violet-900 mb-2">정확한 견적은 어떻게 받나요?</h2>
          <p className="text-sm text-violet-800 mb-4 leading-relaxed">
            의뢰서를 작성해 주시면 24시간 내 1차 상담 일정을 안내드립니다.<br />
            상담 후 <strong>맞춤 견적서 (PDF)</strong> 를 발송해 드립니다.
          </p>
          <Link
            href="/intake"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-xl transition"
          >
            의뢰서 작성하기
            <span>→</span>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-zinc-400 py-4">
          본 안내는 일반적인 기준이며, 실제 견적은 요구사항에 따라 달라질 수 있습니다.
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-4 border-t border-zinc-100">
      <h3 className="text-sm font-semibold text-zinc-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}
