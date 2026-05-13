import AnnouncementsClient from "@/components/class-offerings/AnnouncementsClient";

// 원데이클래스 공고 등록 페이지 — CM 또는 ADMIN 전용
// 실제 class_offerings(type='oneday') 테이블에 저장됩니다.
// (이전: localStorage 기반 oneDayClassStore — 2026-05-13 실제 DB 연동으로 통일)
export default function OneDayClassAnnouncementsPage() {
  return <AnnouncementsClient type="oneday" />;
}
