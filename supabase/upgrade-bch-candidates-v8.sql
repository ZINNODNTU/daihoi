-- BCH personnel introduction list; run once after upgrade-delegate-photos-v7.sql.
-- One congress keeps its own independent and protected list.
BEGIN;

CREATE TABLE IF NOT EXISTS public.bch_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  congress_id uuid NOT NULL REFERENCES public.congresses(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK(length(btrim(full_name)) BETWEEN 2 AND 160),
  birth_year integer NOT NULL CHECK(birth_year BETWEEN 1900 AND 2100),
  hometown text NOT NULL CHECK(length(btrim(hometown)) BETWEEN 2 AND 240),
  ethnicity text NOT NULL CHECK(length(btrim(ethnicity)) BETWEEN 1 AND 80),
  education_level text NOT NULL CHECK(length(btrim(education_level)) BETWEEN 2 AND 180),
  union_join_year integer NOT NULL CHECK(union_join_year BETWEEN 1931 AND 2100),
  current_position text NOT NULL CHECK(length(btrim(current_position)) BETWEEN 2 AND 240),
  display_order integer NOT NULL DEFAULT 0 CHECK(display_order BETWEEN 0 AND 10000),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bch_candidate_years_valid CHECK(union_join_year >= birth_year)
);

CREATE INDEX IF NOT EXISTS bch_candidates_congress_order_idx
 ON public.bch_candidates(congress_id,display_order,created_at,id);

ALTER TABLE public.bch_candidates ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.bch_candidates FROM PUBLIC,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.bch_candidates TO authenticated;

DROP POLICY IF EXISTS bch_candidates_member_read ON public.bch_candidates;
CREATE POLICY bch_candidates_member_read ON public.bch_candidates
 FOR SELECT TO authenticated
 USING (
  private.has_congress_role(congress_id,'admin')
  OR EXISTS (
   SELECT 1 FROM public.congress_members member
   WHERE member.congress_id=bch_candidates.congress_id
    AND member.user_id=(select auth.uid()) AND member.role='secretary'
  )
 );

DROP POLICY IF EXISTS bch_candidates_admin_insert ON public.bch_candidates;
CREATE POLICY bch_candidates_admin_insert ON public.bch_candidates
 FOR INSERT TO authenticated
 WITH CHECK (private.has_congress_role(congress_id,'admin') AND created_by=(select auth.uid()));

DROP POLICY IF EXISTS bch_candidates_admin_update ON public.bch_candidates;
CREATE POLICY bch_candidates_admin_update ON public.bch_candidates
 FOR UPDATE TO authenticated
 USING (private.has_congress_role(congress_id,'admin'))
 WITH CHECK (private.has_congress_role(congress_id,'admin'));

DROP POLICY IF EXISTS bch_candidates_admin_delete ON public.bch_candidates;
CREATE POLICY bch_candidates_admin_delete ON public.bch_candidates
 FOR DELETE TO authenticated
 USING (private.has_congress_role(congress_id,'admin'));

COMMIT;
