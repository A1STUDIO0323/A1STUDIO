import { createClient } from "@/lib/supabase/server";

/**
 * 후기 데이터 타입
 */
export interface Review {
  id: string;
  reservationId: string | null;
  userId: string | null;
  rating: number;
  content: string;
  authorName: string;
  imageUrl: string | null;
  videoUrl: string | null;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Supabase `reviews` 테이블 행 (snake_case) */
interface ReviewRow {
  id: string;
  reservation_id: string | null;
  user_id: string | null;
  rating: number;
  content: string;
  author_name: string;
  image_url: string | null;
  video_url: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * 공개된 후기 목록 조회 (일반 사용자용)
 */
export async function getPublicReviews(): Promise<Review[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("is_visible", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Get Public Reviews Error]", error);
      return [];
    }

    return (data || []).map((row) => mapReviewFromDB(row as ReviewRow));
  } catch (err) {
    console.error("[Get Public Reviews Exception]", err);
    return [];
  }
}

/**
 * 전체 후기 목록 조회 (관리자용)
 */
export async function getAllReviews(): Promise<Review[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Get All Reviews Error]", error);
      throw new Error(error.message || "후기 조회 실패");
    }

    return (data || []).map((row) => mapReviewFromDB(row as ReviewRow));
  } catch (err) {
    console.error("[Get All Reviews Exception]", err);
    throw err;
  }
}

/**
 * 후기 공개/비공개 토글
 */
export async function toggleReviewVisibility(reviewId: string): Promise<void> {
  const supabase = await createClient();

  try {
    const { data: current, error: fetchError } = await supabase
      .from("reviews")
      .select("is_visible")
      .eq("id", reviewId)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message || "후기를 찾을 수 없습니다");
    }

    if (!current) {
      throw new Error("후기를 찾을 수 없습니다");
    }

    const { error: updateError } = await supabase
      .from("reviews")
      .update({
        is_visible: !current.is_visible,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    if (updateError) {
      throw new Error(updateError.message || "후기 상태 변경 실패");
    }
  } catch (err) {
    console.error("[Toggle Review Visibility Error]", err);
    throw err;
  }
}

/**
 * 후기 삭제
 */
export async function deleteReview(reviewId: string): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase.from("reviews").delete().eq("id", reviewId);

    if (error) {
      throw new Error(error.message || "후기 삭제 실패");
    }
  } catch (err) {
    console.error("[Delete Review Error]", err);
    throw err;
  }
}

/**
 * 후기 생성
 */
export async function createReview(params: {
  reservationId?: string;
  userId?: string;
  rating: number;
  content: string;
  authorName: string;
  imageUrl?: string;
  videoUrl?: string;
}): Promise<Review> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        reservation_id: params.reservationId ?? null,
        user_id: params.userId ?? null,
        rating: params.rating,
        content: params.content,
        author_name: params.authorName,
        image_url: params.imageUrl ?? null,
        video_url: params.videoUrl ?? null,
        is_visible: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "후기 작성 실패");
    }

    if (!data) {
      throw new Error("후기 작성 실패");
    }

    return mapReviewFromDB(data as ReviewRow);
  } catch (err) {
    console.error("[Create Review Error]", err);
    throw err;
  }
}

/**
 * DB 데이터를 Review 타입으로 변환
 */
function mapReviewFromDB(data: ReviewRow): Review {
  return {
    id: data.id,
    reservationId: data.reservation_id,
    userId: data.user_id,
    rating: data.rating,
    content: data.content,
    authorName: data.author_name,
    imageUrl: data.image_url,
    videoUrl: data.video_url,
    isVisible: data.is_visible,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
