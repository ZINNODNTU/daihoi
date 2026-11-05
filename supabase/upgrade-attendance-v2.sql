-- ĐẠI HỘI SỐ: Bản mở rộng điểm danh QR theo phiên, QR cố định,
-- khung giờ check-in, định danh barcode dự phòng.
-- Áp dụng trên Supabase project pnxdxdagpeyqarucdphk sau khi đã sao lưu.
-- Có thể chạy lại (đa số thao tác idempotent); có các ALTER CHECK cần kiểm tra trước.

BEGIN;
ALTER TABLE public.attendance_sessions
  ADD COLUMN IF NOT EXISTS qr_policy text NOT NULL DEFAULT 'both';
ALTER TABLE public.attendance_sessions
  DROP CONSTRAINT IF EXISTS attendance_sessions_qr_policy_check;
ALTER TABLE public.attendance_sessions
  ADD CONSTRAINT attendance_sessions_qr_policy_check
  CHECK (qr_policy IN ('fixed','session','both'));
ALTER TABLE public.attendance_sessions
  DROP CONSTRAINT IF EXISTS attendance_sessions_checkin_window_check;
ALTER TABLE public.attendance_sessions
  ADD CONSTRAINT attendance_sessions_checkin_window_check
  CHECK (
    (starts_at IS NULL AND ends_at IS NULL)
    OR (starts_at IS NOT NULL AND ends_at IS NOT NULL AND ends_at>starts_at)
  );

-- Mỗi đại biểu có định danh barcode riêng, độc lập với tên/mã tự nhập DB001.
-- Barcode chỉ để TRA CỨU dự phòng, không phải bằng chứng xác thực danh tính.
ALTER TABLE public.delegates ADD COLUMN IF NOT EXISTS barcode_code text;
UPDATE public.delegates
SET barcode_code='DB' || upper(substr(md5(gen_random_uuid()::text),1,20))
WHERE barcode_code IS NULL;
ALTER TABLE public.delegates
  ALTER COLUMN barcode_code SET DEFAULT ('DB' || upper(substr(md5(gen_random_uuid()::text),1,20)));
ALTER TABLE public.delegates ALTER COLUMN barcode_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS delegates_barcode_code_unique
  ON public.delegates(barcode_code);
ALTER TABLE public.delegates
  DROP CONSTRAINT IF EXISTS delegates_barcode_code_format;
ALTER TABLE public.delegates
  ADD CONSTRAINT delegates_barcode_code_format CHECK (barcode_code ~ '^DB[0-9A-F]{20}$');

-- Dấu vết phân biệt QR cố định với QR của một phiên, hoặc phương án dự phòng.
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS qr_scope text;
UPDATE public.checkins SET qr_scope='fixed'
WHERE method='qr' AND qr_scope IS NULL;
ALTER TABLE public.checkins DROP CONSTRAINT IF EXISTS checkins_method_check;
ALTER TABLE public.checkins ADD CONSTRAINT checkins_method_check
  CHECK(method IN ('qr','manual','barcode'));
ALTER TABLE public.checkins DROP CONSTRAINT IF EXISTS checkins_qr_scope_check;
ALTER TABLE public.checkins ADD CONSTRAINT checkins_qr_scope_check CHECK(
  (method='qr' AND qr_scope IN ('fixed','session'))
  OR (method IN ('manual','barcode') AND qr_scope IS NULL)
);

-- Vô hiệu hóa quyền ghi trực tiếp. Chỉ Next.js server đã xác thực user
-- và kiểm tra QR mới được insert bằng SUPABASE_SECRET_KEY trên server.
REVOKE INSERT ON public.checkins FROM anon, authenticated;
DROP POLICY IF EXISTS checkins_staff_insert ON public.checkins;

CREATE OR REPLACE FUNCTION private.validate_checkin_window()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE s record;
BEGIN
  SELECT id, status, qr_policy, starts_at, ends_at INTO s
  FROM public.attendance_sessions
  WHERE id=NEW.session_id AND congress_id=NEW.congress_id
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CHECKIN_SESSION_MISSING'; END IF;
  IF s.status <> 'open' THEN RAISE EXCEPTION 'CHECKIN_SESSION_CLOSED'; END IF;
  IF s.starts_at IS NULL OR s.ends_at IS NULL
    THEN RAISE EXCEPTION 'CHECKIN_WINDOW_NOT_CONFIGURED'; END IF;
  IF clock_timestamp() < s.starts_at OR clock_timestamp() >= s.ends_at
    THEN RAISE EXCEPTION 'CHECKIN_OUTSIDE_WINDOW'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.delegates
    WHERE id=NEW.delegate_id AND congress_id=NEW.congress_id AND is_active
  ) THEN RAISE EXCEPTION 'CHECKIN_DELEGATE_INACTIVE'; END IF;
  IF NEW.method='qr' AND NOT (
    s.qr_policy='both' OR s.qr_policy=NEW.qr_scope
  ) THEN RAISE EXCEPTION 'CHECKIN_QR_SCOPE_DENIED'; END IF;
  IF NEW.method IN ('barcode','manual')
     AND length(trim(coalesce(NEW.note,'')))<3
    THEN RAISE EXCEPTION 'CHECKIN_NOTE_REQUIRED'; END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.validate_checkin_window() FROM PUBLIC;
DROP TRIGGER IF EXISTS validate_checkin_window_trigger ON public.checkins;
CREATE TRIGGER validate_checkin_window_trigger
BEFORE INSERT ON public.checkins
FOR EACH ROW EXECUTE FUNCTION private.validate_checkin_window();

-- Audit ghi NGUYÊN TỬ trong cùng transaction. Giao dịch service_role chỉ
-- xảy ra trên server có secret key, sau khi đã xác thực operator và quyền.
CREATE OR REPLACE FUNCTION private.log_checkin_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF coalesce(auth.jwt()->>'role','') <> 'service_role'
      AND ((SELECT auth.uid()) IS NULL OR NEW.checked_in_by <> (SELECT auth.uid()))
  THEN RAISE EXCEPTION 'Invalid checkin actor'; END IF;
  INSERT INTO public.audit_logs(congress_id,actor_id,action,target_id,details)
  VALUES (
    NEW.congress_id,NEW.checked_in_by,'checkin.created',NEW.delegate_id,
    jsonb_build_object('sessionId',NEW.session_id,'method',NEW.method,'qrScope',NEW.qr_scope)
  );
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.log_checkin_insert() FROM PUBLIC;
COMMIT;
