-- V46: admin-only transactional congress reset and complete congress deletion.
-- Prerequisites: schema.sql, v4/v5/v6, v8, v26, v36, v45. BACK UP before applying.
-- No data is modified by running this migration; destructive operations require an
-- explicit RPC call, a verified platform super_admin and the exact congress name.
BEGIN;

CREATE TABLE IF NOT EXISTS public.congress_identity_cleanup_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  congress_id uuid NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','failed','completed')),
  attempts integer NOT NULL DEFAULT 0,
  queued_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  last_error text,
  UNIQUE (congress_id,user_id)
);
CREATE INDEX IF NOT EXISTS congress_identity_cleanup_queue_pending_idx
 ON public.congress_identity_cleanup_queue(congress_id,status,queued_at);
ALTER TABLE public.congress_identity_cleanup_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.congress_identity_cleanup_queue FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.congress_identity_cleanup_queue TO service_role;

CREATE OR REPLACE FUNCTION public.congress_purge_v46(
 p_congress_id uuid,p_actor uuid,p_expected_name text,p_delete boolean,p_sections text[]
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE
 v_name text;
 v_sections text[] := coalesce(p_sections,ARRAY[]::text[]);
 v_candidates uuid[];
 v_candidate uuid;
 v_queued integer := 0;
 v_counts jsonb;
BEGIN
 IF p_congress_id IS NULL OR p_actor IS NULL
  OR NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=p_actor AND p.platform_role='super_admin')
 THEN RAISE EXCEPTION 'CONGRESS_FORBIDDEN' USING ERRCODE='42501'; END IF;
 SELECT name INTO v_name FROM public.congresses WHERE id=p_congress_id FOR UPDATE;
 IF v_name IS NULL THEN RAISE EXCEPTION 'CONGRESS_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 IF p_expected_name IS DISTINCT FROM v_name
 THEN RAISE EXCEPTION 'CONGRESS_CONFIRMATION_MISMATCH' USING ERRCODE='22023'; END IF;
 IF p_delete IS DISTINCT FROM true AND p_delete IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'CONGRESS_INVALID_OPTIONS' USING ERRCODE='22023'; END IF;
 IF NOT p_delete AND cardinality(v_sections)=0
 THEN RAISE EXCEPTION 'CONGRESS_INVALID_OPTIONS' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(v_sections) s
  WHERE s IS NULL OR s NOT IN ('delegates','bch','sessions','documents','seating','checkins'))
  OR (SELECT count(*) FROM unnest(v_sections))<>
     (SELECT count(DISTINCT s) FROM unnest(v_sections) s)
 THEN RAISE EXCEPTION 'CONGRESS_INVALID_OPTIONS' USING ERRCODE='22023'; END IF;

 -- Capture independent Auth identities before removing congress-owned rows.
 SELECT array_agg(DISTINCT uid) INTO v_candidates FROM (
  SELECT auth_user_id AS uid FROM public.delegates
   WHERE congress_id=p_congress_id AND (p_delete OR 'delegates'=ANY(v_sections))
  UNION ALL
  SELECT user_id FROM public.btc_accounts
   WHERE congress_id=p_congress_id AND p_delete
 ) candidates WHERE uid IS NOT NULL AND uid<>p_actor;

 SELECT jsonb_build_object(
  'delegates',(SELECT count(*) FROM public.delegates WHERE congress_id=p_congress_id),
  'bch',(SELECT count(*) FROM public.bch_candidates WHERE congress_id=p_congress_id),
  'sessions',(SELECT count(*) FROM public.attendance_sessions WHERE congress_id=p_congress_id),
  'documents',(SELECT count(*) FROM public.documents WHERE congress_id=p_congress_id),
  'seating',(SELECT count(*) FROM public.seating_layouts WHERE congress_id=p_congress_id),
  'checkins',(SELECT count(*) FROM public.checkins WHERE congress_id=p_congress_id),
  'btc',(SELECT count(*) FROM public.btc_accounts WHERE congress_id=p_congress_id)
 ) INTO v_counts;

 -- Votes do not cascade on voting_session; clear them first for a full delete.
 IF p_delete OR 'delegates'=ANY(v_sections) THEN
  DELETE FROM public.votes v USING public.voting_sessions s
   WHERE v.voting_session_id=s.id AND s.congress_id=p_congress_id;
 END IF;
 IF p_delete THEN
  DELETE FROM public.checkins WHERE congress_id=p_congress_id;
  DELETE FROM public.congresses WHERE id=p_congress_id;
 ELSE
  -- Keep audit_logs for incident investigation and accountability.
  IF 'checkins'=ANY(v_sections) OR 'sessions'=ANY(v_sections) OR 'delegates'=ANY(v_sections) THEN
   DELETE FROM public.checkins WHERE congress_id=p_congress_id;
  END IF;
  IF 'sessions'=ANY(v_sections) THEN
   DELETE FROM public.attendance_sessions WHERE congress_id=p_congress_id;
  END IF;
  IF 'delegates'=ANY(v_sections) THEN
   DELETE FROM public.congress_members cm
    WHERE cm.congress_id=p_congress_id AND cm.role IN ('delegate','guest')
    AND EXISTS(SELECT 1 FROM public.delegates d
     WHERE d.congress_id=p_congress_id AND d.auth_user_id=cm.user_id);
   DELETE FROM public.delegates WHERE congress_id=p_congress_id;
  END IF;
  IF 'bch'=ANY(v_sections) THEN DELETE FROM public.bch_candidates WHERE congress_id=p_congress_id; END IF;
  IF 'documents'=ANY(v_sections) THEN DELETE FROM public.documents WHERE congress_id=p_congress_id; END IF;
  IF 'seating'=ANY(v_sections) THEN
   -- Preserve sessions if requested; they must not reference a removed layout.
   UPDATE public.attendance_sessions SET seating_layout_id=NULL WHERE congress_id=p_congress_id;
   DELETE FROM public.seating_layouts WHERE congress_id=p_congress_id;
  END IF;
  INSERT INTO public.audit_logs(congress_id,actor_id,action,details)
   VALUES(p_congress_id,p_actor,'congress.reset',
     jsonb_build_object('sections',v_sections,'previousCounts',v_counts));
 END IF;

 -- Never delete users who still own data, act in another congress, or administer
 -- the platform. All reusable seating templates and other congresses are preserved.
 FOREACH v_candidate IN ARRAY coalesce(v_candidates,ARRAY[]::uuid[]) LOOP
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id=v_candidate AND platform_role='super_admin')
   OR EXISTS(SELECT 1 FROM public.delegates WHERE auth_user_id=v_candidate)
   OR EXISTS(SELECT 1 FROM public.congress_members WHERE user_id=v_candidate)
   OR EXISTS(SELECT 1 FROM public.btc_accounts WHERE user_id=v_candidate)
   OR EXISTS(SELECT 1 FROM public.documents WHERE uploaded_by=v_candidate)
   OR EXISTS(SELECT 1 FROM public.bch_candidates WHERE created_by=v_candidate)
   OR EXISTS(SELECT 1 FROM public.seating_layouts WHERE created_by=v_candidate)
   OR EXISTS(SELECT 1 FROM public.seat_assignments WHERE assigned_by=v_candidate)
   OR EXISTS(SELECT 1 FROM public.checkins WHERE checked_in_by=v_candidate)
   OR EXISTS(SELECT 1 FROM public.audit_logs WHERE actor_id=v_candidate)
   OR EXISTS(SELECT 1 FROM public.seating_templates WHERE created_by=v_candidate)
  THEN CONTINUE; END IF;
  INSERT INTO public.congress_identity_cleanup_queue(congress_id,user_id,status)
   VALUES(p_congress_id,v_candidate,'pending')
   ON CONFLICT(congress_id,user_id) DO UPDATE SET status='pending',
    completed_at=NULL,last_error=NULL;
  v_queued := v_queued + 1;
 END LOOP;

 -- Persistent deletion event survives the congress row's deletion via SET NULL.
 IF p_delete AND to_regclass('public.system_logs') IS NOT NULL THEN
  INSERT INTO public.system_logs(level,source,event,message,actor_id,context)
  VALUES('warning','congress','congress.deleted','Đại hội đã được xóa theo yêu cầu quản trị.',
   p_actor,jsonb_build_object('congressId',p_congress_id,'congressName',v_name,'previousCounts',v_counts));
 END IF;
 RETURN jsonb_build_object('ok',true,'deleted',p_delete,'previousCounts',v_counts,'queuedAuthUsers',v_queued);
END; $$;

REVOKE ALL ON FUNCTION public.congress_purge_v46(uuid,uuid,text,boolean,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.congress_purge_v46(uuid,uuid,text,boolean,text[]) TO service_role;
COMMIT;
NOTIFY pgrst,'reload schema';
