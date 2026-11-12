-- V60: Cross-account RBAC groups scoped to one Congress. Apply after V58.
-- Existing roles/credentials remain intact. No automatic privilege escalation.
BEGIN;
CREATE TABLE IF NOT EXISTS public.rbac_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 congress_id uuid NOT NULL REFERENCES public.congresses(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('admin','checkin','secretary','delegate','guest')),
 name text NOT NULL CHECK(char_length(trim(name)) BETWEEN 2 AND 80),
 abilities text[] NOT NULL DEFAULT '{}'::text[]
  CHECK(cardinality(abilities)<=24 AND abilities <@ ARRAY[
   'workspace.view','delegates.read','delegates.write','quality.read',
   'seating.read','seating.write','bch.read','bch.write','ballots.read','ballots.write',
   'attendance.read','attendance.scan','attendance.sessions','documents.read',
   'documents.write','reports.read',
   'portal.access','portal.card','portal.checkin','portal.seating',
   'portal.documents','portal.bch','portal.history']::text[]),
 created_by uuid REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(congress_id,id),
 UNIQUE(congress_id,role,name)
);
CREATE TABLE IF NOT EXISTS public.rbac_account_assignments (
 congress_id uuid NOT NULL REFERENCES public.congresses(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 group_id uuid NOT NULL,
 updated_by uuid REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(congress_id,user_id),
 FOREIGN KEY(congress_id,group_id) REFERENCES public.rbac_groups(congress_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS rbac_assignments_group_idx ON public.rbac_account_assignments(group_id);
CREATE TABLE IF NOT EXISTS public.rbac_portal_denials (
 congress_id uuid NOT NULL REFERENCES public.congresses(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 ability text NOT NULL CHECK(ability IN
  ('portal.access','portal.card','portal.checkin','portal.seating',
   'portal.documents','portal.bch','portal.history')),
 updated_by uuid REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(congress_id,user_id,ability)
);
-- Never expose RBAC mutations to ordinary browser sessions.
ALTER TABLE public.rbac_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_account_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_portal_denials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.rbac_groups,public.rbac_account_assignments,public.rbac_portal_denials
 FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE public.rbac_groups,public.rbac_account_assignments,public.rbac_portal_denials TO service_role;
-- Authenticated staff may query only their own group through RLS; service_role
-- resolves the full organizational directory in Next.js admin routes.
GRANT SELECT ON TABLE public.rbac_groups,public.rbac_account_assignments,public.rbac_portal_denials TO authenticated;
CREATE POLICY rbac_group_self_read ON public.rbac_groups FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.rbac_account_assignments a
  WHERE a.group_id=rbac_groups.id AND a.congress_id=rbac_groups.congress_id
    AND a.user_id=(select auth.uid())));
CREATE POLICY rbac_assignment_self_read ON public.rbac_account_assignments FOR SELECT TO authenticated
 USING (user_id=(select auth.uid()));
CREATE POLICY rbac_portal_denial_self_read ON public.rbac_portal_denials FOR SELECT TO authenticated
 USING (user_id=(select auth.uid()));
-- Cross-role group assignment is forbidden, even if a service-role caller is buggy.
CREATE OR REPLACE FUNCTION private.rbac_validate_assignment_v60()
 RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
 DECLARE v_role text;
 BEGIN
  SELECT g.role INTO v_role FROM public.rbac_groups g
    WHERE g.id=NEW.group_id AND g.congress_id=NEW.congress_id;
  IF v_role IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.congress_members m
    WHERE m.congress_id=NEW.congress_id AND m.user_id=NEW.user_id AND m.role=v_role
  ) THEN
    RAISE EXCEPTION 'RBAC_GROUP_ROLE_MISMATCH' USING ERRCODE='42501';
  END IF;
  IF v_role IN ('admin','checkin','secretary') AND NOT EXISTS (
    SELECT 1 FROM public.btc_accounts b
    WHERE b.congress_id=NEW.congress_id AND b.user_id=NEW.user_id AND b.disabled_at IS NULL
  ) THEN
    RAISE EXCEPTION 'RBAC_DISABLED_STAFF' USING ERRCODE='42501';
  END IF;
  IF v_role='delegate' AND NOT EXISTS (
    SELECT 1 FROM public.delegates d WHERE d.congress_id=NEW.congress_id
    AND d.auth_user_id=NEW.user_id AND d.is_active
  ) THEN
    RAISE EXCEPTION 'RBAC_NO_DELEGATE' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
 END $$;
DROP TRIGGER IF EXISTS rbac_assignment_guard_v60 ON public.rbac_account_assignments;
CREATE TRIGGER rbac_assignment_guard_v60 BEFORE INSERT OR UPDATE
 ON public.rbac_account_assignments FOR EACH ROW
 EXECUTE FUNCTION private.rbac_validate_assignment_v60();
-- Legacy role and per-account overrides remain the upper bound. An assigned
-- group is an ADDITIONAL restrictive condition, not a new permission grant.
CREATE OR REPLACE FUNCTION private.rbac_staff_group_allows_v60(p_congress uuid,p_ability text)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT NOT EXISTS (
  SELECT 1 FROM public.rbac_account_assignments a
  JOIN public.rbac_groups g ON g.id=a.group_id AND g.congress_id=a.congress_id
  JOIN public.congress_members m ON m.user_id=a.user_id AND m.congress_id=a.congress_id
  WHERE a.congress_id=p_congress AND a.user_id=(select auth.uid())
    AND m.role=g.role AND g.role IN ('admin','checkin','secretary')
    AND NOT (p_ability=ANY(g.abilities))
 ) $$;
REVOKE ALL ON FUNCTION private.rbac_staff_group_allows_v60(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.rbac_staff_group_allows_v60(uuid,text) TO authenticated;
-- Preserve team.manage/settings.manage as fixed role capabilities (not editable
-- group switches). Restrict direct PostgREST CRUD for principal data tables.
DO $$
DECLARE p record;
BEGIN
 FOR p IN SELECT * FROM (VALUES
  ('public.delegates','delegates.write','INSERT'),
  ('public.delegates','delegates.write','UPDATE'),
  ('public.bch_candidates','bch.write','INSERT'),
  ('public.bch_candidates','bch.write','UPDATE'),
  ('public.documents','documents.write','INSERT'),
  ('public.documents','documents.write','UPDATE'),
  ('public.seating_layouts','seating.write','INSERT'),
  ('public.seating_layouts','seating.write','UPDATE'),
  ('public.attendance_sessions','attendance.sessions','INSERT'),
  ('public.attendance_sessions','attendance.sessions','UPDATE')
 ) AS x(tab,ability,cmd) LOOP
  IF to_regclass(p.tab) IS NOT NULL THEN
   EXECUTE format('DROP POLICY IF EXISTS %I ON %s',
      'rbac_v60_'||replace(p.ability,'.','_')||'_'||lower(p.cmd),p.tab);
   EXECUTE format('CREATE POLICY %I ON %s AS RESTRICTIVE FOR %s TO authenticated %s',
    'rbac_v60_'||replace(p.ability,'.','_')||'_'||lower(p.cmd),p.tab,p.cmd,
    CASE WHEN p.cmd='INSERT' THEN
     format('WITH CHECK (private.rbac_staff_group_allows_v60(congress_id,%L))',p.ability)
    ELSE format('USING (private.rbac_staff_group_allows_v60(congress_id,%L)) WITH CHECK (private.rbac_staff_group_allows_v60(congress_id,%L))',p.ability,p.ability) END);
  END IF;
 END LOOP;
END $$;
-- Group restrictions on direct PostgREST reads, not only Next.js routes.
DO $$
DECLARE p record;
BEGIN
 FOR p IN SELECT * FROM (VALUES
  ('public.delegates','delegates.read'),
  ('public.bch_candidates','bch.read'),
  ('public.documents','documents.read'),
  ('public.seating_layouts','seating.read'),
  ('public.attendance_sessions','attendance.read'),
  ('public.checkins','attendance.read')
 ) AS x(tab,ability) LOOP
  IF to_regclass(p.tab) IS NOT NULL THEN
   EXECUTE format('DROP POLICY IF EXISTS %I ON %s',
    'rbac_v60_group_read_'||replace(p.ability,'.','_'),p.tab);
   EXECUTE format('CREATE POLICY %I ON %s AS RESTRICTIVE FOR SELECT TO authenticated USING (private.rbac_staff_group_allows_v60(congress_id,%L))',
    'rbac_v60_group_read_'||replace(p.ability,'.','_'),p.tab,p.ability);
  END IF;
 END LOOP;
END $$;

-- A portal account cannot bypass an individual/group denial with its
-- publishable-key PostgREST client; the same restrictions apply in RLS.
CREATE OR REPLACE FUNCTION private.rbac_portal_allowed_v60(p_congress uuid,p_ability text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_role text; v_uid uuid;
BEGIN
 v_uid:=(select auth.uid());
 IF v_uid IS NULL THEN RETURN false; END IF;
 SELECT m.role INTO v_role FROM public.congress_members m
 WHERE m.congress_id=p_congress AND m.user_id=v_uid AND m.role IN ('delegate','guest');
 IF v_role IS NULL THEN RETURN true; END IF;
 IF EXISTS(SELECT 1 FROM public.rbac_portal_denials d
  WHERE d.congress_id=p_congress AND d.user_id=v_uid
   AND d.ability IN ('portal.access',p_ability)) THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM public.rbac_account_assignments a
  JOIN public.rbac_groups g ON g.id=a.group_id AND g.congress_id=a.congress_id
  WHERE a.congress_id=p_congress AND a.user_id=v_uid
   AND g.role=v_role
   AND (NOT ('portal.access'=ANY(g.abilities)) OR NOT (p_ability=ANY(g.abilities)))
 ) THEN RETURN false; END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION private.rbac_portal_allowed_v60(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.rbac_portal_allowed_v60(uuid,text) TO authenticated;
DO $$
DECLARE p record;
BEGIN
 FOR p IN SELECT * FROM (VALUES
  ('public.delegates','portal.card'),
  ('public.documents','portal.documents'),
  ('public.bch_candidates','portal.bch'),
  ('public.seating_layouts','portal.seating'),
  ('public.attendance_sessions','portal.checkin'),
  ('public.checkins','portal.history')
 ) AS x(tab,ability) LOOP
  IF to_regclass(p.tab) IS NOT NULL THEN
   EXECUTE format('DROP POLICY IF EXISTS %I ON %s',
    'rbac_v60_portal_read_'||replace(p.ability,'.','_'),p.tab);
   EXECUTE format('CREATE POLICY %I ON %s AS RESTRICTIVE FOR SELECT TO authenticated USING (private.rbac_portal_allowed_v60(congress_id,%L))',
    'rbac_v60_portal_read_'||replace(p.ability,'.','_'),p.tab,p.ability);
  END IF;
 END LOOP;
END $$;
-- Remove stale group memberships when the underlying identity is removed
-- or its legacy role is changed (prevents orphaned restrictive assignments).
CREATE OR REPLACE FUNCTION private.rbac_cleanup_membership_v60()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='DELETE' OR OLD.role IS DISTINCT FROM NEW.role THEN
  DELETE FROM public.rbac_account_assignments a
   WHERE a.congress_id=OLD.congress_id AND a.user_id=OLD.user_id;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS rbac_cleanup_member_v60 ON public.congress_members;
CREATE TRIGGER rbac_cleanup_member_v60
 AFTER UPDATE OF role OR DELETE ON public.congress_members
 FOR EACH ROW EXECUTE FUNCTION private.rbac_cleanup_membership_v60();
COMMIT;
