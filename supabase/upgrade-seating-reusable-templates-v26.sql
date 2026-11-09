-- V26: reusable seating templates for multiple congresses, independent assignments.
-- Works with upgrade-seating-v6.sql; existing layouts/seats/checkins stay untouched.
BEGIN;

CREATE TABLE IF NOT EXISTS public.seating_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_congress_id uuid REFERENCES public.congresses(id) ON DELETE SET NULL,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 120),
  stage_label text NOT NULL DEFAULT 'SÂN KHẤU'
    CHECK (length(btrim(stage_label)) BETWEEN 1 AND 120),
  grid_rows integer NOT NULL CHECK (grid_rows BETWEEN 1 AND 25),
  grid_columns integer NOT NULL CHECK (grid_columns BETWEEN 1 AND 30),
  visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private','organization')),
  seats jsonb NOT NULL CHECK (
    jsonb_typeof(seats)='array'
    AND jsonb_array_length(seats) BETWEEN 1 AND 500
  ),
  seat_count integer GENERATED ALWAYS AS (jsonb_array_length(seats)) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT seating_templates_grid_size_check CHECK (grid_rows*grid_columns <= 500)
);
CREATE INDEX IF NOT EXISTS seating_templates_org_visibility_idx
 ON public.seating_templates(organization_id,visibility,updated_at DESC);
CREATE INDEX IF NOT EXISTS seating_templates_owner_idx
 ON public.seating_templates(created_by,updated_at DESC);

ALTER TABLE public.seating_templates ENABLE ROW LEVEL SECURITY;
-- The portal API checks target-congress admin role and template visibility.
-- No direct anonymous/authenticated Data API access; service_role is server-only.
REVOKE ALL ON TABLE public.seating_templates FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.seating_templates TO service_role;

COMMIT;
NOTIFY pgrst, 'reload schema';
