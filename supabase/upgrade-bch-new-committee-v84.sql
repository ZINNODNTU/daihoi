-- V84 — Public new BCH uses existing congress + candidate/ballot data.
-- No new table and no duplicate candidate profile data. Run after V58.
-- Safe when V83 was never installed; optionally imports a prior V83 snapshot.
BEGIN;

-- Backfill from an earlier V83 release at most ONCE. Re-running this migration
-- after BTC retracts a publication must never resurrect the old V83 snapshot.
DO $migrate$
DECLARE v_had_columns boolean;
BEGIN
 SELECT EXISTS(
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='congresses'
   AND column_name='bch_new_member_ids'
 ) INTO v_had_columns;
 ALTER TABLE public.congresses
  ADD COLUMN IF NOT EXISTS bch_new_member_ids uuid[],
  ADD COLUMN IF NOT EXISTS bch_new_published_at timestamptz;
 IF NOT v_had_columns AND to_regclass('public.bch_new_committee_publications') IS NOT NULL THEN
  EXECUTE $sql$
   UPDATE public.congresses c
   SET bch_new_member_ids=p.member_ids,bch_new_published_at=p.published_at
   FROM public.bch_new_committee_publications p
   WHERE c.id=p.congress_id AND c.bch_new_member_ids IS NULL
    AND p.member_count=cardinality(p.member_ids)
    AND cardinality(p.member_ids) BETWEEN 1 AND 500
  $sql$;
 END IF;
END
$migrate$;

ALTER TABLE public.congresses DROP CONSTRAINT IF EXISTS congress_bch_new_publication_check;
ALTER TABLE public.congresses ADD CONSTRAINT congress_bch_new_publication_check CHECK (
 (bch_new_member_ids IS NULL AND bch_new_published_at IS NULL)
 OR
 (bch_new_member_ids IS NOT NULL AND bch_new_published_at IS NOT NULL
  AND cardinality(bch_new_member_ids) BETWEEN 1 AND 500
  AND array_position(bch_new_member_ids,NULL) IS NULL)
);
COMMENT ON COLUMN public.congresses.bch_new_member_ids IS
 'Published ordered BCH candidate IDs only; biodata/photos stay in bch_candidates, votes stay private.';
COMMENT ON COLUMN public.congresses.bch_new_published_at IS
 'NULL until BTC explicitly publishes BCH khóa mới; NULL again after retraction.';

-- Recheck current official BTC tally under the SAME congress row lock used by
-- set_bch_shared_ballot_total and set_bch_candidate_votes_v58. No client can
-- send candidate biodata or independently chosen IDs as publication authority.
CREATE OR REPLACE FUNCTION public.publish_bch_new_committee_v84(
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
 IF (SELECT COUNT(DISTINCT x.candidate_id) FROM unnest(p_member_ids) AS x(candidate_id))
     <>cardinality(p_member_ids) THEN
  RAISE EXCEPTION 'New BCH contains duplicated candidate IDs' USING ERRCODE='22023';
 END IF;

 SELECT c.bch_total_ballots INTO v_total FROM public.congresses c
 WHERE c.id=p_congress_id AND c.kind='doan' FOR UPDATE;
 IF NOT FOUND OR v_total IS NULL OR v_total<1 THEN
  RAISE EXCEPTION 'Congress has no shared ballot denominator' USING ERRCODE='22023';
 END IF;

 SELECT COUNT(*),COUNT(*) FILTER(WHERE votes_received IS NULL OR votes_received<0 OR votes_received>v_total)
 INTO v_candidate_count,v_invalid_count
 FROM public.bch_candidates WHERE congress_id=p_congress_id;
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
 UPDATE public.congresses
 SET bch_new_member_ids=p_member_ids,bch_new_published_at=v_publication_time
 WHERE id=p_congress_id;

 RETURN QUERY SELECT cardinality(p_member_ids),v_publication_time;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_bch_new_committee_v84(uuid,uuid[],boolean,uuid)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.publish_bch_new_committee_v84(uuid,uuid[],boolean,uuid)
 TO service_role;
COMMIT;
