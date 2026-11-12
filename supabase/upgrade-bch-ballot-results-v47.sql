-- V47 · Manual ballot tally for Đoàn BCH candidates (NOT electronic voting).
-- Apply to the verified daihoi Supabase project after upgrade-bch-candidates-v8.sql.
-- All previous rows remain uncounted until the BTC explicitly records the tally.
BEGIN;
ALTER TABLE public.bch_candidates
 ADD COLUMN IF NOT EXISTS votes_received integer,
 ADD COLUMN IF NOT EXISTS total_ballots integer;

DO $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint WHERE conname='bch_candidate_ballot_tally_valid'
   AND conrelid='public.bch_candidates'::regclass
 ) THEN
  ALTER TABLE public.bch_candidates
   ADD CONSTRAINT bch_candidate_ballot_tally_valid CHECK (
    (votes_received IS NULL AND total_ballots IS NULL)
    OR (
     votes_received IS NOT NULL AND total_ballots IS NOT NULL
     AND votes_received BETWEEN 0 AND 1000000
     AND total_ballots BETWEEN 1 AND 1000000
     AND votes_received<=total_ballots
    )
   );
 END IF;
END $$;

COMMENT ON COLUMN public.bch_candidates.votes_received IS
 'Manual count recorded by BTC from an official tally. Never an electronic vote.';
COMMENT ON COLUMN public.bch_candidates.total_ballots IS
 'Per-candidate denominator from the tally sheet. Not derived from QR attendance.';

-- Existing bch_candidates RLS v8 remains in force: only Congress admins can write;
-- secretary can view internally. Delegates see only introductory profiles.
COMMIT;
