-- 기존 공개 INSERT 정책 제거
DROP POLICY IF EXISTS "Public insert reviews" ON reviews;

-- 인증된 사용자만 후기 작성 가능
CREATE POLICY "Authenticated insert reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- Storage: 인증된 사용자만 이미지 업로드 가능
DROP POLICY IF EXISTS "Public upload review images" ON storage.objects;

CREATE POLICY "Authenticated upload review images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'review-images');
