-- Dai hoi so: delegate code assigned atomically by database, private delegate photos.
-- Apply after upgrade-delegate-accounts-v5.sql and upgrade-seating-v6.sql.
BEGIN;

ALTER TABLE public.delegates
  ADD COLUMN IF NOT EXISTS photo_path text;
ALTER TABLE public.delegates
  DROP CONSTRAINT IF EXISTS delegates_photo_path_length_check;
ALTER TABLE public.delegates
  ADD CONSTRAINT delegates_photo_path_length_check
  CHECK (photo_path IS NULL OR length(photo_path) <= 300);

CREATE TABLE IF NOT EXISTS private.delegate_code_counters (
  congress_id uuid PRIMARY KEY REFERENCES public.congresses(id) ON DELETE CASCADE,
  last_number integer NOT NULL CHECK (last_number >= 0)
);
REVOKE ALL ON TABLE private.delegate_code_counters FROM PUBLIC,anon,authenticated;

-- Migrate counters in case earlier delegates already had system-assigned codes.
INSERT INTO private.delegate_code_counters(congress_id,last_number)
SELECT d.congress_id,max(substring(d.code from '^DB-([0-9]{1,8})$')::integer)
FROM public.delegates d WHERE d.code ~ '^DB-[0-9]{1,8}$'
GROUP BY d.congress_id
ON CONFLICT(congress_id) DO UPDATE
SET last_number=greatest(private.delegate_code_counters.last_number,EXCLUDED.last_number);

CREATE OR REPLACE FUNCTION private.delegate_assign_generated_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_number integer;
BEGIN
  IF NEW.congress_id IS NULL THEN
    RAISE EXCEPTION 'DELEGATE_MISSING_CONGRESS';
  END IF;
  -- Even if a client submits "code", it is ignored. This is the single source of truth.
  INSERT INTO private.delegate_code_counters(congress_id,last_number)
  VALUES (NEW.congress_id,1)
  ON CONFLICT (congress_id) DO UPDATE
    SET last_number=private.delegate_code_counters.last_number+1
  RETURNING last_number INTO v_number;
  IF v_number > 999999 THEN RAISE EXCEPTION 'DELEGATE_CODE_EXHAUSTED'; END IF;
  NEW.code := 'DB-' || lpad(v_number::text,6,'0');
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS delegates_generate_code_before_insert ON public.delegates;
CREATE TRIGGER delegates_generate_code_before_insert
BEFORE INSERT ON public.delegates
FOR EACH ROW EXECUTE FUNCTION private.delegate_assign_generated_code();
REVOKE ALL ON FUNCTION private.delegate_assign_generated_code() FROM PUBLIC,anon,authenticated;

COMMIT;

