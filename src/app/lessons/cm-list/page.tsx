import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CmCardSection from "@/components/one-day-class/CmCardSection";

// 개인레슨 CM 목록 (공개 페이지)
// - cm_applications.status='APPROVED' + can_lesson=true 인 CM
// - cm_profiles.is_public=true + is_active=true
// - Phase 2에서 show_in_list 컬럼이 추가되면 추가 필터됨
export default function LessonsCmListPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB] py-16 px-4">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
              Private Lesson · CM
            </p>
            <h1 className="mt-1 text-3xl font-extrabold text-[#3B342F]">개인레슨 CM 목록</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#6f655d]">
              1:1 또는 소수 인원 맞춤형 레슨을 진행할 수 있는 승인된 클래스마스터를 소개합니다.
            </p>
          </div>
          <Link
            href="/lessons"
            className="inline-flex shrink-0 items-center gap-1.5 text-sm text-[#6f655d] hover:text-[#B98768]"
          >
            <ArrowLeft className="w-4 h-4" />
            안내로
          </Link>
        </div>

        <CmCardSection type="lesson" variant="list" />
      </div>
    </div>
  );
}
