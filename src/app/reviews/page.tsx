import { Metadata } from "next";
import Image from "next/image";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ReviewForm from "./_components/ReviewForm";

export const metadata: Metadata = { title: "후기 | A1 STUDIO" };

type Review = {
  id: string;
  author_name: string;
  rating: number;
  content: string;
  created_at: string;
  image_url: string | null;
};

async function getReviews(): Promise<Review[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, author_name, rating, content, created_at, image_url")
    .eq("is_visible", true)
    .order("created_at", { ascending: false });
  return data ?? [];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${
            s <= rating ? "fill-amber-400 text-amber-400" : "text-[#D8CCBC]"
          }`}
        />
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ReviewsPage() {
  const reviews = await getReviews();

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

  return (
    <div className="min-h-screen bg-[#F7F3EB] py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

        {/* 헤더 */}
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
            Reviews
          </p>
          <h1 className="mt-1 text-4xl font-extrabold text-[#3B342F]">이용 후기</h1>
          <p className="mt-3 text-[#9b9189]">실제 이용하신 분들의 솔직한 후기</p>
        </div>

        {/* 평균 별점 요약 */}
        {avgRating && (
          <div className="mb-10 rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6 text-center">
            <p className="text-5xl font-black text-[#3B342F]">{avgRating}</p>
            <div className="mt-2 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-6 w-6 ${
                    s <= Math.round(Number(avgRating))
                      ? "fill-amber-400 text-amber-400"
                      : "text-[#D8CCBC]"
                  }`}
                />
              ))}
            </div>
            <p className="mt-2 text-sm text-[#9b9189]">
              총 {reviews.length}개의 후기
            </p>
          </div>
        )}

        {/* 후기 작성 폼 */}
        <div className="mb-10">
          <ReviewForm />
        </div>

        {/* 후기 목록 */}
        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D8CCBC] py-16 text-center">
            <p className="text-sm text-[#9b9189]">
              아직 후기가 없습니다. 첫 번째 후기를 남겨주세요!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-[#3B342F]">{review.author_name}</p>
                    <p className="text-xs text-[#9b9189] mt-0.5">
                      {formatDate(review.created_at)}
                    </p>
                  </div>
                  <StarRating rating={review.rating} />
                </div>
                <p className="text-sm leading-relaxed text-[#6f655d] whitespace-pre-wrap">
                  {review.content}
                </p>
                {review.image_url && (
                  <div className="mt-4">
                    <Image
                      src={review.image_url}
                      alt="후기 사진"
                      width={480}
                      height={320}
                      unoptimized
                      className="rounded-xl object-cover max-h-72 w-auto"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
