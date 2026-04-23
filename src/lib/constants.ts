export const STUDIO_NAME = "A1 STUDIO";
export const STUDIO_TAGLINE = "보컬·댄스·연기·뮤지컬 연습실";
export const STUDIO_DESCRIPTION =
  "서울시 송파구 문정동 70-13 B1. 문정역 도보 8분, 장지역 도보 10분.";
export const STUDIO_ADDRESS = "서울시 송파구 문정동 70-13 B1";
export const STUDIO_ADDRESS_DETAIL = "문정역 도보 8분 · 장지역 도보 10분";
export const STUDIO_PHONE = "010-5401-0732";
export const STUDIO_KAKAO_CHANNEL = "https://pf.kakao.com/_example";
export const STUDIO_INSTAGRAM = "https://instagram.com/a1studio";

export const HOLD_TIMEOUT_MINUTES = 10;

export const STUDIO_ROOM_TYPES = [
  { type: "VOCAL", label: "보컬 연습실", desc: "방음 완비, 전자피아노, 마이크" },
  { type: "DANCE", label: "댄스 연습실", desc: "전신거울, 미러볼, 넓은 공간" },
  { type: "ACT", label: "연기 연습실", desc: "촬영용 조명, 삼각대, 소품" },
  { type: "MUSICAL", label: "뮤지컬 연습실", desc: "피아노, 조명, 전신거울 완비" },
];

export const STUDIO_AMENITIES = [
  "전신거울",
  "삼각대",
  "촬영용 조명",
  "전자피아노",
  "보면대",
  "무선마이크",
  "요가매트",
  "폼롤러",
];

export const NAV_LINKS = [
  { label: "홈", href: "/" },
  {
    label: "소개",
    href: "/#about",
    children: [
      { label: "회사 소개", href: "/#studio-intro" },
      { label: "대표 소개", href: "/#about" },
      { label: "공간 소개", href: "/#gallery" },
      { label: "비품 및 시설", href: "/equipment" },
    ],
  },
  { label: "예약하기", href: "/booking" },
  {
    label: "원데이클래스",
    href: "/one-day-class",
    children: [
      { label: "클래스 공고 등록", href: "/one-day-class/announcements" },
      { label: "클래스 요청", href: "/one-day-class/requests" },
    ],
  },
  { label: "요금안내", href: "/pricing" },
  // 예약 메뉴 임시 숨김 (코드 보관)
  // {
  //   label: "예약",
  //   href: "/booking",
  //   children: [
  //     { label: "예약하기", href: "/booking" },
  //     { label: "예약현황", href: "/availability" },
  //   ],
  // },
  {
    label: "이용안내",
    href: "/guide",
    children: [
      { label: "이용수칙", href: "/guide#rules" },
      // 결제/환불 메뉴 임시 숨김 (코드 보관)
      // { label: "환불규정", href: "/guide#refund" },
      { label: "FAQ", href: "/guide#faq" },
    ],
  },
  {
    label: "게시판",
    href: "/board",
    children: [
      { label: "공지·이벤트", href: "/notices" },
      { label: "자유게시판", href: "/board" },
      { label: "후기", href: "/reviews" },
    ],
  },
  { label: "오시는길", href: "/location" },
  { label: "문의", href: "/contact" },
];

export const REFUND_POLICY = [
  { condition: "예약일 7일 전 이상", refundRate: 100 },
  { condition: "예약일 3~6일 전", refundRate: 80 },
  { condition: "예약일 1~2일 전", refundRate: 50 },
  { condition: "예약 당일", refundRate: 0 },
];

export const BOOKING_STEPS = [
  { step: 1, label: "시간 선택" },
  { step: 2, label: "정보 입력" },
  { step: 3, label: "결제" },
];

export const TIME_SLOTS_START = 9;
export const TIME_SLOTS_END = 24;
