import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Review = {
  id: string;
  author_name: string;
  rating: number;
  content: string;
  created_at: string;
  image_url: string | null;
};

async function getLatestReviews(): Promise<Review[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select("id, author_name, rating, content, created_at, image_url")
    .eq("is_visible", true)
    .order("created_at", { ascending: false })
    .limit(3);
  return data ?? [];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${
            s <= rating ? "fill-amber-400 text-amber-400" : "text-[#D8CCBC]"
          }`}
        />
      ))}
    </div>
  );
}

export default async function ReviewsPreview() {
  const reviews = await getLatestReviews();

  return (
    <section className="bg-[#EFE7DA] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#B98768]">
              Reviews
            </p>
            <h2 className="mt-1 text-3xl font-bold text-[#3B342F]">이용 후기</h2>
          </div>
          <Link
            href="/reviews"
            className="hidden items-center gap-1 text-sm font-medium text-[#6f655d] hover:text-[#B98768] transition-colors sm:flex"
          >
            전체 후기 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#D8CCBC] bg-[#F7F3EB]/60 py-14 text-center">
            <p className="text-sm text-[#9b9189]">아직 후기가 없습니다.</p>
            <Link
              href="/reviews"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#B98768]"
            >
              첫 번째 후기 남기기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl border border-[#D8CCBC] bg-[#F7F3EB] p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-sm text-[#3B342F]">
                    {review.author_name}
                  </p>
                  <StarRating rating={review.rating} />
                </div>
                {review.image_url && (
                  <Image
                    src={review.image_url}
                    alt="후기 사진"
                    width={320}
                    height={180}
                    className="mb-3 w-full rounded-lg object-cover max-h-36"
                  />
                )}
                <p className="text-sm leading-relaxed text-[#6f655d] line-clamp-4">
                  {review.content}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-center sm:hidden">
          <Link
            href="/reviews"
            className="flex items-center gap-1.5 text-sm font-medium text-[#B98768]"
          >
            전체 후기 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
