-- V19: enable INSERT notifications for staff-only attendance projector.
-- Run ONLY on the daihoi Supabase project AFTER checking existing RLS.
-- public.checkins already has a staff-only SELECT policy, which Realtime
-- must enforce per authenticated subscriber.
CREATE INDEX IF NOT EXISTS checkins_session_time_realtime_idx
 ON public.checkins(congress_id,session_id,checked_in_at DESC,id DESC);

DO $$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime')
  AND NOT EXISTS (
   SELECT 1 FROM pg_publication_tables
   WHERE pubname='supabase_realtime'
    AND schemaname='public' AND tablename='checkins'
  ) THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.checkins;
 END IF;
END
$$;
-- NOTE: staff permissions must remain restricted. Do NOT add anon SELECT.
-- The client uses GET /api/attendance/live?mode=updates as a fallback.
