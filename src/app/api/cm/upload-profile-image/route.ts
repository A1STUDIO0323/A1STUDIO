import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

const BUCKET = "cm-profiles";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getServiceRole() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseJsClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * CM 프로필 이미지 업로드
 * POST /api/cm/upload-profile-image
 *
 * - 인증 필수
 * - Storage 버킷: 'cm-profiles' (public read)
 * - 경로: <user_id>/<timestamp>.<ext>
 * - service role 키로 업로드 → 클라이언트 RLS 우회
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 필요합니다" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "JPG / PNG / WEBP 형식만 업로드 가능합니다" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "파일 크기는 5MB 이하만 가능합니다" }, { status: 400 });
  }

  const sr = getServiceRole();
  if (!sr) {
    return NextResponse.json({ error: "서버 설정 오류 (SERVICE_ROLE 누락)" }, { status: 500 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${user.id}/${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await sr.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("[CM 이미지 업로드]", uploadError);
    return NextResponse.json(
      { error: `업로드 실패: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: pub } = sr.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ success: true, url: pub.publicUrl, path });
}
