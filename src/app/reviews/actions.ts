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
  const author_name = (formData.get("author_name") as string)?.trim();
  const rating = parseInt(formData.get("rating") as string);
  const content = (formData.get("content") as string)?.trim();
  const imageFile = formData.get("image") as File | null;

  if (!author_name || !rating || !content) {
    return { error: "모든 항목을 입력해주세요." };
  }
  if (author_name.length > 20) {
    return { error: "이름은 20자 이내로 입력해주세요." };
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

  let image_url: string | null = null;

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

  const { error } = await supabase.from("reviews").insert({
    author_name,
    rating,
    content,
    image_url,
  });

  if (error) {
    return { error: "후기 등록에 실패했습니다. 잠시 후 다시 시도해주세요." };
  }

  revalidatePath("/reviews");
  return { success: true };
}
