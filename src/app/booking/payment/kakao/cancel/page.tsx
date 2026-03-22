import Link from "next/link";

export default function KakaoPayCancelPage() {
  return (
    <div className="min-h-screen bg-[#F7F3EB] px-4 py-16">
      <div className="mx-auto w-full max-w-md rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 text-center">
        <h1 className="text-xl font-bold text-[#3B342F]">카카오페이 결제가 취소되었습니다</h1>
        <p className="mt-2 text-sm text-[#6f655d]">원하시면 다시 결제를 시도할 수 있습니다.</p>
        <Link
          href="/booking"
          className="mt-6 inline-flex rounded-full bg-[#B98768] px-6 py-2.5 text-sm font-bold text-[#F7F3EB] hover:bg-[#a9785c]"
        >
          예약 페이지로 돌아가기
        </Link>
      </div>
    </div>
  );
}
