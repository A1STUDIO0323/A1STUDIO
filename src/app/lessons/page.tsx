import Link from "next/link";
import { UserCheck, ChevronRight, ShieldCheck, Award } from "lucide-react";
import CmCardSection from "@/components/one-day-class/CmCardSection";
import OpenOfferingsSection from "@/components/one-day-class/OpenOfferingsSection";

export default function LessonsPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20 px-4">
      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
            Private Lesson
          </p>
          <h1 className="mt-2 text-4xl font-extrabold text-[#3B342F]">개인레슨</h1>
          <p className="mt-4 text-base text-[#6f655d] max-w-2xl mx-auto">
            신청자의 목적과 수준에 맞춰 클래스마스터와 1:1 또는 소수 인원으로 진행되는 맞춤형 레슨입니다.
          </p>
        </div>

        {/* 소개 카드 */}
        <div className="mb-12 rounded-2xl border border-[#D8CCBC] bg-white p-7">
          <div className="rounded-xl bg-emerald-50 p-3 w-fit mb-4">
            <UserCheck className="h-6 w-6 text-emerald-500" />
          </div>
          <p className="text-sm text-[#6f655d] leading-relaxed mb-4">
            신청 후 희망 분야·일정·목표를 확인한 뒤 적합한 클래스마스터와 연결됩니다.
            보컬·댄스·연기·뮤지컬 등 다양한 분야의 레슨을 1:1 또는 소수 인원으로 진행합니다.
          </p>
          <ul className="text-sm text-[#6f655d] space-y-1">
            <li>· 신청 경로: A1 STUDIO 홈페이지</li>
            <li>· 매칭: 목적·수준·일정 기반 CM 매칭</li>
            <li>· 형태: 1:1 또는 소수 인원 맞춤형</li>
            <li>· 진행: A1 STUDIO가 일정·결제·피드백 관리</li>
          </ul>
        </div>

        {/* 레슨 요청 진입 */}
        <div className="mb-12">
          <Link
            href="/lessons/requests"
            className="group flex items-center justify-between gap-4 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-7 transition-all hover:border-emerald-500/40"
          >
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-widest text-emerald-500 uppercase mb-1">
                Member Only
              </p>
              <h2 className="text-lg font-bold text-[#3B342F]">레슨 요청</h2>
              <p className="mt-1.5 text-sm text-[#6f655d] leading-relaxed">
                원하는 분야·시간·요일을 선택해 레슨 개설을 요청할 수 있습니다.
              </p>
            </div>
            <ChevronRight className="h-6 w-6 text-[#b0a89e] shrink-0 transition-transform group-hover:translate-x-1 group-hover:text-emerald-500" />
          </Link>
        </div>

        {/* 운영 모델 */}
        <div className="rounded-2xl border border-[#D8CCBC] bg-white p-7 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-6 h-6 text-[#B98768]" />
            <h2 className="text-lg font-bold text-[#3B342F]">운영 모델 — A1 + CM 협업</h2>
          </div>

          <p className="text-sm text-[#6f655d] mb-5">
            A1 STUDIO는 신청 접수·CM 매칭·결제·일정 조율·고객 응대·불만 1차 접수·개선 관리를 담당하며,
            클래스마스터(CM)는 레슨 진행·개인별 커리큘럼·피드백을 맡습니다.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-[#F7F3EB] p-5">
              <h3 className="font-semibold text-[#3B342F] mb-2">A1 STUDIO 역할</h3>
              <ul className="text-sm text-[#6f655d] space-y-1 list-disc list-inside">
                <li>신청 접수 · CM 매칭</li>
                <li>결제 관리 · 일정 조율</li>
                <li>고객 응대 · 불만 1차 접수</li>
                <li>개선 요청 전달 · 재발 방지</li>
                <li>후기 및 신뢰도 관리</li>
              </ul>
            </div>
            <div className="rounded-xl bg-[#F7F3EB] p-5">
              <h3 className="font-semibold text-[#3B342F] mb-2">클래스마스터(CM) 역할</h3>
              <ul className="text-sm text-[#6f655d] space-y-1 list-disc list-inside">
                <li>레슨 진행 · 수강생 지도</li>
                <li>개인별 커리큘럼 관리</li>
                <li>수강생 피드백</li>
                <li>수업 품질 개선 협조</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CM 선정 기준 */}
        <div className="rounded-2xl border border-[#D8CCBC] bg-white p-7 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-6 h-6 text-[#B98768]" />
            <h2 className="text-lg font-bold text-[#3B342F]">CM 선정 기준</h2>
          </div>
          <p className="text-sm text-[#6f655d] mb-3">
            A1 STUDIO의 CM(Class Master)은 실제 무대 경험과 수업 역량을 기준으로 선정됩니다.
          </p>
          <ul className="text-sm text-[#6f655d] space-y-1.5 list-disc list-inside">
            <li>대표가 프로 무대에서 직접 함께 작업했거나</li>
            <li>신뢰할 수 있는 공연계 네트워크를 통해 실력과 책임감을 확인한 분들만 함께합니다.</li>
          </ul>

          <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center justify-between rounded-xl bg-[#F7F3EB] p-4">
            <p className="text-sm text-[#3B342F]">
              A1 STUDIO의 클래스마스터로 함께하실 분의 신청을 받습니다.
            </p>
            <Link
              href="/one-day-class/apply-cm"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#B98768] px-5 py-2 text-sm font-bold text-white hover:bg-[#a9785c]"
            >
              CM 신청하기
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* 모집 중인 개인레슨 */}
        <OpenOfferingsSection filterType="lesson" />

        {/* 공개 CM 카드 */}
        <CmCardSection />

        {/* 첫 레슨 모집 안내 */}
        <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-7 text-center">
          <h3 className="text-lg font-bold text-[#3B342F] mb-2">첫 레슨을 모집 중입니다</h3>
          <p className="text-sm text-[#6f655d]">
            누적 진행 횟수 · 수강생 수 · 후기 정보는 실제 레슨이 완료된 후부터 표시됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
