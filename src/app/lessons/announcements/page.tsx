import AnnouncementsClient from "@/components/class-offerings/AnnouncementsClient";

// 개인레슨 공고 등록 페이지 — CM 또는 ADMIN 전용
// 실제 class_offerings(type='lesson') 테이블에 저장됩니다.
export default function LessonsAnnouncementsPage() {
  return <AnnouncementsClient type="lesson" />;
}
