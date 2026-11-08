-- Đại hội số v9: ảnh chân dung cho nhân sự được giới thiệu BCH.
-- Chạy sau upgrade-bch-candidates-v8.sql. Không sửa các hồ sơ đã có.
BEGIN;

ALTER TABLE public.bch_candidates
  ADD COLUMN IF NOT EXISTS photo_path text;

ALTER TABLE public.bch_candidates
  DROP CONSTRAINT IF EXISTS bch_candidates_photo_path_length_check;

ALTER TABLE public.bch_candidates
  ADD CONSTRAINT bch_candidates_photo_path_length_check
  CHECK (photo_path IS NULL OR length(photo_path) BETWEEN 1 AND 300);

ALTER TABLE public.bch_candidates
  DROP CONSTRAINT IF EXISTS bch_candidates_photo_path_expected_check;

ALTER TABLE public.bch_candidates
  ADD CONSTRAINT bch_candidates_photo_path_expected_check
  CHECK (
    photo_path IS NULL
    OR photo_path = congress_id::text || '/bch/' || id::text || '.jpg'
  );

-- Ảnh lưu trong bucket private delegate-photos tại:
-- <congress-id>/bch/<candidate-id>.jpg
-- Không cấp quyền đọc storage trực tiếp cho anon/authenticated.
-- Toàn bộ ảnh chỉ được phân phối bởi Next.js API với kiểm tra quyền BCH.

COMMIT;
