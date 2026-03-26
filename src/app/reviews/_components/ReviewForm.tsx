"use client";

import { useState, useRef, useTransition } from "react";
import { submitReview, ReviewFormState } from "../actions";
import { useSession, signIn } from "@/lib/auth-client";
import { Star, ImagePlus, X, LogIn } from "lucide-react";

/** 이미지를 JPEG로 압축 (최대 1200px, quality 0.82) */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width >= height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("압축 실패"))),
        "image/jpeg",
        0.82
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지 로드 실패"));
    };
    img.src = objectUrl;
  });
}

export default function ReviewForm() {
  const { status, data: session } = useSession();
  const [state, setState] = useState<ReviewFormState>({});
  const [isPending, startTransition] = useTransition();
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressing, setCompressing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setState({ error: "이미지 파일만 업로드 가능합니다." });
      return;
    }

    setCompressing(true);
    setState({});

    try {
      const blob = await compressImage(file);
      const url = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
      setCompressedBlob(blob);
    } catch {
      setState({ error: "이미지 처리에 실패했습니다." });
    } finally {
      setCompressing(false);
    }
  };

  const removeImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCompressedBlob(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (compressedBlob) {
      formData.set("image", compressedBlob, "photo.jpg");
    } else {
      formData.delete("image");
    }

    startTransition(async () => {
      const result = await submitReview(state, formData);
      setState(result);
      if (result.success) {
        formRef.current?.reset();
        setSelected(0);
        setHovered(0);
        removeImage();
      }
    });
  };

  /* 비로그인 상태 */
  if (status === "unauthenticated") {
    return (
      <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 text-center">
        <LogIn className="mx-auto mb-3 h-8 w-8 text-[#B98768]" />
        <p className="font-semibold text-[#3B342F] mb-1">로그인 후 후기를 작성할 수 있습니다</p>
        <p className="text-sm text-[#9b9189] mb-5">회원만 후기를 작성할 수 있어요.</p>
        <button
          onClick={() => signIn(undefined, { callbackUrl: "/reviews" })}
          className="inline-flex items-center gap-2 rounded-xl bg-[#B98768] px-6 py-2.5 text-sm font-bold text-[#F7F3EB] transition-all hover:bg-[#a9785c] active:scale-95"
        >
          <LogIn className="h-4 w-4" />
          로그인하기
        </button>
      </div>
    );
  }

  /* 로딩 상태 */
  if (status === "loading") {
    return (
      <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-8 text-center">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[#B98768] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#D8CCBC] bg-[#EFE7DA] p-6 sm:p-8">
      <h2 className="text-lg font-bold text-[#3B342F] mb-1">후기 작성하기</h2>
      <p className="text-sm text-[#9b9189] mb-6">{session?.user.name ?? session?.user.email} 님</p>

      {state.success && (
        <div className="mb-5 rounded-xl bg-[#B98768]/10 border border-[#B98768]/30 px-4 py-3 text-sm font-medium text-[#B98768]">
          후기가 등록되었습니다. 감사합니다!
        </div>
      )}
      {state.error && (
        <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {state.error}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
        {/* 별점 */}
        <div>
          <label className="block text-sm font-medium text-[#3B342F] mb-2">
            별점 <span className="text-[#B98768]">*</span>
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setSelected(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                aria-label={`${star}점`}
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    star <= (hovered || selected)
                      ? "fill-amber-400 text-amber-400"
                      : "text-[#D8CCBC]"
                  }`}
                />
              </button>
            ))}
          </div>
          <input type="hidden" name="rating" value={selected} />
        </div>

        {/* 이름 */}
        <div>
          <label htmlFor="author_name" className="block text-sm font-medium text-[#3B342F] mb-1.5">
            이름 <span className="text-[#B98768]">*</span>
          </label>
          <input
            id="author_name"
            name="author_name"
            type="text"
            maxLength={20}
            placeholder="홍길동"
            required
            className="w-full rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-2.5 text-sm text-[#3B342F] placeholder-[#b0a89e] focus:border-[#B98768] focus:outline-none focus:ring-1 focus:ring-[#B98768]"
          />
        </div>

        {/* 내용 */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-[#3B342F] mb-1.5">
            후기 내용 <span className="text-[#B98768]">*</span>
          </label>
          <textarea
            id="content"
            name="content"
            rows={4}
            minLength={10}
            maxLength={500}
            placeholder="이용 후기를 자유롭게 작성해주세요. (10~500자)"
            required
            className="w-full resize-none rounded-xl border border-[#D8CCBC] bg-[#F7F3EB] px-4 py-2.5 text-sm text-[#3B342F] placeholder-[#b0a89e] focus:border-[#B98768] focus:outline-none focus:ring-1 focus:ring-[#B98768]"
          />
        </div>

        {/* 사진 첨부 */}
        <div>
          <label className="block text-sm font-medium text-[#3B342F] mb-1.5">
            사진 첨부 <span className="text-xs text-[#9b9189] font-normal">(선택, 자동 압축 적용)</span>
          </label>

          {previewUrl ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="첨부 이미지 미리보기"
                className="h-32 w-32 rounded-xl object-cover border border-[#D8CCBC]"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 rounded-full bg-[#3B342F] p-0.5 text-white hover:bg-red-500 transition-colors"
                aria-label="이미지 제거"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={compressing}
              className="flex items-center gap-2 rounded-xl border border-dashed border-[#D8CCBC] bg-[#F7F3EB] px-4 py-3 text-sm text-[#9b9189] hover:border-[#B98768] hover:text-[#B98768] transition-colors disabled:opacity-50"
            >
              <ImagePlus className="h-4 w-4" />
              {compressing ? "압축 중..." : "사진 선택"}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <button
          type="submit"
          disabled={isPending || selected === 0 || compressing}
          className="w-full rounded-xl bg-[#B98768] py-3 text-sm font-bold text-[#F7F3EB] transition-all hover:bg-[#a9785c] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "등록 중..." : "후기 등록하기"}
        </button>
      </form>
    </div>
  );
}
