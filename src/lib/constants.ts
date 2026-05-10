export const STUDIO_NAME = "A1 STUDIO";
export const STUDIO_LEGAL_NAME = "에이원스튜디오(A1STUDIO)";
export const STUDIO_CEO = "신지섭";
export const STUDIO_BIZ_NO = "332-32-01611";
export const STUDIO_TAGLINE = "보컬·댄스·연기·뮤지컬 연습실";
export const STUDIO_DESCRIPTION =
  "서울특별시 송파구 새말로 103, 지하1층 (문정동, 기백빌딩). 문정역 도보 8분, 장지역 도보 10분.";
export const STUDIO_ADDRESS = "서울특별시 송파구 새말로 103, 지하1층 (문정동, 기백빌딩)";
export const STUDIO_ADDRESS_DETAIL = "문정역 도보 8분 · 장지역 도보 10분";
// 지도 마커 좌표 (네이버 플레이스 등록 위치 기준)
export const STUDIO_LAT = 37.4828998;
export const STUDIO_LNG = 127.1256066;
// 지도에 표시될 업체명 (마커 라벨)
export const STUDIO_MAP_LABEL = "에이원스튜디오";
// 네이버 플레이스 ID (지도 보기 링크가 업체 페이지로 바로 열리도록)
export const STUDIO_NAVER_PLACE_ID = "2012721420";
export const STUDIO_PHONE = "010-2994-0323";
export const STUDIO_KAKAO_CHANNEL = "https://pf.kakao.com/_pwxldX";
export const STUDIO_INSTAGRAM = "https://www.instagram.com/a1studio.munjeong";

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
    href: "/about/company",
    children: [
      { label: "회사 소개", href: "/about/company" },
      { label: "대표 소개", href: "/about/ceo" },
      { label: "공간 소개", href: "/about/space" },
      { label: "비품 및 시설", href: "/equipment" },
    ],
  },
  { label: "예약하기", href: "/booking" },
  {
    label: "원데이클래스",
    href: "/one-day-class",
    children: [
      { label: "안내", href: "/one-day-class" },
      { label: "목록", href: "/one-day-class/list" },
      { label: "요청", href: "/one-day-class/requests" },
    ],
  },
  {
    label: "개인레슨",
    href: "/lessons",
    children: [
      { label: "안내", href: "/lessons" },
      { label: "목록", href: "/lessons/list" },
      { label: "요청", href: "/lessons/requests" },
    ],
  },
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
    href: "/pricing",
    children: [
      { label: "요금안내", href: "/pricing" },
      { label: "이용수칙‧FAQ", href: "/guide" },
      // 결제/환불 메뉴 임시 숨김 (코드 보관)
      // { label: "환불규정", href: "/guide#refund" },
    ],
  },
  {
    label: "게시판",
    href: "/board",
    children: [
      { label: "공지·이벤트", href: "/notices" },
      { label: "자유게시판", href: "/board" },
      { label: "분실물", href: "/board/lost" },
      { label: "후기", href: "/reviews" },
    ],
  },
  { label: "오시는길", href: "/location" },
  { label: "문의", href: "/contact" },
];

export const BOOKING_STEPS = [
  { step: 1, label: "시간 선택" },
  { step: 2, label: "정보 입력" },
  { step: 3, label: "결제" },
];

export const TIME_SLOTS_START = 9;
export const TIME_SLOTS_END = 24;
