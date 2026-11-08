-- Đại hội số: hồ sơ sinh viên, tài khoản đăng nhập và vai trò khách mời.
-- Áp dụng sau schema.sql và các bản nâng cấp v2-v4. Không xóa dữ liệu cũ.
BEGIN;

ALTER TABLE public.delegates
  ADD COLUMN IF NOT EXISTS student_id text,
  ADD COLUMN IF NOT EXISTS position text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS login_email text,
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS delegates_congress_student_unique
  ON public.delegates(congress_id, lower(student_id))
  WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS delegates_login_email_idx
  ON public.delegates(lower(login_email))
  WHERE login_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS delegates_auth_user_idx
  ON public.delegates(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

ALTER TABLE public.congress_members DROP CONSTRAINT IF EXISTS congress_members_role_check;
ALTER TABLE public.congress_members ADD CONSTRAINT congress_members_role_check
  CHECK (role IN ('admin','checkin','secretary','delegate','guest'));

-- Guest/delegate chỉ có quyền xem. Quyền quản lý/điểm danh giữ nguyên.
CREATE OR REPLACE FUNCTION private.has_congress_role(p_congress uuid,p_required text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL AND
  (private.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.congress_members cm
    WHERE cm.congress_id=p_congress AND cm.user_id=(SELECT auth.uid())
      AND (
        (p_required='admin' AND cm.role='admin') OR
        (p_required='checkin' AND cm.role IN ('admin','checkin')) OR
        (p_required='viewer' AND cm.role IN ('admin','checkin','secretary','delegate','guest'))
      )
  ));
$$;
REVOKE ALL ON FUNCTION private.has_congress_role(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_congress_role(uuid,text) TO authenticated;
COMMIT;
