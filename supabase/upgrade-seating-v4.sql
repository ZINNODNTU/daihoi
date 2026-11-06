-- DAI HOI SO — Seat maps v4
-- Run after supabase/schema.sql. API must be deployed before granting access to operators.
-- This migration is transactional and creates server-only RPC functions.
BEGIN;

CREATE TABLE IF NOT EXISTS public.seating_layouts (
 id uuid PRIMARY KEY,
 congress_id uuid NOT NULL REFERENCES public.congresses(id) ON DELETE CASCADE,
 title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 120),
 stage_label text NOT NULL DEFAULT 'SÂN KHẤU' CHECK (length(stage_label) BETWEEN 1 AND 120),
 version integer NOT NULL DEFAULT 1 CHECK (version>0),
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (id,congress_id)
);
CREATE INDEX IF NOT EXISTS seating_layouts_congress_idx ON public.seating_layouts(congress_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS public.seats (
 id uuid PRIMARY KEY,
 layout_id uuid NOT NULL,
 congress_id uuid NOT NULL,
 code text NOT NULL CHECK (length(btrim(code)) BETWEEN 1 AND 36),
 zone text NOT NULL CHECK (length(btrim(zone)) BETWEEN 1 AND 40),
 row_label text NOT NULL CHECK (length(btrim(row_label)) BETWEEN 1 AND 12),
 seat_number integer NOT NULL CHECK (seat_number BETWEEN 1 AND 10000),
 x integer NOT NULL CHECK (x BETWEEN 0 AND 4000),
 y integer NOT NULL CHECK (y BETWEEN 0 AND 4000),
 blocked boolean NOT NULL DEFAULT false,
 FOREIGN KEY (layout_id,congress_id) REFERENCES public.seating_layouts(id,congress_id) ON DELETE CASCADE,
 UNIQUE (id,layout_id,congress_id),
 CONSTRAINT seats_layout_code_unique UNIQUE (layout_id,code) DEFERRABLE INITIALLY DEFERRED,
 CONSTRAINT seats_layout_position_unique UNIQUE (layout_id,x,y) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX IF NOT EXISTS seats_congress_layout_idx ON public.seats(congress_id,layout_id);

CREATE TABLE IF NOT EXISTS public.seat_assignments (
 seat_id uuid PRIMARY KEY,
 layout_id uuid NOT NULL,
 congress_id uuid NOT NULL,
 delegate_id uuid NOT NULL,
 assigned_by uuid NOT NULL REFERENCES auth.users(id),
 assigned_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (seat_id,layout_id,congress_id) REFERENCES public.seats(id,layout_id,congress_id) ON DELETE CASCADE,
 FOREIGN KEY (delegate_id,congress_id) REFERENCES public.delegates(id,congress_id) ON DELETE CASCADE,
 CONSTRAINT seat_assignments_delegate_unique UNIQUE (layout_id,delegate_id)
);
CREATE INDEX IF NOT EXISTS seat_assignments_congress_idx ON public.seat_assignments(congress_id,layout_id);

ALTER TABLE public.seating_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_assignments ENABLE ROW LEVEL SECURITY;

-- All seating access goes through Next.js APIs, which enforce auth + congress role.
-- No direct browser writes or reads; service_role is scoped by the API guard.
REVOKE ALL ON public.seating_layouts,public.seats,public.seat_assignments FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.seating_layouts,public.seats,public.seat_assignments TO service_role;

-- Save an entire layout atomically. Existing seat IDs preserve assignments.
-- An assigned seat cannot be deleted silently. The version is an optimistic lock.
CREATE OR REPLACE FUNCTION public.seating_save_layout(
 p_congress_id uuid,p_layout_id uuid,p_expected_version integer,p_actor uuid,
 p_title text,p_stage_label text,p_seats jsonb
) RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE v_count integer; v_version integer;
BEGIN
 IF p_seats IS NULL OR jsonb_typeof(p_seats)<>'array'
   OR jsonb_array_length(p_seats)>500 OR jsonb_array_length(p_seats)=0
 THEN RAISE EXCEPTION 'SEATING_BAD_SEATS'; END IF;
 IF length(btrim(coalesce(p_title,''))) NOT BETWEEN 1 AND 120
   OR length(btrim(coalesce(p_stage_label,''))) NOT BETWEEN 1 AND 120
 THEN RAISE EXCEPTION 'SEATING_BAD_TITLE'; END IF;

 SELECT count(*) INTO v_count FROM jsonb_to_recordset(p_seats)
 AS s(id uuid,code text,zone text,"rowLabel" text,"seatNumber" integer,x integer,y integer,blocked boolean);
 IF v_count<>jsonb_array_length(p_seats) THEN RAISE EXCEPTION 'SEATING_BAD_SEATS'; END IF;

 IF EXISTS (
   SELECT 1 FROM jsonb_to_recordset(p_seats)
   AS s(id uuid,code text,zone text,"rowLabel" text,"seatNumber" integer,x integer,y integer,blocked boolean)
   WHERE s.id IS NULL OR s.code IS NULL OR length(btrim(s.code)) NOT BETWEEN 1 AND 36
      OR s.zone IS NULL OR length(btrim(s.zone)) NOT BETWEEN 1 AND 40
      OR s."rowLabel" IS NULL OR length(btrim(s."rowLabel")) NOT BETWEEN 1 AND 12
      OR s."seatNumber" IS NULL OR s."seatNumber" NOT BETWEEN 1 AND 10000
      OR s.x IS NULL OR s.x NOT BETWEEN 0 AND 4000
      OR s.y IS NULL OR s.y NOT BETWEEN 0 AND 4000 OR s.blocked IS NULL
 ) THEN RAISE EXCEPTION 'SEATING_BAD_SEATS'; END IF;

 IF EXISTS (
 SELECT 1 FROM (
   SELECT id,code,x,y FROM jsonb_to_recordset(p_seats)
   AS s(id uuid,code text,zone text,"rowLabel" text,"seatNumber" integer,x integer,y integer,blocked boolean)
 ) q GROUP BY id HAVING count(*)>1
 ) OR EXISTS (
 SELECT 1 FROM (
   SELECT upper(code) AS code FROM jsonb_to_recordset(p_seats)
   AS s(id uuid,code text,zone text,"rowLabel" text,"seatNumber" integer,x integer,y integer,blocked boolean)
 ) q GROUP BY code HAVING count(*)>1
 ) OR EXISTS (
 SELECT 1 FROM (
   SELECT x,y FROM jsonb_to_recordset(p_seats)
   AS s(id uuid,code text,zone text,"rowLabel" text,"seatNumber" integer,x integer,y integer,blocked boolean)
 ) q GROUP BY x,y HAVING count(*)>1
 ) THEN RAISE EXCEPTION 'SEATING_DUPLICATE_SEAT'; END IF;

 IF p_expected_version=0 THEN
  INSERT INTO public.seating_layouts(id,congress_id,title,stage_label,created_by)
  VALUES (p_layout_id,p_congress_id,btrim(p_title),btrim(p_stage_label),p_actor);
  v_version:=1;
 ELSE
  UPDATE public.seating_layouts
  SET title=btrim(p_title),stage_label=btrim(p_stage_label),
   version=version+1,updated_at=now()
  WHERE id=p_layout_id AND congress_id=p_congress_id AND version=p_expected_version
  RETURNING version INTO v_version;
  IF v_version IS NULL THEN RAISE EXCEPTION 'SEATING_VERSION_CONFLICT'; END IF;
 END IF;

 IF EXISTS (
  SELECT 1 FROM public.seats s
  WHERE s.id IN (
   SELECT a.id FROM jsonb_to_recordset(p_seats) AS a(id uuid)
  ) AND (s.layout_id<>p_layout_id OR s.congress_id<>p_congress_id)
 ) THEN RAISE EXCEPTION 'SEATING_SEAT_FOREIGN_LAYOUT'; END IF;

 IF EXISTS (
  SELECT 1 FROM public.seat_assignments a
  WHERE a.layout_id=p_layout_id
    AND NOT EXISTS (SELECT 1 FROM jsonb_to_recordset(p_seats) AS s(id uuid)
                    WHERE s.id=a.seat_id)
 ) THEN RAISE EXCEPTION 'SEATING_ASSIGNED_SEAT_REMOVE'; END IF;

 IF EXISTS (
  SELECT 1 FROM public.seat_assignments a JOIN
   jsonb_to_recordset(p_seats) AS s(id uuid,blocked boolean)
    ON a.seat_id=s.id
  WHERE a.layout_id=p_layout_id AND s.blocked=true
 ) THEN RAISE EXCEPTION 'SEATING_ASSIGNED_SEAT_BLOCK'; END IF;

 DELETE FROM public.seats s WHERE s.layout_id=p_layout_id
  AND NOT EXISTS (
   SELECT 1 FROM jsonb_to_recordset(p_seats) AS z(id uuid)
   WHERE z.id=s.id
  );

 INSERT INTO public.seats
  (id,layout_id,congress_id,code,zone,row_label,seat_number,x,y,blocked)
 SELECT s.id,p_layout_id,p_congress_id,btrim(s.code),btrim(s.zone),
        btrim(s."rowLabel"),s."seatNumber",s.x,s.y,s.blocked
 FROM jsonb_to_recordset(p_seats)
 AS s(id uuid,code text,zone text,"rowLabel" text,"seatNumber" integer,x integer,y integer,blocked boolean)
 ON CONFLICT (id) DO UPDATE SET
  code=EXCLUDED.code,zone=EXCLUDED.zone,row_label=EXCLUDED.row_label,
  seat_number=EXCLUDED.seat_number,x=EXCLUDED.x,y=EXCLUDED.y,blocked=EXCLUDED.blocked;

 INSERT INTO public.audit_logs(congress_id,actor_id,action,target_id,details)
 VALUES(p_congress_id,p_actor,'seating.layout_saved',p_layout_id,
  jsonb_build_object('version',v_version,'seat_count',v_count));
 RETURN v_version;
END;
$$;

-- Atomic assign, move, unassign, bulk merge or replace, with validation and lock.
CREATE OR REPLACE FUNCTION public.seating_apply_assignments(
 p_congress_id uuid,p_layout_id uuid,p_expected_version integer,p_actor uuid,
 p_mode text,p_items jsonb
) RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE v_version integer;v_count integer;
BEGIN
 IF p_mode NOT IN ('merge','replace') OR p_items IS NULL OR jsonb_typeof(p_items)<>'array'
 OR jsonb_array_length(p_items)>500
 THEN RAISE EXCEPTION 'SEATING_BAD_IMPORT';END IF;

 SELECT version INTO v_version FROM public.seating_layouts
 WHERE id=p_layout_id AND congress_id=p_congress_id FOR UPDATE;
 IF v_version IS NULL OR v_version<>p_expected_version
 THEN RAISE EXCEPTION 'SEATING_VERSION_CONFLICT';END IF;

 SELECT count(*) INTO v_count FROM jsonb_to_recordset(p_items)
 AS i("seatId" uuid,"delegateId" uuid);
 IF v_count<>jsonb_array_length(p_items) THEN RAISE EXCEPTION 'SEATING_BAD_IMPORT';END IF;

 IF EXISTS (
  SELECT 1 FROM jsonb_to_recordset(p_items) AS i("seatId" uuid,"delegateId" uuid)
  WHERE i."seatId" IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.seats s WHERE s.id=i."seatId"
      AND s.layout_id=p_layout_id AND s.congress_id=p_congress_id)
    OR (i."delegateId" IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.delegates d WHERE d.id=i."delegateId"
       AND d.congress_id=p_congress_id AND d.is_active=true))
    OR (i."delegateId" IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.seats s WHERE s.id=i."seatId" AND s.blocked=true))
 ) THEN RAISE EXCEPTION 'SEATING_INVALID_REFERENCE';END IF;

 IF EXISTS (
  SELECT 1 FROM jsonb_to_recordset(p_items) AS i("seatId" uuid,"delegateId" uuid)
  GROUP BY i."seatId" HAVING count(*)>1
 ) OR EXISTS (
  SELECT 1 FROM jsonb_to_recordset(p_items) AS i("seatId" uuid,"delegateId" uuid)
  WHERE i."delegateId" IS NOT NULL GROUP BY i."delegateId" HAVING count(*)>1
 ) THEN RAISE EXCEPTION 'SEATING_DUPLICATE_ASSIGNMENT';END IF;

 IF p_mode='replace' THEN
  DELETE FROM public.seat_assignments WHERE layout_id=p_layout_id;
 ELSE
  DELETE FROM public.seat_assignments a
   WHERE a.layout_id=p_layout_id AND
    (a.seat_id IN (SELECT i."seatId" FROM jsonb_to_recordset(p_items)
       AS i("seatId" uuid,"delegateId" uuid))
     OR a.delegate_id IN (SELECT i."delegateId" FROM jsonb_to_recordset(p_items)
       AS i("seatId" uuid,"delegateId" uuid) WHERE i."delegateId" IS NOT NULL));
 END IF;

 INSERT INTO public.seat_assignments
 (seat_id,layout_id,congress_id,delegate_id,assigned_by)
 SELECT i."seatId",p_layout_id,p_congress_id,i."delegateId",p_actor
 FROM jsonb_to_recordset(p_items) AS i("seatId" uuid,"delegateId" uuid)
 WHERE i."delegateId" IS NOT NULL;

 UPDATE public.seating_layouts SET version=version+1,updated_at=now()
 WHERE id=p_layout_id RETURNING version INTO v_version;

 INSERT INTO public.audit_logs(congress_id,actor_id,action,target_id,details)
 VALUES(p_congress_id,p_actor,'seating.assignments_updated',p_layout_id,
 jsonb_build_object('version',v_version,'mode',p_mode,'item_count',v_count));
 RETURN v_version;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.seating_save_layout(uuid,uuid,integer,uuid,text,text,jsonb)
 FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.seating_apply_assignments(uuid,uuid,integer,uuid,text,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.seating_save_layout(uuid,uuid,integer,uuid,text,text,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.seating_apply_assignments(uuid,uuid,integer,uuid,text,jsonb) TO service_role;
COMMIT;
