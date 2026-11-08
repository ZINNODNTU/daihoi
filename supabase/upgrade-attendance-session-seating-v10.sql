-- Session-specific auditorium seating (v10). Apply after seating v4 and attendance v2.
-- Non-destructive: existing sessions initially have no assigned auditorium.
BEGIN;
ALTER TABLE public.attendance_sessions
 ADD COLUMN IF NOT EXISTS seating_layout_id uuid;

DO $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE conname='attendance_sessions_seating_layout_fk'
    AND conrelid='public.attendance_sessions'::regclass
 ) THEN
  ALTER TABLE public.attendance_sessions
   ADD CONSTRAINT attendance_sessions_seating_layout_fk
   FOREIGN KEY (seating_layout_id,congress_id)
   REFERENCES public.seating_layouts(id,congress_id)
   ON DELETE SET NULL (seating_layout_id);
 END IF;
END $$;

CREATE INDEX IF NOT EXISTS attendance_sessions_seating_layout_idx
 ON public.attendance_sessions(seating_layout_id)
 WHERE seating_layout_id IS NOT NULL;
COMMIT;
