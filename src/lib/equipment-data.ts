export type EquipmentCategory = "common" | "practice" | "party" | "option";

export type Equipment = {
  id: string;
  name: string;
  category: EquipmentCategory;
  quantity: number;
  /** 모델명 (확인된 경우에만 표기) */
  model?: string;
  /** 추가옵션 비품의 1회 이용 요금 (원) */
  optionPrice?: number;
  description: string;
  usage: string[];
  images: string[];
  status: "available" | "upcoming";
};

export const EQUIPMENT_CATEGORIES: Record<
  EquipmentCategory,
  { label: string; sublabel: string; icon: string; description: string }
> = {
  common: {
    label: "공통 비품",
    sublabel: "기본",
    icon: "🏠",
    description: "연습실·파티룸 이용 시 누구나 무료로 사용하는 기본 비품입니다.",
  },
  practice: {
    label: "연습실 비품",
    sublabel: "기본",
    icon: "💃",
    description: "연습실 예약 시 기본으로 제공되는 비품입니다.",
  },
  party: {
    label: "파티룸 비품",
    sublabel: "전용",
    icon: "🎉",
    description:
      "파티룸 예약 시에만 제공되는 전용 비품입니다. 파티룸은 공통·연습실 비품을 포함한 전체 비품을 이용할 수 있습니다.",
  },
  option: {
    label: "추가옵션 비품",
    sublabel: "유료",
    icon: "✨",
    description:
      "연습실 이용 시 추가 요금을 지불하면 사용할 수 있는 옵션 비품입니다. 파티룸 이용 시에는 기본 포함됩니다.",
  },
};

