import Link from "next/link";
import { Megaphone, MessageSquarePlus, ChevronRight, Users, ShieldCheck, Award } from "lucide-react";
import CmCardSection from "@/components/one-day-class/CmCardSection";
import OpenOfferingsSection from "@/components/one-day-class/OpenOfferingsSection";

export default function OneDayClassPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20 px-4">
      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
            One-Day Class
          </p>
          <h1 className="mt-2 text-4xl font-extrabold text-[#3B342F]">
            원데이클래스
          </h1>
          <p className="mt-4 text-base text-[#6f655d] max-w-2xl mx-auto">
            보컬·댄스·연기·뮤지컬 등 다양한 분야의 모집형 클래스를
            A1 STUDIO와 클래스마스터(CM)가 함께 운영합니다.
          </p>
        </div>

        {/* 원데이클래스 소개 카드 */}
        <div className="mb-12 rounded-2xl border border-[#D8CCBC] bg-white p-7">
          <div className="rounded-xl bg-[#B98768]/15 p-3 w-fit mb-4">
            <Users className="h-6 w-6 text-[#B98768]" />
          </div>
          <h2 className="text-lg font-bold text-[#3B342F] mb-2">원데이클래스란?</h2>
          <p className="text-sm text-[#6f655d] leading-relaxed mb-4">
            여러 수강생과 클래스마스터가 함께하는 모집형 클래스입니다.
            보컬·댄스·연기·뮤지컬 등 다양한 분야의 클래스를 소수 인원으로 진행합니다.
          </p>
          <ul className="text-sm text-[#6f655d] space-y-1">
            <li>· 신청 경로: A1 STUDIO 홈페이지</li>
            <li>· 운영: A1 STUDIO + 클래스마스터(CM) 협업</li>
            <li>· 형태: 모집형 · 소수 인원</li>
          </ul>
          <p className="mt-4 text-xs text-[#9b9189]">
            * 1:1 또는 맞춤형 개인레슨을 원하시면 <Link href="/lessons" className="font-semibold text-emerald-600 hover:underline">개인레슨</Link> 페이지를 이용해주세요.
          </p>
        </div>

        {/* 신청/등록 진입 */}
        <div className="grid gap-5 sm:grid-cols-2 mb-12">
          <Link
            href="/one-day-class/announcements"
            className="group flex flex-col gap-4 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-7 transition-all hover:border-[#B98768]/50 hover:bg-[#3B342F]/80"
          >
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-[#B98768]/15 p-3">
                <Megaphone className="h-6 w-6 text-[#B98768]" />
              </div>
              <ChevronRight className="h-5 w-5 text-[#b0a89e] transition-transform group-hover:translate-x-1 group-hover:text-[#B98768]" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-[#B98768] uppercase mb-1">Admin · CM</p>
              <h2 className="text-lg font-bold text-[#3B342F]">클래스 공고 등록</h2>
              <p className="mt-1.5 text-sm text-[#6f655d] leading-relaxed">
                클래스마스터(CM) 회원이 원데이클래스 공고를 등록하고, 참가 신청을 받을 수 있습니다.
              </p>
            </div>
          </Link>

          <Link
            href="/one-day-class/requests"
            className="group flex flex-col gap-4 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-7 transition-all hover:border-emerald-500/40 hover:bg-[#3B342F]/80"
          >
            <div className="flex items-center justify-between">
              <div className="rounded-xl bg-emerald-50 p-3">
                <MessageSquarePlus className="h-6 w-6 text-emerald-400" />
              </div>
              <ChevronRight className="h-5 w-5 text-[#b0a89e] transition-transform group-hover:translate-x-1 group-hover:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-emerald-400 uppercase mb-1">Member Only</p>
              <h2 className="text-lg font-bold text-[#3B342F]">클래스 요청</h2>
              <p className="mt-1.5 text-sm text-[#6f655d] leading-relaxed">
                일반회원이 원하는 장르·시간·요일을 선택해 원데이클래스 개설을 요청할 수 있습니다.
              </p>
            </div>
          </Link>
        </div>

        {/* 운영 모델 안내 */}
        <div className="rounded-2xl border border-[#D8CCBC] bg-white p-7 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <ShieldCheck className="w-6 h-6 text-[#B98768]" />
            <h2 className="text-lg font-bold text-[#3B342F]">운영 모델 — A1 + CM 협업</h2>
          </div>

          <p className="text-sm text-[#6f655d] mb-5">
            A1 STUDIO는 단순 공간 제공자가 아니라 <strong className="text-[#3B342F]">고객 모집·접수·결제·일정 조율·고객 응대·불만 접수·개선 관리</strong>까지 담당하는 운영 주체입니다.
            클래스마스터(CM)는 <strong className="text-[#3B342F]">수업 기획·진행·지도·품질 개선</strong>을 맡습니다.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-[#F7F3EB] p-5">
              <h3 className="font-semibold text-[#3B342F] mb-2">A1 STUDIO 역할</h3>
              <ul className="text-sm text-[#6f655d] space-y-1 list-disc list-inside">
                <li>고객 모집 · 신청 접수</li>
                <li>결제 관리 · 일정 조율</li>
                <li>고객 응대 · 불만 1차 접수</li>
                <li>개선 요청 전달 · 재발 방지</li>
                <li>후기 및 신뢰도 관리</li>
              </ul>
            </div>
            <div className="rounded-xl bg-[#F7F3EB] p-5">
              <h3 className="font-semibold text-[#3B342F] mb-2">클래스마스터(CM) 역할</h3>
              <ul className="text-sm text-[#6f655d] space-y-1 list-disc list-inside">
                <li>수업 기획 · 진행</li>
                <li>수강생 지도 · 피드백</li>
                <li>수업 품질 개선 협조</li>
              </ul>
            </div>
          </div>

          <p className="text-xs text-[#9b9189] mt-4">
            * 클래스 관련 불만은 A1 STUDIO가 1차 접수 후, 필요 시 CM에게 개선 요청을 전달합니다.
          </p>
        </div>

        {/* CM 선정 기준 (정책 11) */}
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
          <p className="text-xs text-[#9b9189] mt-4">
            * A1 STUDIO 대표는 현재 뮤지컬 배우로 활동 중이며, 추천·평판·수업 가능성을 사전 검증한 후 CM을 선정합니다.
          </p>

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

        {/* 모집 중인 원데이클래스 (OPEN 상태 자동 노출) */}
        <OpenOfferingsSection filterType="oneday" />

        {/* 공개 CM 카드 (DB 기반 자동 노출) */}
        <CmCardSection />

        {/* 누적 진행 안내 — 데이터 없을 때 */}
        <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-7 text-center">
          <h3 className="text-lg font-bold text-[#3B342F] mb-2">첫 원데이클래스를 모집 중입니다</h3>
          <p className="text-sm text-[#6f655d]">
            누적 진행 횟수 · 수강생 수 · 후기 정보는 실제 수업이 완료된 후부터 표시됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
