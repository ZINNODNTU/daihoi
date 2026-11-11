-- V43: Order and safe administration of the congress document library.
-- Removal from the website is metadata-only; Google Drive originals remain intact.
BEGIN;
ALTER TABLE public.documents
 ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 1000000;
-- Preserve the historical newest-first display for existing documents.
WITH ranking AS (
 SELECT id, row_number() OVER (PARTITION BY congress_id ORDER BY created_at DESC,id DESC) AS pos
 FROM public.documents WHERE display_order=1000000
)
UPDATE public.documents d SET display_order=ranking.pos::integer
 FROM ranking WHERE d.id=ranking.id AND d.display_order=1000000;
CREATE INDEX IF NOT EXISTS documents_congress_display_order_idx
 ON public.documents(congress_id,display_order,created_at DESC,id DESC);
CREATE OR REPLACE FUNCTION public.reorder_congress_documents(p_congress_id uuid,p_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
 AS $$
 DECLARE expected_count integer;
 BEGIN
  IF p_congress_id IS NULL OR p_ids IS NULL OR cardinality(p_ids)=0 OR cardinality(p_ids)>800
   OR EXISTS(SELECT 1 FROM unnest(p_ids) item WHERE item IS NULL)
   OR (SELECT count(DISTINCT item) FROM unnest(p_ids) item)<>cardinality(p_ids) THEN
    RAISE EXCEPTION 'Invalid document ordering' USING ERRCODE='22023';
  END IF;
  -- Call is server-only with service_role. Database-side completeness check
  -- protects concurrent edits and prevents one congress changing another.
  SELECT count(*) INTO expected_count
  FROM public.documents WHERE congress_id=p_congress_id;
  IF expected_count<>cardinality(p_ids) OR
    (SELECT count(*) FROM public.documents
     WHERE congress_id=p_congress_id AND id=ANY(p_ids))<>expected_count THEN
    RAISE EXCEPTION 'Document list changed; refresh and try again' USING ERRCODE='22023';
  END IF;
  UPDATE public.documents AS d
   SET display_order=ord.position::integer
   FROM unnest(p_ids) WITH ORDINALITY AS ord(document_id,position)
   WHERE d.congress_id=p_congress_id AND d.id=ord.document_id;
  IF NOT FOUND THEN
   RAISE EXCEPTION 'Document order was not changed' USING ERRCODE='22023';
  END IF;
 END;$$;
REVOKE ALL ON FUNCTION public.reorder_congress_documents(uuid,uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_congress_documents(uuid,uuid[]) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
