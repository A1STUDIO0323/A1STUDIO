-- 후기 테이블
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  author_name TEXT        NOT NULL,
  rating      INTEGER     NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  is_visible  BOOLEAN     DEFAULT TRUE
);

-- Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 공개 읽기
CREATE POLICY "Public read reviews"
  ON reviews FOR SELECT
  USING (is_visible = TRUE);

-- 공개 작성
CREATE POLICY "Public insert reviews"
  ON reviews FOR INSERT
  WITH CHECK (TRUE);
