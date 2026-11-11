-- V39: atomic, admin-only reorder for introduction-list BCH candidates.
-- Run after upgrade-bch-candidates-v8.sql. Existing order is preserved until the first reorder.
BEGIN;

CREATE OR REPLACE FUNCTION public.reorder_bch_candidates(p_congress_id uuid,p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  expected_count integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR
     NOT private.has_congress_role(p_congress_id,'admin') THEN
    RAISE EXCEPTION 'Not authorized to reorder BCH candidates' USING ERRCODE='42501';
  END IF;
  IF p_ids IS NULL OR cardinality(p_ids)=0 OR cardinality(p_ids)>500 OR
     EXISTS(SELECT 1 FROM unnest(p_ids) item WHERE item IS NULL) OR
     (SELECT count(DISTINCT item) FROM unnest(p_ids) item) <> cardinality(p_ids) THEN
    RAISE EXCEPTION 'Invalid ordered candidate IDs' USING ERRCODE='22023';
  END IF;
  SELECT count(*) INTO expected_count
  FROM public.bch_candidates WHERE congress_id=p_congress_id;
  IF expected_count<>cardinality(p_ids) OR
     (SELECT count(*) FROM public.bch_candidates
      WHERE congress_id=p_congress_id AND id=ANY(p_ids))<>expected_count THEN
    RAISE EXCEPTION 'BCH candidate set changed; refresh before reordering' USING ERRCODE='22023';
  END IF;
  UPDATE public.bch_candidates AS candidate
  SET display_order=ord.position::integer,updated_at=now()
  FROM unnest(p_ids) WITH ORDINALITY AS ord(candidate_id,position)
  WHERE candidate.id=ord.candidate_id AND candidate.congress_id=p_congress_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BCH order update was not applied' USING ERRCODE='22023';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_bch_candidates(uuid,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reorder_bch_candidates(uuid,uuid[]) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
