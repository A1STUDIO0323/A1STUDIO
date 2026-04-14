/**
 * 파티룸 비품 및 옵션 관리
 */

export const PARTY_ROOM_AMENITIES = [
  { id: 'music_light', name: '음악반응 조명', included: true,  comingSoon: false },
  { id: 'mirror',      name: '전신거울',      included: true,  comingSoon: false },
  { id: 'stand',       name: '삼각대',        included: true,  comingSoon: false },
  { id: 'lighting',    name: '촬영용 조명',   included: true,  comingSoon: false },
  { id: 'piano',       name: '전자피아노',    included: true,  comingSoon: false },
  { id: 'yoga_mat',    name: '요가매트',      included: true,  comingSoon: false },
  { id: 'air_purifier',name: '공기청정기',    included: true,  comingSoon: false },
  { id: 'fridge',      name: '냉장고',        included: false, comingSoon: true  },
  { id: 'karaoke',     name: '노래방',        included: false, comingSoon: true  },
  { id: 'board_game',  name: '보드게임',      included: false, comingSoon: true  },
];

/**
 * included: false && comingSoon: true → UI에 "준비 중" 배지
 * 비품 추가 완료 시 included: true로 변경 → 자동으로 포함 비품으로 노출
 * 모든 comingSoon 항목이 included: true가 되면 → 정가로 전환 안내
 */
