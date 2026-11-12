-- V57: Shared BCH election denominator and account-specific BTC permission restrictions.
-- No tables/rows are deleted. Existing vote counts remain unchanged.
BEGIN;
ALTER TABLE public.congresses
 ADD COLUMN IF NOT EXISTS bch_total_ballots integer
 CHECK (bch_total_ballots BETWEEN 1 AND 1000000 OR bch_total_ballots IS NULL);

-- Backfill only when ALL existing entered candidate denominators agree.
WITH consistent AS (
 SELECT congress_id,MAX(total_ballots) AS total_ballots,
  COUNT(DISTINCT total_ballots) AS distinct_totals
 FROM public.bch_candidates WHERE total_ballots IS NOT NULL
 GROUP BY congress_id
)
UPDATE public.congresses c SET bch_total_ballots=v.total_ballots
FROM consistent v
WHERE c.id=v.congress_id AND c.bch_total_ballots IS NULL AND v.distinct_totals=1;

CREATE OR REPLACE FUNCTION public.set_bch_shared_ballot_total(
 p_congress_id uuid,p_total integer
) RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE current_total integer;
BEGIN
 IF p_total IS NOT NULL AND (p_total<1 OR p_total>1000000) THEN
  RAISE EXCEPTION 'Invalid total ballots' USING ERRCODE='22023';
 END IF;
 SELECT bch_total_ballots INTO current_total FROM public.congresses
 WHERE id=p_congress_id AND kind='doan' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Congress not found or forbidden' USING ERRCODE='42501'; END IF;
 -- Taking locks on current tally records before validation prevents mixed denominators.
 PERFORM 1 FROM public.bch_candidates WHERE congress_id=p_congress_id FOR UPDATE;
 IF EXISTS (SELECT 1 FROM public.bch_candidates WHERE congress_id=p_congress_id
  AND votes_received IS NOT NULL AND (p_total IS NULL OR votes_received>p_total)) THEN
  RAISE EXCEPTION 'Existing candidate votes exceed new total or total was cleared'
   USING ERRCODE='23514';
 END IF;
 UPDATE public.congresses SET bch_total_ballots=p_total WHERE id=p_congress_id;
 -- Preserve V47 paired NULL constraint: update only recorded results.
 UPDATE public.bch_candidates SET total_ballots=p_total,updated_at=now()
 WHERE congress_id=p_congress_id AND votes_received IS NOT NULL;
 RETURN (SELECT count(*)::integer FROM public.bch_candidates
  WHERE congress_id=p_congress_id AND votes_received IS NOT NULL);
END $$;
REVOKE ALL ON FUNCTION public.set_bch_shared_ballot_total(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_bch_shared_ballot_total(uuid,integer) TO authenticated;

-- Individual account permission overrides are RESTRICTIONS within the role's
-- maximum. No role escalation is possible through this table.
CREATE TABLE IF NOT EXISTS public.btc_account_capability_restrictions (
 congress_id uuid NOT NULL REFERENCES public.congresses(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 ability text NOT NULL CHECK(ability IN (
  'workspace.view','delegates.read','delegates.write','quality.read',
  'seating.read','seating.write','bch.read','bch.write',
  'attendance.read','attendance.scan','attendance.sessions',
  'documents.read','documents.write','reports.read'
 )),
 allowed boolean NOT NULL DEFAULT false CHECK (allowed=false),
 updated_by uuid REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(congress_id,user_id,ability)
);
CREATE INDEX IF NOT EXISTS btc_account_restrict_user_idx
 ON public.btc_account_capability_restrictions(user_id,congress_id);
ALTER TABLE public.btc_account_capability_restrictions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.btc_account_capability_restrictions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.btc_account_capability_restrictions TO authenticated;
GRANT ALL ON public.btc_account_capability_restrictions TO service_role;
DROP POLICY IF EXISTS btc_account_restriction_self_read
 ON public.btc_account_capability_restrictions;
CREATE POLICY btc_account_restriction_self_read
 ON public.btc_account_capability_restrictions FOR SELECT TO authenticated
 USING (user_id=(select auth.uid()) AND EXISTS(
  SELECT 1 FROM public.btc_accounts b WHERE b.user_id=(select auth.uid())
  AND b.congress_id=btc_account_capability_restrictions.congress_id AND b.disabled_at IS NULL
 ));

-- Denials are enforced by Next.js middleware/API checks and additional
-- direct PostgREST RLS restrictions on selected core write tables.
CREATE OR REPLACE FUNCTION private.btc_ability_allowed(p_congress uuid,p_ability text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
 SELECT NOT EXISTS(
  SELECT 1 FROM public.btc_account_capability_restrictions r
  WHERE r.congress_id=p_congress AND r.user_id=(select auth.uid())
   AND r.ability=p_ability AND r.allowed=false
 )
$$;
REVOKE ALL ON FUNCTION private.btc_ability_allowed(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.btc_ability_allowed(uuid,text) TO authenticated;
-- Existing RLS policies continue restricting access by role; this adds a
-- second, per-account denial gate for direct database writes.
DO $$
DECLARE p record;
BEGIN
 FOR p IN SELECT * FROM (VALUES
 ('public.bch_candidates'::regclass,'bch_candidate_insert','bch.write','INSERT'),
 ('public.bch_candidates'::regclass,'bch_candidate_update','bch.write','UPDATE'),
 ('public.delegates'::regclass,'delegates_admin_insert','delegates.write','INSERT'),
 ('public.delegates'::regclass,'delegates_admin_update','delegates.write','UPDATE'),
 ('public.congresses'::regclass,'congresses_admin_update','settings.manage','UPDATE')
 ) AS x(tab,policy_name,ability,cmd) LOOP
  -- Policies with OR combine permissively, so explicitly make denial RESTRICTIVE.
  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', 'btc_restrict_'||replace(p.ability,'.','_')||'_'||lower(p.cmd),p.tab);
  EXECUTE format('CREATE POLICY %I ON %s AS RESTRICTIVE FOR %s TO authenticated %s',
   'btc_restrict_'||replace(p.ability,'.','_')||'_'||lower(p.cmd),
   p.tab,p.cmd,
   CASE WHEN p.cmd='INSERT' THEN
     format('WITH CHECK (private.btc_ability_allowed(congress_id,%L))',p.ability)
   WHEN p.tab='public.congresses'::regclass THEN
     format('USING (private.btc_ability_allowed(id,%L)) WITH CHECK (private.btc_ability_allowed(id,%L))',p.ability,p.ability)
   ELSE
     format('USING (private.btc_ability_allowed(congress_id,%L)) WITH CHECK (private.btc_ability_allowed(congress_id,%L))',p.ability,p.ability)
   END);
 END LOOP;
END $$;
COMMIT;
