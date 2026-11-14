-- V65: Exactly one primary administrative BTC identity per congress.
-- Apply after V45/V60. If a congress has multiple legacy admin memberships,
-- FAIL instead of silently demoting users or changing existing credentials.
BEGIN;
ALTER TABLE public.btc_accounts
 ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

DO $$
BEGIN
 IF EXISTS (
  SELECT congress_id FROM public.congress_members WHERE role='admin'
  GROUP BY congress_id HAVING count(*)>1
 ) THEN
  RAISE EXCEPTION 'V65: multiple BTC admins in one congress; resolve roles explicitly before migration';
 END IF;
 IF EXISTS (
  SELECT 1 FROM public.congress_members m WHERE m.role='admin'
  AND NOT EXISTS (
   SELECT 1 FROM public.btc_accounts b WHERE b.congress_id=m.congress_id
    AND b.user_id=m.user_id AND b.disabled_at IS NULL
  )
 ) THEN
  RAISE EXCEPTION 'V65: legacy BTC admin without an enabled independent BTC account';
 END IF;
END $$;

-- Backfill one current admin per congress, without changing passwords.
UPDATE public.btc_accounts b SET is_primary=true
FROM public.congress_members m
WHERE m.congress_id=b.congress_id AND m.user_id=b.user_id AND m.role='admin'
 AND b.disabled_at IS NULL AND b.is_primary=false;

CREATE UNIQUE INDEX IF NOT EXISTS btc_one_primary_per_congress_v65
 ON public.btc_accounts(congress_id) WHERE is_primary;
CREATE UNIQUE INDEX IF NOT EXISTS btc_one_admin_member_per_congress_v65
 ON public.congress_members(congress_id) WHERE role='admin';

-- Admin role requires the primary account, even if the REST API is bypassed.
CREATE OR REPLACE FUNCTION private.enforce_btc_primary_role_v65()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
 AS $$
DECLARE primary_account boolean;
BEGIN
 SELECT b.is_primary INTO primary_account
 FROM public.btc_accounts b WHERE b.user_id=NEW.user_id
  AND b.congress_id=NEW.congress_id AND b.disabled_at IS NULL;
 IF NEW.role='admin' AND primary_account IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'BTC admin must be the primary account' USING ERRCODE='23514';
 END IF;
 IF primary_account IS TRUE AND NEW.role IS DISTINCT FROM 'admin' THEN
  RAISE EXCEPTION 'Cannot demote the primary BTC account' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.enforce_btc_primary_role_v65() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS enforce_btc_primary_role_v65 ON public.congress_members;
CREATE TRIGGER enforce_btc_primary_role_v65 BEFORE INSERT OR UPDATE
 ON public.congress_members FOR EACH ROW
 EXECUTE FUNCTION private.enforce_btc_primary_role_v65();

-- Do not allow an active primary administrator to be disabled/reclassified.
-- Congress deletion itself can still cascade normally.
CREATE OR REPLACE FUNCTION private.protect_btc_primary_v65()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
 AS $$
BEGIN
 IF OLD.is_primary AND (NEW.disabled_at IS NOT NULL OR NOT NEW.is_primary OR
  NEW.congress_id IS DISTINCT FROM OLD.congress_id) THEN
  RAISE EXCEPTION 'Cannot disable or reclassify primary BTC account' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION private.protect_btc_primary_v65() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS protect_btc_primary_v65 ON public.btc_accounts;
CREATE TRIGGER protect_btc_primary_v65 BEFORE UPDATE ON public.btc_accounts
 FOR EACH ROW EXECUTE FUNCTION private.protect_btc_primary_v65();

NOTIFY pgrst,'reload schema';
COMMIT;
