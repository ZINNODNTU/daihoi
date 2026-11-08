-- Đại hội số v11: tách quyền đại biểu khỏi nghiệp vụ quản trị.
-- Chạy sau upgrade-delegate-accounts-v5.sql và upgrade-attendance-session-seating-v10.sql.
-- Chỉ staff (admin/checkin/secretary) và super_admin được xem bảng nghiệp vụ.
-- Delegate/guest chỉ đọc bản ghi cá nhân qua RLS.
BEGIN;

CREATE OR REPLACE FUNCTION private.has_congress_role(p_congress uuid,p_required text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
 SELECT (SELECT auth.uid()) IS NOT NULL AND (
  private.is_super_admin()
  OR EXISTS (
   SELECT 1 FROM public.congress_members cm
   WHERE cm.congress_id=p_congress
     AND cm.user_id=(SELECT auth.uid())
     AND (
      (p_required='admin' AND cm.role='admin') OR
      (p_required='checkin' AND cm.role IN ('admin','checkin')) OR
      (p_required='viewer' AND cm.role IN ('admin','checkin','secretary'))
     )
  )
 );
$$;
REVOKE ALL ON FUNCTION private.has_congress_role(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_congress_role(uuid,text) TO authenticated;

-- Quyền SELECT giới hạn cho chính đại biểu được liên kết với auth.users.
-- Không cấp quyền đọc danh sách phiên/ghế/đại biểu của người khác.
DROP POLICY IF EXISTS delegates_self_read ON public.delegates;
CREATE POLICY delegates_self_read ON public.delegates
 FOR SELECT TO authenticated
 USING (auth_user_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS checkins_self_read ON public.checkins;
CREATE POLICY checkins_self_read ON public.checkins
 FOR SELECT TO authenticated
 USING (
  EXISTS (
   SELECT 1 FROM public.delegates d
   WHERE d.id=checkins.delegate_id
     AND d.congress_id=checkins.congress_id
     AND d.auth_user_id=(SELECT auth.uid())
  )
 );

-- Tối ưu tra cứu các bản ghi cá nhân.
CREATE INDEX IF NOT EXISTS delegates_auth_user_active_idx
 ON public.delegates(auth_user_id,congress_id)
 WHERE auth_user_id IS NOT NULL AND is_active=true;
CREATE INDEX IF NOT EXISTS checkins_delegate_time_idx
 ON public.checkins(delegate_id,checked_in_at DESC);

COMMIT;
