"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ReviewFormState = {
  error?: string;
  success?: boolean;
};

export async function submitReview(
  _prev: ReviewFormState,
  formData: FormData
): Promise<ReviewFormState> {
  const rating = parseInt(formData.get("rating") as string);
  const content = (formData.get("content") as string)?.trim();
  const imageFile = formData.get("image") as File | null;
  const videoFile = formData.get("video") as File | null;

  if (!rating || !content) {
    return { error: "모든 항목을 입력해주세요." };
  }
  if (content.length < 10) {
    return { error: "후기는 10자 이상 작성해주세요." };
  }
  if (content.length > 500) {
    return { error: "후기는 500자 이내로 작성해주세요." };
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인 후 후기를 작성할 수 있습니다." };
  }

  const author_name = (
    user.user_metadata?.name ??
    user.user_metadata?.full_name ??
    user.email ??
    "익명"
  ).trim().slice(0, 20);

  let image_url: string | null = null;
  let video_url: string | null = null;

  // 이미지 업로드
  if (imageFile && imageFile.size > 0) {
    if (imageFile.size > 5 * 1024 * 1024) {
      return { error: "이미지는 5MB 이하만 업로드 가능합니다." };
    }

    const ext = "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("review-images")
      .upload(filename, imageFile, { contentType: "image/jpeg", upsert: false });

    if (uploadError) {
      return { error: "이미지 업로드에 실패했습니다. 다시 시도해주세요." };
    }

    const { data } = supabase.storage.from("review-images").getPublicUrl(filename);
    image_url = data.publicUrl;
  }

  // 동영상 업로드
  if (videoFile && videoFile.size > 0) {
    const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];
    if (!ALLOWED_VIDEO_TYPES.includes(videoFile.type)) {
      return { error: "MP4, WebM, MOV 형식의 동영상만 업로드 가능합니다." };
    }
    if (videoFile.size > 50 * 1024 * 1024) {
      return { error: "동영상은 50MB 이하만 업로드 가능합니다." };
    }

    const extMap: Record<string, string> = {
      "video/mp4": "mp4",
      "video/webm": "webm",
      "video/quicktime": "mov",
      "video/x-m4v": "m4v",
    };
    const ext = extMap[videoFile.type] ?? "mp4";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("review-videos")
      .upload(filename, videoFile, { contentType: videoFile.type, upsert: false });

    if (uploadError) {
      return { error: "동영상 업로드에 실패했습니다. 다시 시도해주세요." };
    }

    const { data } = supabase.storage.from("review-videos").getPublicUrl(filename);
    video_url = data.publicUrl;
  }

  const { error } = await supabase.from("reviews").insert({
    author_name,
    rating,
    content,
    image_url,
    video_url,
  });

  if (error) {
    return { error: "후기 등록에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  revalidatePath("/reviews");
  return { success: true };
}
