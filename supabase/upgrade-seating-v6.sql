-- Đại hội số: kích thước canvas linh hoạt, ghế đại biểu/khách mời.
-- Chạy sau upgrade-seating-v4.sql và upgrade-delegate-accounts-v5.sql
-- Đảm bảo đã sao lưu; giữ nguyên dữ liệu/ID ghế và phân công hiện có.
BEGIN;

ALTER TABLE public.seating_layouts
 ADD COLUMN IF NOT EXISTS grid_rows integer NOT NULL DEFAULT 10 CHECK(grid_rows BETWEEN 1 AND 25),
 ADD COLUMN IF NOT EXISTS grid_columns integer NOT NULL DEFAULT 20 CHECK(grid_columns BETWEEN 1 AND 30);
ALTER TABLE public.seating_layouts
 DROP CONSTRAINT IF EXISTS seating_layouts_grid_area_check;
ALTER TABLE public.seating_layouts ADD CONSTRAINT seating_layouts_grid_area_check
 CHECK (grid_rows*grid_columns <=500);

ALTER TABLE public.seats
 ADD COLUMN IF NOT EXISTS seat_type text NOT NULL DEFAULT 'delegate'
 CHECK (seat_type IN ('delegate','guest'));

-- Các bản ghi cũ tự được đánh dấu ghế đại biểu, không xóa hoặc tạo lại ghế.
-- RPC v6 có tên riêng để không ảnh hưởng ứng dụng cũ.
CREATE OR REPLACE FUNCTION public.seating_save_layout_v6(
 p_congress_id uuid,p_layout_id uuid,p_expected_version integer,p_actor uuid,
 p_title text,p_stage_label text,p_grid_rows integer,p_grid_columns integer,p_seats jsonb
) RETURNS integer
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE v_count integer; v_version integer;
BEGIN
 IF p_grid_rows IS NULL OR p_grid_rows NOT BETWEEN 1 AND 25
  OR p_grid_columns IS NULL OR p_grid_columns NOT BETWEEN 1 AND 30
  OR p_grid_rows*p_grid_columns>500
 THEN RAISE EXCEPTION 'SEATING_BAD_GRID_SIZE'; END IF;
 IF p_seats IS NULL OR jsonb_typeof(p_seats)<>'array'
   OR jsonb_array_length(p_seats)>500 OR jsonb_array_length(p_seats)=0
 THEN RAISE EXCEPTION 'SEATING_BAD_SEATS'; END IF;
 IF length(btrim(coalesce(p_title,''))) NOT BETWEEN 1 AND 120
   OR length(btrim(coalesce(p_stage_label,''))) NOT BETWEEN 1 AND 120
 THEN RAISE EXCEPTION 'SEATING_BAD_TITLE'; END IF;

 SELECT count(*) INTO v_count FROM jsonb_to_recordset(p_seats)
 AS s(id uuid,code text,zone text,"rowLabel" text,"seatNumber" integer,x integer,y integer,blocked boolean,"seatType" text);
 IF v_count<>jsonb_array_length(p_seats) THEN RAISE EXCEPTION 'SEATING_BAD_SEATS'; END IF;

 IF EXISTS (
   SELECT 1 FROM jsonb_to_recordset(p_seats)
   AS s(id uuid,code text,zone text,"rowLabel" text,"seatNumber" integer,x integer,y integer,blocked boolean,"seatType" text)
   WHERE s.id IS NULL OR s.code IS NULL OR length(btrim(s.code)) NOT BETWEEN 1 AND 36
      OR s.zone IS NULL OR length(btrim(s.zone)) NOT BETWEEN 1 AND 40
      OR s."rowLabel" IS NULL OR length(btrim(s."rowLabel")) NOT BETWEEN 1 AND 12
      OR s."seatNumber" IS NULL OR s."seatNumber" NOT BETWEEN 1 AND 10000
      OR s.x IS NULL OR s.x NOT BETWEEN 0 AND 4000
      OR s.y IS NULL OR s.y NOT BETWEEN 0 AND 4000 OR s.blocked IS NULL
      OR s."seatType" IS NULL OR s."seatType" NOT IN ('delegate','guest')
 ) THEN RAISE EXCEPTION 'SEATING_BAD_SEATS'; END IF;

 IF EXISTS (
 SELECT 1 FROM (
   SELECT id,code,x,y FROM jsonb_to_recordset(p_seats)
   AS s(id uuid,code text,zone text,"rowLabel" text,"seatNumber" integer,x integer,y integer,blocked boolean,"seatType" text)
 ) q GROUP BY id HAVING count(*)>1
 ) OR EXISTS (
 SELECT 1 FROM (
   SELECT upper(code) AS code FROM jsonb_to_recordset(p_seats)
   AS s(id uuid,code text,zone text,"rowLabel" text,"seatNumber" integer,x integer,y integer,blocked boolean,"seatType" text)
 ) q GROUP BY code HAVING count(*)>1
 ) OR EXISTS (
 SELECT 1 FROM (
   SELECT x,y FROM jsonb_to_recordset(p_seats)
   AS s(id uuid,code text,zone text,"rowLabel" text,"seatNumber" integer,x integer,y integer,blocked boolean,"seatType" text)
 ) q GROUP BY x,y HAVING count(*)>1
 ) THEN RAISE EXCEPTION 'SEATING_DUPLICATE_SEAT'; END IF;

 IF p_expected_version=0 THEN
  INSERT INTO public.seating_layouts(id,congress_id,title,stage_label,grid_rows,grid_columns,created_by)
  VALUES (p_layout_id,p_congress_id,btrim(p_title),btrim(p_stage_label),p_grid_rows,p_grid_columns,p_actor);
  v_version:=1;
 ELSE
  UPDATE public.seating_layouts
  SET title=btrim(p_title),stage_label=btrim(p_stage_label),
   grid_rows=p_grid_rows,grid_columns=p_grid_columns,
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
  SELECT 1 FROM public.seat_assignments a
  JOIN public.delegates d ON d.id=a.delegate_id AND d.congress_id=p_congress_id
  JOIN jsonb_to_recordset(p_seats) AS s(id uuid,"seatType" text) ON s.id=a.seat_id
  WHERE a.layout_id=p_layout_id
    AND (s."seatType"='guest')<>(d.delegate_type='guest')
 ) THEN RAISE EXCEPTION 'SEATING_ASSIGNED_TYPE_MISMATCH'; END IF;

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
  (id,layout_id,congress_id,code,zone,row_label,seat_number,x,y,blocked,seat_type)
 SELECT s.id,p_layout_id,p_congress_id,btrim(s.code),btrim(s.zone),
        btrim(s."rowLabel"),s."seatNumber",s.x,s.y,s.blocked,s."seatType"
 FROM jsonb_to_recordset(p_seats)
 AS s(id uuid,code text,zone text,"rowLabel" text,"seatNumber" integer,x integer,y integer,blocked boolean,"seatType" text)
 ON CONFLICT (id) DO UPDATE SET
  code=EXCLUDED.code,zone=EXCLUDED.zone,row_label=EXCLUDED.row_label,
  seat_number=EXCLUDED.seat_number,x=EXCLUDED.x,y=EXCLUDED.y,blocked=EXCLUDED.blocked,
  seat_type=EXCLUDED.seat_type;

 INSERT INTO public.audit_logs(congress_id,actor_id,action,target_id,details)
 VALUES(p_congress_id,p_actor,'seating.layout_saved',p_layout_id,
  jsonb_build_object('version',v_version,'seat_count',v_count));
 RETURN v_version;
END;
$$;

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
    OR (i."delegateId" IS NOT NULL AND EXISTS (
       SELECT 1 FROM public.seats s
       JOIN public.delegates d ON d.id=i."delegateId" AND d.congress_id=p_congress_id
       WHERE s.id=i."seatId" AND s.layout_id=p_layout_id
         AND (s.seat_type='guest')<>(d.delegate_type='guest')))
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


REVOKE EXECUTE ON FUNCTION public.seating_save_layout_v6(
 uuid,uuid,integer,uuid,text,text,integer,integer,jsonb
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.seating_save_layout_v6(
 uuid,uuid,integer,uuid,text,text,integer,integer,jsonb
) TO service_role;

COMMIT;
