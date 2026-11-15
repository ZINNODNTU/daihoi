-- V83: A published, immutable-in-count snapshot of the new BCH for a congress.
-- Publication is EXPLICIT by BTC via the ballot room; never infer a public list
-- just because private vote totals exist. Service role reads/writes only.
BEGIN;

CREATE TABLE IF NOT EXISTS public.bch_new_committee_publications (
 congress_id uuid PRIMARY KEY REFERENCES public.congresses(id) ON DELETE CASCADE,
 member_ids uuid[] NOT NULL,
 member_count integer NOT NULL CHECK (member_count BETWEEN 1 AND 500),
 published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 published_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT bch_new_committee_exact_size CHECK (cardinality(member_ids)=member_count)
);
ALTER TABLE public.bch_new_committee_publications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bch_new_committee_publications FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.bch_new_committee_publications TO service_role;

-- The ballot update RPC also locks the congress before tally writes. Taking the
-- same row lock here prevents concurrent tally updates from racing publication.
CREATE OR REPLACE FUNCTION public.publish_bch_new_committee_v83(
 p_congress_id uuid,p_member_ids uuid[],p_acknowledge_tie boolean,p_published_by uuid
) RETURNS TABLE(published_count integer,publication_time timestamptz)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE
 v_total integer;
 v_candidate_count integer;
 v_invalid_count integer;
 v_selected_count integer;
 v_lowest_selected integer;
 v_highest_unselected integer;
 v_publication_time timestamptz;
BEGIN
 IF p_congress_id IS NULL OR p_published_by IS NULL OR p_member_ids IS NULL OR
  cardinality(p_member_ids)<1 OR cardinality(p_member_ids)>500 OR
  array_position(p_member_ids,NULL) IS NOT NULL THEN
  RAISE EXCEPTION 'Invalid new BCH publication request' USING ERRCODE='22023';
 END IF;
 IF (SELECT COUNT(DISTINCT x.candidate_id) FROM unnest(p_member_ids) AS x(candidate_id))<>cardinality(p_member_ids) THEN
  RAISE EXCEPTION 'New BCH contains duplicated candidate IDs' USING ERRCODE='22023';
 END IF;

 SELECT c.bch_total_ballots INTO v_total FROM public.congresses c
 WHERE c.id=p_congress_id AND c.kind='doan' FOR UPDATE;
 IF NOT FOUND OR v_total IS NULL OR v_total<1 THEN
  RAISE EXCEPTION 'Congress has no shared ballot denominator' USING ERRCODE='22023';
 END IF;

 SELECT COUNT(*),COUNT(*) FILTER(WHERE votes_received IS NULL OR votes_received<0 OR votes_received>v_total)
 INTO v_candidate_count,v_invalid_count FROM public.bch_candidates WHERE congress_id=p_congress_id;
 IF v_invalid_count<>0 OR v_candidate_count<cardinality(p_member_ids) THEN
  RAISE EXCEPTION 'All candidate tallies must be valid before publication' USING ERRCODE='22023';
 END IF;

 SELECT COUNT(*),MIN(votes_received) INTO v_selected_count,v_lowest_selected
 FROM public.bch_candidates WHERE congress_id=p_congress_id AND id=ANY(p_member_ids);
 IF v_selected_count<>cardinality(p_member_ids) THEN
  RAISE EXCEPTION 'New BCH contains unknown candidate IDs' USING ERRCODE='22023';
 END IF;

 SELECT MAX(votes_received) INTO v_highest_unselected
 FROM public.bch_candidates WHERE congress_id=p_congress_id AND id<>ALL(p_member_ids);
 IF v_highest_unselected>v_lowest_selected THEN
  RAISE EXCEPTION 'Published shortlist does not contain the highest vote counts' USING ERRCODE='22023';
 END IF;
 IF v_highest_unselected=v_lowest_selected AND p_acknowledge_tie IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'Tie at the election cutoff must be acknowledged by BTC' USING ERRCODE='22023';
 END IF;

 v_publication_time=clock_timestamp();
 INSERT INTO public.bch_new_committee_publications
  (congress_id,member_ids,member_count,published_by,published_at)
 VALUES(p_congress_id,p_member_ids,cardinality(p_member_ids),p_published_by,v_publication_time)
 ON CONFLICT(congress_id) DO UPDATE SET
  member_ids=EXCLUDED.member_ids,member_count=EXCLUDED.member_count,
  published_by=EXCLUDED.published_by,published_at=EXCLUDED.published_at;

 RETURN QUERY SELECT cardinality(p_member_ids),v_publication_time;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_bch_new_committee_v83(uuid,uuid[],boolean,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.publish_bch_new_committee_v83(uuid,uuid[],boolean,uuid) TO service_role;
COMMENT ON TABLE public.bch_new_committee_publications IS
 'Publicly announced new BCH snapshot per congress. Only service role can read; API enforces portal/guest access. No vote counts included.';
COMMIT;
