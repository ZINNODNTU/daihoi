-- V58 · Separate BCH ballot permissions and service-only atomic tally writes.
-- Run after V57 on project pnxdxdagpeyqarucdphk. No existing vote is deleted.
BEGIN;

-- Previous invoker RPC could not UPDATE congresses because V3 deliberately
-- revoked UPDATE from authenticated. Keep the grant revoked: Next.js validates
-- the account and executes this RPC using the server-only service-role key.
REVOKE ALL ON FUNCTION public.set_bch_shared_ballot_total(uuid,integer)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_bch_shared_ballot_total(uuid,integer) TO service_role;

-- The separate tally RPC locks the congress first, serializing concurrent
-- changes of the denominator with per-candidate votes.
CREATE OR REPLACE FUNCTION public.set_bch_candidate_votes_v58(
 p_congress_id uuid,p_candidate_id uuid,p_votes integer,p_expected_updated_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE v_total integer; v_candidate record;
BEGIN
 SELECT bch_total_ballots INTO v_total
 FROM public.congresses
 WHERE id=p_congress_id AND kind='doan' FOR UPDATE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'BCH_TALLY_CONGRESS_NOT_FOUND' USING ERRCODE='P0002';
 END IF;
 IF p_votes IS NOT NULL AND
    (v_total IS NULL OR p_votes<0 OR p_votes>v_total OR p_votes>1000000) THEN
  RAISE EXCEPTION 'BCH_TALLY_VOTES_INVALID' USING ERRCODE='23514';
 END IF;
 UPDATE public.bch_candidates
 SET votes_received=p_votes,
     total_ballots=CASE WHEN p_votes IS NULL THEN NULL ELSE v_total END,
     updated_at=clock_timestamp()
 WHERE congress_id=p_congress_id AND id=p_candidate_id
   AND updated_at=p_expected_updated_at
 RETURNING id,congress_id,votes_received,total_ballots,updated_at INTO v_candidate;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'BCH_TALLY_CONFLICT' USING ERRCODE='40001';
 END IF;
 RETURN jsonb_build_object(
  'id',v_candidate.id,'congress_id',v_candidate.congress_id,
  'votes_received',v_candidate.votes_received,
  'total_ballots',v_candidate.total_ballots,
  'updated_at',v_candidate.updated_at
 );
END $$;
REVOKE ALL ON FUNCTION public.set_bch_candidate_votes_v58(uuid,uuid,integer,timestamptz)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_bch_candidate_votes_v58(uuid,uuid,integer,timestamptz)
 TO service_role;

-- Browser clients cannot smuggle tally changes in ordinary personnel CRUD.
CREATE OR REPLACE FUNCTION private.prevent_client_bch_vote_mutation_v58()
RETURNS trigger LANGUAGE plpgsql SET search_path=''
AS $$
BEGIN
 IF current_user='authenticated' THEN
  IF (TG_OP='INSERT' AND
      (NEW.votes_received IS NOT NULL OR NEW.total_ballots IS NOT NULL))
    OR (TG_OP='UPDATE' AND
      (NEW.votes_received IS DISTINCT FROM OLD.votes_received
       OR NEW.total_ballots IS DISTINCT FROM OLD.total_ballots)) THEN
    RAISE EXCEPTION 'BCH_TALLY_SERVICE_ONLY' USING ERRCODE='42501';
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.prevent_client_bch_vote_mutation_v58() FROM PUBLIC;
DROP TRIGGER IF EXISTS bch_tally_service_only_v58 ON public.bch_candidates;
CREATE TRIGGER bch_tally_service_only_v58
 BEFORE INSERT OR UPDATE ON public.bch_candidates
 FOR EACH ROW EXECUTE FUNCTION private.prevent_client_bch_vote_mutation_v58();

-- V57 used a deny-only check. Allow explicit account grants for the isolated
-- ballot room; all other capabilities remain bounded by BTC role defaults.
ALTER TABLE public.btc_account_capability_restrictions
 DROP CONSTRAINT IF EXISTS btc_account_capability_restrictions_allowed_check;
ALTER TABLE public.btc_account_capability_restrictions
 DROP CONSTRAINT IF EXISTS btc_account_capability_restrictions_ability_check;
ALTER TABLE public.btc_account_capability_restrictions
 ADD CONSTRAINT btc_account_capability_restrictions_ability_check
 CHECK (ability IN (
  'workspace.view','delegates.read','delegates.write','quality.read',
  'seating.read','seating.write','bch.read','bch.write',
  'ballots.read','ballots.write',
  'attendance.read','attendance.scan','attendance.sessions',
  'documents.read','documents.write','reports.read'
 ));
COMMENT ON TABLE public.btc_account_capability_restrictions IS
 'BTC account permission overrides: allowed=false revokes a role default; allowed=true grants only approved extra abilities such as ballots.read/write. Server-only writes, self-scoped reads.';

-- Apply one or multiple account permission changes atomically, with audit.
-- Invoker rights + EXECUTE service_role only, called AFTER server-side authz.
CREATE OR REPLACE FUNCTION public.set_btc_account_permissions_v58(
 p_congress_id uuid,p_user_id uuid,p_actor_id uuid,p_changes jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE v_role text; v_row jsonb; v_ability text; v_allowed boolean;
 v_default boolean; v_prev boolean; v_override boolean; v_modified jsonb:='[]'::jsonb;
BEGIN
 IF jsonb_typeof(p_changes) IS DISTINCT FROM 'array' OR
    jsonb_array_length(p_changes)<1 OR jsonb_array_length(p_changes)>16 THEN
  RAISE EXCEPTION 'BTC_PERMISSION_CHANGES_INVALID' USING ERRCODE='22023';
 END IF;
 SELECT m.role INTO v_role FROM public.congress_members m
 JOIN public.btc_accounts a ON a.congress_id=m.congress_id AND a.user_id=m.user_id
 WHERE m.congress_id=p_congress_id AND m.user_id=p_user_id
   AND a.disabled_at IS NULL AND m.role IN ('admin','checkin','secretary')
 FOR UPDATE OF m;
 IF NOT FOUND OR p_actor_id=p_user_id THEN
  RAISE EXCEPTION 'BTC_PERMISSION_TARGET_INVALID' USING ERRCODE='42501';
 END IF;
 FOR v_row IN SELECT value FROM jsonb_array_elements(p_changes) LOOP
  v_ability:=v_row->>'ability';
  IF jsonb_typeof(v_row->'allowed') IS DISTINCT FROM 'boolean' OR
     v_ability NOT IN (
      'workspace.view','delegates.read','delegates.write','quality.read',
      'seating.read','seating.write','bch.read','bch.write',
      'ballots.read','ballots.write',
      'attendance.read','attendance.scan','attendance.sessions',
      'documents.read','documents.write','reports.read'
     ) THEN
   RAISE EXCEPTION 'BTC_PERMISSION_CHANGE_INVALID' USING ERRCODE='22023';
  END IF;
  v_allowed:=(v_row->>'allowed')::boolean;
  -- Keep permanent system/team settings out of the customization surface.
  v_default:=CASE
    WHEN v_role='admin' THEN true
    WHEN v_role='checkin' THEN v_ability IN
      ('workspace.view','seating.read','attendance.read','attendance.scan','reports.read')
    ELSE v_ability IN
      ('workspace.view','bch.read','documents.read','reports.read')
    END;
  IF v_allowed AND NOT v_default AND v_ability NOT IN ('ballots.read','ballots.write') THEN
   RAISE EXCEPTION 'BTC_PERMISSION_ESCALATION' USING ERRCODE='42501';
  END IF;
  SELECT allowed INTO v_override
  FROM public.btc_account_capability_restrictions
  WHERE congress_id=p_congress_id AND user_id=p_user_id AND ability=v_ability;
  v_prev:=COALESCE(v_override,v_default);
  IF v_allowed=v_default THEN
   DELETE FROM public.btc_account_capability_restrictions
   WHERE congress_id=p_congress_id AND user_id=p_user_id AND ability=v_ability;
  ELSE
   INSERT INTO public.btc_account_capability_restrictions(
     congress_id,user_id,ability,allowed,updated_by,updated_at
   ) VALUES(p_congress_id,p_user_id,v_ability,v_allowed,p_actor_id,now())
   ON CONFLICT(congress_id,user_id,ability) DO UPDATE SET
    allowed=EXCLUDED.allowed,updated_by=EXCLUDED.updated_by,updated_at=now();
  END IF;
  IF v_prev IS DISTINCT FROM v_allowed THEN
   v_modified:=v_modified || jsonb_build_array(jsonb_build_object(
    'ability',v_ability,'before',v_prev,'after',v_allowed
   ));
  END IF;
 END LOOP;
 -- All changes and the audit are committed in the same Postgres transaction.
 IF jsonb_array_length(v_modified)>0 THEN
  INSERT INTO public.audit_logs(congress_id,actor_id,action,target_id,details)
  VALUES(p_congress_id,p_actor_id,'btc.permissions_changed',p_user_id,
    jsonb_build_object('role',v_role,'changes',v_modified));
 END IF;
 RETURN jsonb_build_object('updated',jsonb_array_length(v_modified),
   'changes',v_modified,'role',v_role);
END $$;
REVOKE ALL ON FUNCTION public.set_btc_account_permissions_v58(uuid,uuid,uuid,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_btc_account_permissions_v58(uuid,uuid,uuid,jsonb)
 TO service_role;
COMMIT;
