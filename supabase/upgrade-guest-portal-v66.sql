-- V66: isolated, revocable no-login guest viewing and delegate-type guest seat/check-in.
-- Run after V60/V64. Never grants anonymous PostgREST access to protected data.
BEGIN;
CREATE TABLE IF NOT EXISTS public.congress_guest_links (
 congress_id uuid PRIMARY KEY REFERENCES public.congresses(id) ON DELETE CASCADE,
 access_hash text NOT NULL CHECK(access_hash ~ '^[a-f0-9]{64}$'),
 enabled boolean NOT NULL DEFAULT true,
 rotated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS congress_guest_links_enabled_idx
 ON public.congress_guest_links(congress_id) WHERE enabled;
ALTER TABLE public.congress_guest_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.congress_guest_links FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.congress_guest_links TO service_role;

-- Only upgrade exact legacy *unrestricted* guest groups. Custom role groups
-- (including those with exclusions) keep their existing permissions.
UPDATE public.rbac_groups
SET abilities=ARRAY['portal.access','portal.card','portal.documents','portal.bch',
                    'portal.checkin','portal.seating','portal.history']::text[],
    updated_at=now()
WHERE role='guest'
 AND cardinality(abilities)=4
 AND abilities @> ARRAY['portal.access','portal.card','portal.documents','portal.bch']::text[];

NOTIFY pgrst,'reload schema';
COMMIT;
