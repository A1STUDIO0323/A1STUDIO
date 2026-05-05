import { Metadata } from "next";

export const metadata: Metadata = {
  title: "회사 소개 | A1 STUDIO",
  description: "A1 STUDIO 회사 소개",
};

export default function CompanyPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
            About
          </p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">
            회사 소개
          </h1>
        </div>

        <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-10 text-center">
          <p className="text-sm text-[#9b9189]">
            회사 소개 내용 준비 중입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
