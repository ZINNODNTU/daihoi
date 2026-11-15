-- V78: retain fields already present in the official 13-column delegate roster.
-- Run AFTER upgrade-delegate-demographics-v15.sql before deploying the importer.
-- Additive only: no existing delegate or account is modified.
BEGIN;
ALTER TABLE public.delegates
 ADD COLUMN IF NOT EXISTS hometown text,
 ADD COLUMN IF NOT EXISTS religion text,
 ADD COLUMN IF NOT EXISTS ethnicity text,
 ADD COLUMN IF NOT EXISTS union_join_date date,
 ADD COLUMN IF NOT EXISTS phone_number text,
 ADD COLUMN IF NOT EXISTS class_name text,
 ADD COLUMN IF NOT EXISTS profile_notes text;
ALTER TABLE public.delegates
 DROP CONSTRAINT IF EXISTS delegates_roster_field_limits,
 ADD CONSTRAINT delegates_roster_field_limits CHECK (
  (hometown IS NULL OR length(hometown) <= 240) AND
  (religion IS NULL OR length(religion) <= 120) AND
  (ethnicity IS NULL OR length(ethnicity) <= 100) AND
  (phone_number IS NULL OR length(phone_number) <= 24) AND
  (class_name IS NULL OR length(class_name) <= 120) AND
  (profile_notes IS NULL OR length(profile_notes) <= 500)
 );
ALTER TABLE public.delegates
 DROP CONSTRAINT IF EXISTS delegates_union_join_date_check,
 ADD CONSTRAINT delegates_union_join_date_check CHECK (
  union_join_date IS NULL OR (
   union_join_date >= DATE '1931-03-26' AND
   union_join_date <= CURRENT_DATE AND
   (birth_date IS NULL OR union_join_date >= birth_date)
  )
 );
COMMENT ON COLUMN public.delegates.hometown IS 'Quê quán trong danh sách trích ngang đại biểu.';
COMMENT ON COLUMN public.delegates.religion IS 'Tôn giáo trong danh sách trích ngang đại biểu.';
COMMENT ON COLUMN public.delegates.ethnicity IS 'Dân tộc trong danh sách trích ngang đại biểu.';
COMMENT ON COLUMN public.delegates.union_join_date IS 'Ngày vào Đoàn, nhập dạng ngày Excel hoặc dd/mm/yyyy.';
COMMENT ON COLUMN public.delegates.phone_number IS 'Số điện thoại gốc, giữ cả số 0 đầu.';
COMMENT ON COLUMN public.delegates.class_name IS 'Lớp, không đồng nhất với chức vụ.';
COMMENT ON COLUMN public.delegates.profile_notes IS 'Ghi chú nhân sự từ mẫu, ví dụ Đảng viên; thuộc phạm vi RLS sẵn có của delegates.';
COMMIT;
