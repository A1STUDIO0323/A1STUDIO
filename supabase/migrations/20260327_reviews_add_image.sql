-- reviews 테이블에 이미지 URL 컬럼 추가
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS image_url TEXT;

-- review-images 스토리지 버킷 생성 (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('review-images', 'review-images', true)
ON CONFLICT (id) DO NOTHING;

-- 누구나 읽기 가능
CREATE POLICY IF NOT EXISTS "Public read review images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'review-images');

-- 누구나 업로드 가능
CREATE POLICY IF NOT EXISTS "Public upload review images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'review-images');
