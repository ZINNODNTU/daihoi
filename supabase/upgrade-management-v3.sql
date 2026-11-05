-- ĐẠI HỘI SỐ / BẢO VỆ QUẢN TRỊ V3
-- Chạy SAU upgrade-attendance-v2.sql, sau khi đã backup và xác minh project.
-- Project duy nhất: pnxdxdagpeyqarucdphk.
-- NÊN DEPLOY API MỚI TRƯỚC KHI CHẠY: dùng server-only SUPABASE_SECRET_KEY.
BEGIN;

-- Các API Next.js tự kiểm tra auth + role rồi mới dùng server-only key để ghi.
-- Client dù là admin không được ghi trực tiếp để né validation và audit.
REVOKE INSERT, UPDATE, DELETE ON public.congress_members FROM anon, authenticated;
REVOKE INSERT, UPDATE ON public.attendance_sessions FROM anon, authenticated;
REVOKE INSERT ON public.documents FROM anon, authenticated;
REVOKE UPDATE ON public.congresses FROM anon, authenticated;

DROP POLICY IF EXISTS members_admin_insert ON public.congress_members;
DROP POLICY IF EXISTS members_admin_update ON public.congress_members;
DROP POLICY IF EXISTS members_admin_delete ON public.congress_members;
DROP POLICY IF EXISTS sessions_admin_insert ON public.attendance_sessions;
DROP POLICY IF EXISTS sessions_admin_update ON public.attendance_sessions;
DROP POLICY IF EXISTS documents_admin_insert ON public.documents;
DROP POLICY IF EXISTS congresses_admin_update ON public.congresses;

-- Không cho sửa lại loại QR / giờ của phiên đã ghi nhận check-in.
-- Check-in trigger khóa session FOR SHARE; cập nhật này sẽ tuần tự hóa với lượt quét.
CREATE OR REPLACE FUNCTION private.prevent_attendance_reconfiguration()
RETURNS trigger LANGUAGE plpgsql SET search_path=''
AS $$
BEGIN
 IF (
  NEW.starts_at IS DISTINCT FROM OLD.starts_at OR
  NEW.ends_at IS DISTINCT FROM OLD.ends_at OR
  NEW.qr_policy IS DISTINCT FROM OLD.qr_policy
 ) AND EXISTS (
  SELECT 1 FROM public.checkins c WHERE c.session_id=OLD.id
 ) THEN
  RAISE EXCEPTION 'SESSION_CONFIGURATION_LOCKED';
 END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.prevent_attendance_reconfiguration() FROM PUBLIC;
DROP TRIGGER IF EXISTS prevent_attendance_reconfiguration ON public.attendance_sessions;
CREATE TRIGGER prevent_attendance_reconfiguration
 BEFORE UPDATE OF starts_at,ends_at,qr_policy ON public.attendance_sessions
 FOR EACH ROW EXECUTE FUNCTION private.prevent_attendance_reconfiguration();

COMMIT;
