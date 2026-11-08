-- Đại hội số v15 — nhân khẩu học đại biểu phục vụ thống kê người thực tế tham dự.
-- Chạy SAU schema.sql và upgrade-delegate-accounts-v5.sql.
-- Hai trường tùy chọn để không làm hỏng hồ sơ đã nhập trước đây.
BEGIN;
ALTER TABLE public.delegates
 ADD COLUMN IF NOT EXISTS gender text,
 ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE public.delegates
 DROP CONSTRAINT IF EXISTS delegates_gender_check,
 ADD CONSTRAINT delegates_gender_check
 CHECK (gender IS NULL OR gender IN ('male','female','other'));
ALTER TABLE public.delegates
 DROP CONSTRAINT IF EXISTS delegates_birth_date_check,
 ADD CONSTRAINT delegates_birth_date_check
 CHECK (birth_date IS NULL OR (birth_date >= DATE '1900-01-01' AND birth_date <= CURRENT_DATE));
COMMENT ON COLUMN public.delegates.gender IS
 'Giới tính tự khai: male, female, other; NULL nếu chưa được cung cấp.';
COMMENT ON COLUMN public.delegates.birth_date IS
 'Ngày sinh đại biểu, để phân tích độ tuổi của đại biểu thực tế đã điểm danh.';
COMMIT;
