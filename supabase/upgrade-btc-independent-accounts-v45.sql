-- V45: Independent, congress-scoped BTC identities.
-- Apply after V5. Auth identities are NOT deleted. Transactional role cleanup
-- preserves delegate access while removing accidental privilege escalation.
BEGIN;
CREATE TABLE IF NOT EXISTS public.btc_accounts (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 congress_id uuid NOT NULL REFERENCES public.congresses(id) ON DELETE CASCADE,
 login_email text NOT NULL UNIQUE,
 full_name text NOT NULL CHECK (length(btrim(full_name)) BETWEEN 2 AND 120),
 created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 disabled_at timestamptz,
 UNIQUE (user_id,congress_id)
);
CREATE INDEX IF NOT EXISTS btc_accounts_congress_idx
 ON public.btc_accounts(congress_id,disabled_at,created_at DESC);
ALTER TABLE public.btc_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.btc_accounts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.btc_accounts TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.btc_accounts TO service_role;
DROP POLICY IF EXISTS btc_accounts_self_read ON public.btc_accounts;
CREATE POLICY btc_accounts_self_read ON public.btc_accounts
 FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));

-- Super Admin is a platform identity, not a BTC account in every congress.
DELETE FROM public.congress_members cm
 USING public.profiles p
 WHERE cm.user_id=p.id AND p.platform_role='super_admin';

-- Restore the portal membership when a delegate was mistakenly promoted to BTC
-- for the SAME congress. Do not delete the delegate/Auth account.
UPDATE public.congress_members cm
 SET role=CASE WHEN d.delegate_type='guest' THEN 'guest' ELSE 'delegate' END
 FROM public.delegates d
 WHERE cm.congress_id=d.congress_id AND cm.user_id=d.auth_user_id
 AND cm.role IN ('admin','checkin','secretary');

-- Refuse migration (rather than silently deleting) if any other legacy staff
-- membership cannot be classified as an isolated BTC account.
DO $$
BEGIN
 IF EXISTS (
   SELECT 1 FROM public.congress_members cm
   WHERE cm.role IN ('admin','checkin','secretary')
    AND NOT EXISTS(SELECT 1 FROM public.btc_accounts b
     WHERE b.user_id=cm.user_id AND b.congress_id=cm.congress_id AND b.disabled_at IS NULL)
 ) THEN
   RAISE EXCEPTION 'Legacy non-BTC staff memberships remain; migrate them manually before V45';
 END IF;
END $$;

-- A user can be a staff member of ONE congress only.
CREATE UNIQUE INDEX IF NOT EXISTS btc_single_congress_user_idx
 ON public.congress_members(user_id) WHERE role IN ('admin','checkin','secretary');

CREATE OR REPLACE FUNCTION private.enforce_btc_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF NEW.role IN ('admin','checkin','secretary') THEN
  IF NOT EXISTS(
   SELECT 1 FROM public.btc_accounts b WHERE b.user_id=NEW.user_id
    AND b.congress_id=NEW.congress_id AND b.disabled_at IS NULL
  ) OR EXISTS(
   SELECT 1 FROM public.delegates d WHERE d.auth_user_id=NEW.user_id
  ) OR EXISTS(
   SELECT 1 FROM public.profiles p WHERE p.id=NEW.user_id AND p.platform_role='super_admin'
  ) THEN
   RAISE EXCEPTION 'BTC membership requires an independent, active congress account' USING ERRCODE='23514';
  END IF;
 ELSIF EXISTS(SELECT 1 FROM public.btc_accounts b WHERE b.user_id=NEW.user_id) THEN
  RAISE EXCEPTION 'BTC account cannot be used as delegate or guest' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.enforce_btc_membership() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS enforce_btc_membership ON public.congress_members;
CREATE TRIGGER enforce_btc_membership BEFORE INSERT OR UPDATE
 ON public.congress_members FOR EACH ROW EXECUTE FUNCTION private.enforce_btc_membership();

CREATE OR REPLACE FUNCTION private.prevent_btc_delegate_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
 IF NEW.auth_user_id IS NOT NULL AND EXISTS(
  SELECT 1 FROM public.btc_accounts WHERE user_id=NEW.auth_user_id
 ) THEN
  RAISE EXCEPTION 'Dedicated BTC account cannot be linked to a delegate record' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.prevent_btc_delegate_link() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS prevent_btc_delegate_link ON public.delegates;
CREATE TRIGGER prevent_btc_delegate_link BEFORE INSERT OR UPDATE OF auth_user_id
 ON public.delegates FOR EACH ROW EXECUTE FUNCTION private.prevent_btc_delegate_link();

-- PostgreSQL RLS must enforce the same separation as server-side APIs.
CREATE OR REPLACE FUNCTION private.has_congress_role(p_congress uuid,p_required text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT (SELECT auth.uid()) IS NOT NULL AND (
   private.is_super_admin() OR EXISTS(
    SELECT 1 FROM public.congress_members cm
    WHERE cm.congress_id=p_congress AND cm.user_id=(SELECT auth.uid()) AND (
     (cm.role IN ('admin','checkin','secretary') AND EXISTS(
      SELECT 1 FROM public.btc_accounts b
      WHERE b.user_id=cm.user_id AND b.congress_id=p_congress AND b.disabled_at IS NULL
     ) AND (
       (p_required='admin' AND cm.role='admin') OR
       (p_required='checkin' AND cm.role IN ('admin','checkin')) OR
       (p_required='viewer')
     ))
     OR (p_required='viewer' AND cm.role IN ('delegate','guest'))
    )
   )
 );
$$;
REVOKE ALL ON FUNCTION private.has_congress_role(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_congress_role(uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;