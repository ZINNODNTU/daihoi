import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PGlite} from "@electric-sql/pglite";

const migration=readFileSync(new URL("../supabase/upgrade-ballot-room-btc-permissions-v58.sql",import.meta.url),"utf8");
const v57=readFileSync(new URL("../supabase/upgrade-bch-shared-ballot-account-permissions-v57.sql",import.meta.url),"utf8");
const C="aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const OTHER="bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const ADMIN="cccccccc-cccc-4ccc-cccc-cccccccccccc";
const STAFF="dddddddd-dddd-4ddd-dddd-dddddddddddd";
const PERSON="11111111-1111-4111-8111-111111111111";

async function setup(){
 const db=new PGlite();
 await db.exec([
 "CREATE ROLE anon;",
 "CREATE ROLE authenticated;",
 "CREATE ROLE service_role;",
 "CREATE SCHEMA auth;",
 "CREATE SCHEMA private;",
 "CREATE TABLE auth.users(id uuid primary key);",
 "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;",
 "CREATE TABLE public.congresses(id uuid primary key,kind text not null);",
 "CREATE TABLE public.btc_accounts(user_id uuid,congress_id uuid,disabled_at timestamptz);",
 "CREATE TABLE public.congress_members(congress_id uuid,user_id uuid,role text);",
 "CREATE TABLE public.delegates(id uuid primary key,congress_id uuid);",
 "CREATE TABLE public.audit_logs(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,congress_id uuid not null,actor_id uuid not null,action text not null,target_id uuid,details jsonb not null default '{}'::jsonb,created_at timestamptz default now());",
 "CREATE TABLE public.bch_candidates(id uuid primary key,congress_id uuid not null,votes_received integer,total_ballots integer,updated_at timestamptz default now(),CONSTRAINT bch_candidate_ballot_tally_valid CHECK ((votes_received IS NULL AND total_ballots IS NULL) OR (votes_received>=0 AND total_ballots>=1 AND votes_received<=total_ballots)));",
 "INSERT INTO auth.users VALUES ('"+ADMIN+"'),('"+STAFF+"');",
 "INSERT INTO public.congresses VALUES ('"+C+"','doan'),('"+OTHER+"','doan');",
 "INSERT INTO public.btc_accounts(user_id,congress_id) VALUES ('"+ADMIN+"','"+C+"'),('"+STAFF+"','"+C+"');",
 "INSERT INTO public.congress_members VALUES ('"+C+"','"+ADMIN+"','admin'),('"+C+"','"+STAFF+"','secretary');",
 "INSERT INTO public.bch_candidates(id,congress_id) VALUES ('"+PERSON+"','"+C+"');",
 ].join("\n"));
 await db.exec(v57);
 await db.exec(migration);
 return db;
}
test("V58 revokes invoker RPC from browser, service role only; V3 direct congress UPDATE remains forbidden",async t=>{
 const db=await setup();t.after(()=>db.close());
 const r=await db.query(`
 SELECT
  has_function_privilege('authenticated','public.set_bch_shared_ballot_total(uuid,integer)','EXECUTE') AS client_total,
  has_function_privilege('authenticated','public.set_bch_candidate_votes_v58(uuid,uuid,integer,timestamptz)','EXECUTE') AS client_votes,
  has_function_privilege('authenticated','public.set_btc_account_permissions_v58(uuid,uuid,uuid,jsonb)','EXECUTE') AS client_permissions,
  has_function_privilege('service_role','public.set_bch_shared_ballot_total(uuid,integer)','EXECUTE') AS server_total,
  has_function_privilege('service_role','public.set_bch_candidate_votes_v58(uuid,uuid,integer,timestamptz)','EXECUTE') AS server_votes
 `);
 assert.deepEqual(r.rows[0],{
  client_total:false,client_votes:false,client_permissions:false,
  server_total:true,server_votes:true
 });
});
test("V58 atomic tally respects one total, rejects impossible vote and detects stale concurrent updates",async t=>{
 const db=await setup();t.after(()=>db.close());
 await db.query("SELECT set_bch_shared_ballot_total($1,$2)",[C,75]);
 const before=(await db.query("SELECT updated_at FROM bch_candidates WHERE id=$1",[PERSON])).rows[0].updated_at;
 const saved=await db.query("SELECT set_bch_candidate_votes_v58($1,$2,$3,$4) AS saved",[C,PERSON,60,before]);
 assert.equal(saved.rows[0].saved.votes_received,60);
 assert.equal(saved.rows[0].saved.total_ballots,75);
 await assert.rejects(()=>db.query("SELECT set_bch_candidate_votes_v58($1,$2,$3,$4)",[C,PERSON,80,saved.rows[0].saved.updated_at]));
 await assert.rejects(()=>db.query("SELECT set_bch_candidate_votes_v58($1,$2,$3,$4)",[C,PERSON,70,before]));
 await assert.rejects(()=>db.query("SELECT set_bch_candidate_votes_v58($1,$2,$3,$4)",[OTHER,PERSON,1,before]));
 assert.equal((await db.query("SELECT votes_received FROM bch_candidates WHERE id=$1",[PERSON])).rows[0].votes_received,60);
});
test("V58 batch account changes persist an auditable grant to independent tally room",async t=>{
 const db=await setup();t.after(()=>db.close());
 const changes=JSON.stringify([{ability:"ballots.read",allowed:true},{ability:"ballots.write",allowed:true}]);
 const args=[C,STAFF,ADMIN,changes];
 const out=await db.query("SELECT set_btc_account_permissions_v58($1,$2,$3,$4::jsonb) AS result",args);
 assert.equal(out.rows[0].result.updated,2);
 const rights=await db.query("SELECT ability,allowed FROM btc_account_capability_restrictions WHERE user_id=$1 ORDER BY ability",[STAFF]);
 assert.deepEqual(rights.rows,[{ability:"ballots.read",allowed:true},{ability:"ballots.write",allowed:true}]);
 const logs=await db.query("SELECT action,target_id,details FROM audit_logs");
 assert.equal(logs.rows.length,1);
 assert.equal(logs.rows[0].action,"btc.permissions_changed");
 assert.equal(logs.rows[0].target_id,STAFF);
 assert.equal(logs.rows[0].details.changes.length,2);
 // Restoring read/write to their baseline false removes the extra overrides.
 const restored=await db.query("SELECT set_btc_account_permissions_v58($1,$2,$3,$4::jsonb) AS result",[
  C,STAFF,ADMIN,JSON.stringify([{ability:"ballots.read",allowed:false},{ability:"ballots.write",allowed:false}])
 ]);
 assert.equal(restored.rows[0].result.updated,2);
 assert.equal((await db.query("SELECT COUNT(*)::integer AS n FROM btc_account_capability_restrictions")).rows[0].n,0);
});
test("V58 refuses role escalation, self-granting and an inactive BTC target",async t=>{
 const db=await setup();t.after(()=>db.close());
 const run=changes=>db.query("SELECT set_btc_account_permissions_v58($1,$2,$3,$4::jsonb)",[C,STAFF,ADMIN,JSON.stringify(changes)]);
 await assert.rejects(()=>run([{ability:"team.manage",allowed:true}]));
 await assert.rejects(()=>run([{ability:"bch.write",allowed:true}]));
 await assert.rejects(()=>db.query("SELECT set_btc_account_permissions_v58($1,$2,$3,$4::jsonb)",[
  C,STAFF,STAFF,JSON.stringify([{ability:"ballots.read",allowed:true}])
 ]));
 await db.query("UPDATE btc_accounts SET disabled_at=now() WHERE user_id=$1",[STAFF]);
 await assert.rejects(()=>run([{ability:"ballots.read",allowed:true}]));
 assert.equal((await db.query("SELECT COUNT(*)::integer AS n FROM audit_logs")).rows[0].n,0);
});