export const EQUIPMENT_LIST: Equipment[] = [
  // ── 공통 비품 (기본) ──────────────────────────────
  {
    id: "tv-43",
    name: "43인치 TV",
    category: "common",
    quantity: 1,
    description: "43인치 대형 TV",
    usage: ["영상 시청", "미러링 및 화면 공유", "연습 영상 확인"],
    images: ["/equipment/tv-43.jpg"],
    status: "available",
  },
  {
    id: "air-conditioner",
    name: "냉난방기",
    category: "common",
    quantity: 1,
    description: "사계절 쾌적한 실내 온도 유지",
    usage: ["여름철 냉방", "겨울철 난방", "온도 자동 조절"],
    images: ["/equipment/air-conditioner.jpg"],
    status: "available",
  },
  {
    id: "dehumidifier",
    name: "제습기",
    category: "common",
    quantity: 1,
    description: "습도 조절로 쾌적한 환경 유지",
    usage: ["장마철 습도 제거", "쾌적한 연습 환경", "악기 및 장비 보호"],
    images: ["/equipment/dehumidifier.jpg"],
    status: "available",
  },
  {
    id: "air-purifier",
    name: "공기청정기",
    category: "common",
    quantity: 1,
    description: "깨끗한 실내 공기 유지",
    usage: ["미세먼지 제거", "쾌적한 실내 공기", "알레르기 예방"],
    images: ["/equipment/air-purifier.jpg"],
    status: "available",
  },
  {
    id: "wifi",
    name: "고속 WIFI",
    category: "common",
    quantity: 1,
    description: "안정적인 무선 인터넷",
    usage: ["음악 스트리밍", "영상 시청", "업무 및 학습"],
    images: ["/equipment/wifi.jpg"],
    status: "available",
  },
  {
    id: "charger",
    name: "충전기",
    category: "common",
    quantity: 1,
    description: "각종 디바이스 충전 가능",
    usage: ["스마트폰 충전", "노트북 충전", "다양한 충전 포트"],
    images: ["/equipment/charger.jpg"],
    status: "available",
  },
  {
    id: "cctv",
    name: "CCTV",
    category: "common",
    quantity: 1,
    description: "안전한 연습 공간 보장",
    usage: ["출입 관리", "분실물 방지", "안전 확보"],
    images: ["/equipment/cctv.jpg"],
    status: "available",
  },
  {
    id: "water-dispenser",
    name: "냉온정수기",
    category: "common",
    quantity: 1,
    description: "냉수, 온수, 정수 기능을 갖춘 정수기",
    usage: ["시원한 냉수 제공", "따뜻한 온수 제공", "깨끗한 정수 기능"],
    images: ["/equipment/water-dispenser.jpg"],
    status: "available",
  },
  {
    id: "color-light",
    name: "컬러조명",
    category: "common",
    quantity: 14,
    description: "다양한 색상 연출 가능한 컬러조명 14개",
    usage: ["공간 분위기 연출", "댄스 연습 시 무대 조명", "색상 및 밝기 조절"],
    images: ["/equipment/color-light.jpg"],
    status: "available",
  },
  {
    id: "theater-light",
    name: "극장조명 (전구등)",
    category: "common",
    quantity: 4,
    description: "극장 스타일 전구 조명 4개",
    usage: ["빈티지 분위기 연출", "무대 조명", "사진 촬영 배경"],
    images: ["/equipment/theater-light.jpg"],
    status: "available",
  },
  {
    id: "music-reactive-light",
    name: "음악반응 조명",
    category: "common",
    quantity: 4,
    description: "음악에 반응하는 스마트 조명 4개",
    usage: ["음악에 맞춰 자동 변화", "댄스 연습 시 몰입감", "파티 분위기"],
    images: ["/equipment/music-reactive-light.jpg"],
    status: "available",
  },
  {
    id: "speaker-light",
    name: "스피커 조명",
    category: "common",
    quantity: 1,
    description: "스피커와 조명이 결합된 복합 장비",
    usage: ["사운드와 조명 동시 제공", "파티 연출", "컴팩트한 공간 활용"],
    images: ["/equipment/speaker-light.jpg"],
    status: "available",
  },
  // ── 연습실 비품 (기본) ────────────────────────────
  {
    id: "jbl-partybox-320",
    name: "JBL PartyBox 320 블루투스 스피커",
    category: "practice",
    quantity: 1,
    model: "JBL PartyBox 320",
    description: "강력한 사운드의 프리미엄 블루투스 스피커",
    usage: [
      "블루투스 연결로 간편하게 음악 재생",
      "댄스 연습, 보컬 연습, 파티 등에 활용",
      "최대 음량으로 넓은 공간에서도 선명한 사운드",
    ],
    images: ["/equipment/jbl-partybox-320.jpg"],
    status: "available",
  },
  {
    id: "digital-piano",
    name: "전자피아노",
    category: "practice",
    quantity: 1,
    description: "보컬 및 뮤지컬 반주용 전자피아노",
    usage: ["보컬 연습 시 반주 가능", "뮤지컬 넘버 연습", "작곡 및 편곡 작업"],
    images: ["/equipment/digital-piano.jpg"],
    status: "available",
  },
  {
    id: "music-stand",
    name: "보면대",
    category: "practice",
    quantity: 3,
    description: "악보 거치용 보면대 3개",
    usage: ["악보를 올려놓고 연습", "높이 조절 가능", "안정적인 구조"],
    images: ["/equipment/music-stand.jpg"],
    status: "available",
  },
  {
    id: "foam-roller",
    name: "폼롤러",
    category: "practice",
    quantity: 2,
    description: "근막이완 및 근육 회복용 폼롤러 2개",
    usage: ["댄스 전후 근육 이완", "근막 마사지", "스트레칭 보조"],
    images: ["/equipment/foam-roller.jpg"],
    status: "available",
  },
  {
    id: "yoga-mat",
    name: "요가매트",
    category: "practice",
    quantity: 2,
    description: "몸풀기 및 스트레칭용 요가매트 2개",
    usage: ["워밍업 및 쿨다운", "요가, 필라테스", "바닥 운동"],
    images: ["/equipment/yoga-mat.jpg"],
    status: "available",
  },
  {
    id: "tripod",
    name: "삼각대",
    category: "practice",
    quantity: 1,
    description: "스마트폰 및 카메라 거치용 삼각대",
    usage: ["셀프 촬영 시 스마트폰 거치", "연습 영상 촬영", "높이 조절 가능"],
    images: ["/equipment/tripod.jpg"],
    status: "available",
  },
  {
    id: "art100-light",
    name: "ART100 촬영용 조명",
    category: "practice",
    quantity: 2,
    model: "ART100",
    description: "전문 촬영용 조명 2개",
    usage: [
      "영상 및 사진 촬영 시 조명",
      "밝기 조절 가능",
      "연기 연습 촬영에 최적",
    ],
    images: ["/equipment/art100-light.jpg"],
    status: "available",
  },
  // ── 파티룸 비품 (전용) ────────────────────────────
  {
    id: "refrigerator",
    name: "냉장고",
    category: "party",
    quantity: 1,
    description: "음료 및 간식 보관용 냉장고 (도입 예정)",
    usage: ["음료 보관", "간식 보관", "편의 향상"],
    images: ["/equipment/refrigerator.jpg"],
    status: "upcoming",
  },
  {
    id: "board-game",
    name: "보드게임",
    category: "party",
    quantity: 1,
    description: "다양한 보드게임 (도입 예정)",
    usage: ["파티룸 이용 시 활용", "팀 빌딩", "즐거운 시간"],
    images: ["/equipment/board-game.jpg"],
    status: "upcoming",
  },
  {
    id: "karaoke",
    name: "노래방",
    category: "party",
    quantity: 1,
    description: "파티룸 전용 노래방 시스템 (도입 예정)",
    usage: ["파티룸에서 노래방 이용", "모임·파티 분위기 연출", "마이크 연동"],
    images: ["/equipment/karaoke.jpg"],
    status: "upcoming",
  },
  // ── 추가옵션 비품 (유료) ──────────────────────────
  {
    id: "special-light",
    name: "특수조명 (무대조명)",
    category: "option",
    quantity: 4,
    optionPrice: 3000,
    description: "무대 연출용 특수 효과 조명 4개",
    usage: ["무대 특수효과", "파티 연출", "창의적인 촬영"],
    images: ["/equipment/special-light.jpg"],
    status: "available",
  },
  {
    id: "wireless-mic",
    name: "무선 블루투스 마이크",
    category: "option",
    quantity: 2,
    optionPrice: 3000,
    description: "고품질 무선 마이크 2개",
    usage: [
      "보컬 연습, 뮤지컬 연습에 활용",
      "블루투스 연결로 자유로운 이동",
      "2개 동시 사용 가능",
    ],
    images: ["/equipment/wireless-mic.jpg"],
    status: "available",
  },
];

export function getEquipmentById(id: string) {
  return EQUIPMENT_LIST.find((eq) => eq.id === id);
}

export function getEquipmentByCategory(category: EquipmentCategory) {
  return EQUIPMENT_LIST.filter((eq) => eq.category === category);
}
