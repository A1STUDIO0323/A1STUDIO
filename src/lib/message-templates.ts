/**
 * 예약 확정 알림 메시지 템플릿
 * 
 * 메시지 형식:
 * ```
 * 안녕하세요, A1 STUDIO입니다! ◡̎ 
 * 예약이 완료되었어요! 좋은 시간 보내고 오세요💗
 * 
 * [ 📌예약 정보  ]
 * - 예약자명: {예약자명}
 * - 연락처: {예약자 연락처}
 * - 이용시간: YY.MM.DD(요일) / HH:MM~HH:MM
 * ```
 */

export interface ReservationInfo {
  guestName: string;        // 예약자명 (마스킹됨: 정예주 → 정*주)
  guestPhone: string;       // 연락처 (010-1234-5678)
  date: string;             // 날짜 (YYYY-MM-DD) → YY.MM.DD(요일)로 변환
  startTime: string;        // 시작 시간 (HH:MM)
  endTime: string;          // 종료 시간 (HH:MM)
  roomType: 'practice' | 'party';
  packageType?: 'day' | 'night' | 'allday';
}

/**
 * 날짜를 한글 형식으로 변환
 * @example "2026-04-13" -> "26.04.13(월)"
 */
function formatDateKorean(dateStr: string): string {
  const date = new Date(dateStr);
  const year = String(date.getFullYear()).slice(2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = days[date.getDay()];
  
  return `${year}.${month}.${day}(${dayOfWeek})`;
}

/**
 * 이름 마스킹 (가운데 글자를 *로 변경)
 * @example "정예주" -> "정*주"
 */
function maskName(name: string): string {
  if (name.length <= 2) return name;
  const first = name[0];
  const last = name[name.length - 1];
  const middle = '*'.repeat(name.length - 2);
  return `${first}${middle}${last}`;
}

/**
 * 연습실 예약 확정 메시지
 */
export function getPracticeRoomConfirmMessage(info: ReservationInfo): string {
  const dateKorean = formatDateKorean(info.date);
  const maskedName = maskName(info.guestName);
  
  return `안녕하세요, A1 STUDIO입니다! ◡̎ 
예약이 완료되었어요! 좋은 시간 보내고 오세요💗

[ 📌예약 정보  ]
- 예약자명: ${maskedName} 님
- 연락처: ${info.guestPhone}
- 이용시간 
${dateKorean} / ${info.startTime}~${info.endTime}

[ 📌입실 안내  ] 
- 연습실 비밀번호: 0323 
                            (문 두 개 동일)
   연습실 위치: 우체국 오른쪽 건물 입구 B1이에요!

* 화장실 비밀번호 : 9780
  ↳ 화장실 위치: 우체국 왼쪽 주차장 입구로 들어오신 뒤, 우회전하시면 우체국 뒷문 옆에 있어요.

[ 📌시설 이용 안내  ] 
- 전자피아노 옆 QR코드로 Wi-Fi 연결해 주세요!
( 지하라 인터넷이 잘 안 터져요! 📶) 

- 블루투스 스피커는 냉난방기 옆에 있어요. 🔊
  * 나무계단을 밟으신 뒤 → 전원ON → 블루투스 버튼 → 핸드폰 연결 (JBL Party Box 320)

- 조명 리모컨은 출입구 오른편 스위치 아래에 있어요.💡
( 줄조명 및 전구 색상 변경 가능 )

- 특수조명 리모컨은 전자피아노 옆 충전기 정리함에 있어요. ✨
( 특수조명은 옵션 별도 신청 시에만 이용 가능합니다.)

[ 📌이용 안내 및 주의사항  ]
- A1 STUDIO는 24시간 무인으로 운영돼요.
- 예약하신 시간에 맞춰 입실해 주세요. ⏰
- 이용 시간에는 준비 및 정리 시간이 포함되어 있어요.
- 다음 분을 위해 종료 시간 전에 정리 후 퇴실 부탁드려요 🙏
- 사용하신 조명, 음향, 집기는 원래 자리에 놓아주세요.
- 쓰레기는 분리 정리 부탁드리고, 처음 오셨을 때처럼 깔끔하게 정돈해 주시면 감사해요 🧹
- 실내는 금연이에요 🚭
- 건물 밖이나 출입구 주변에서의 큰 소음, 고성방가, 장시간 체류는 주변에 민원이 생길 수 있으니 주의 부탁드려요 🔇
- 이용 수칙 위반, 무단 연장, 과도한 소음 및 민원 유발, 실내 흡연, 시설 운영에 지장을 주는 행위가 발생하면 환불 없이 즉시 퇴실 조치될 수 있는 점 양해 부탁드려요.
- 시설물, 비품, 장비가 훼손되거나 분실된 경우 원상복구 및 손해배상 비용이 청구될 수 있어요.
- 시설물이나 장비에 이상이 생기면 바로 연락 주세요! 📞

이용 시 문의사항은 언제든 연락주세요☺️

즐겁고 쾌적한 시간 되시길 바랍니다 😊
감사합니다!
A1 STUDIO`;
}

/**
 * 파티룸 예약 확정 메시지
 */
export function getPartyRoomConfirmMessage(info: ReservationInfo): string {
  const dateKorean = formatDateKorean(info.date);
  const maskedName = maskName(info.guestName);
  
  let packageInfo = '';
  if (info.packageType === 'day') {
    packageInfo = '데이 패키지 (10:00~17:00)';
  } else if (info.packageType === 'night') {
    packageInfo = '나잇 패키지 (19:00~익일 10:00)';
  } else if (info.packageType === 'allday') {
    packageInfo = '올데이 패키지 (10:00~익일 10:00)';
  } else {
    // 외부 플랫폼 예약 등 패키지 구분이 없는 경우 — 시간 범위 그대로 표기
    packageInfo = `${info.startTime}~${info.endTime}`;
  }
  
  return `안녕하세요, A1 STUDIO입니다! ◡̎ 
파티룸 예약이 완료되었어요! 좋은 시간 보내고 오세요💗

[ 📌예약 정보  ]
- 예약자명: ${maskedName} 님
- 연락처: ${info.guestPhone}
- 이용일시: ${dateKorean}
- 패키지: ${packageInfo}

[ 📌입실 안내  ] 
- 파티룸 비밀번호: 0323 
   파티룸 위치: 우체국 오른쪽 건물 입구 B1이에요!

* 화장실 비밀번호 : 9780

[ 📌시설 이용 안내  ] 
- 성인 전용 공간입니다 (만 19세 이상)
- 기본 포함 인원 10인 (초과 시 사전 문의)
- Wi-Fi, 블루투스 스피커, 특수조명 등 모든 시설을 자유롭게 이용하세요!

[ 📌이용 안내 및 주의사항  ]
- A1 STUDIO는 24시간 무인으로 운영돼요.
- 예약하신 시간에 맞춰 입실해 주세요. ⏰
- 퇴실 전 사용하신 시설을 정리해 주세요 🙏
- 실내는 금연이에요 🚭
- 과도한 소음 및 민원 유발 시 퇴실 조치될 수 있어요
- 시설물 훼손 시 원상복구 비용이 청구될 수 있어요

이용 시 문의사항은 언제든 연락주세요☺️

즐겁고 안전한 시간 되시길 바랍니다 😊
감사합니다!
A1 STUDIO`;
}

/**
 * 외부 플랫폼(스페이스클라우드·네이버 스마트플레이스) 예약자 이용안내 메시지
 * 기존 확정안내 템플릿을 공간 유형에 따라 재사용한다.
 */
export function getExternalReservationGuideMessage(info: ReservationInfo): string {
  return info.roomType === 'party'
    ? getPartyRoomConfirmMessage(info)
    : getPracticeRoomConfirmMessage(info);
}

/**
 * 예약 취소 알림 메시지
 */
export function getCancelMessage(info: ReservationInfo): string {
  const dateKorean = formatDateKorean(info.date);
  const maskedName = maskName(info.guestName);
  
  return `안녕하세요, A1 STUDIO입니다.

예약이 취소되었습니다.

[ 예약 정보 ]
- 예약자명: ${maskedName} 님
- 이용일시: ${dateKorean} ${info.startTime}~${info.endTime}

포인트는 자동으로 환불 처리되었습니다.

다음에 또 만나요! 😊
A1 STUDIO`;
}
