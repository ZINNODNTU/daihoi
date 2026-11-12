import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PGlite} from "@electric-sql/pglite";
const migration=readFileSync(new URL("../supabase/upgrade-bch-shared-ballot-account-permissions-v57.sql",import.meta.url),"utf8");
const A="aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const B="bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const U="cccccccc-cccc-4ccc-cccc-cccccccccccc";
async function setup(){
 const db=new PGlite();
 const schema=[
 "CREATE ROLE authenticated;",
 "CREATE ROLE anon;",
 "CREATE ROLE service_role;",
 "CREATE SCHEMA auth;",
 "CREATE SCHEMA private;",
 "CREATE TABLE auth.users(id uuid PRIMARY KEY);",
 "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;",
 "CREATE TABLE public.congresses(id uuid PRIMARY KEY,kind text NOT NULL);",
 "CREATE TABLE public.btc_accounts(user_id uuid,congress_id uuid,disabled_at timestamptz);",
 "CREATE TABLE public.delegates(id uuid PRIMARY KEY,congress_id uuid);",
 "CREATE TABLE public.bch_candidates(id uuid PRIMARY KEY,congress_id uuid NOT NULL,votes_received integer,total_ballots integer,updated_at timestamptz DEFAULT now(),CONSTRAINT bch_candidate_ballot_tally_valid CHECK ((votes_received IS NULL AND total_ballots IS NULL) OR (votes_received>=0 AND total_ballots>=1 AND votes_received<=total_ballots)));",
 "INSERT INTO auth.users VALUES ('cccccccc-cccc-4ccc-cccc-cccccccccccc');",
 "INSERT INTO public.congresses VALUES ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','doan'),('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb','doan');",
 "INSERT INTO public.bch_candidates(id,congress_id,votes_received,total_ballots) VALUES ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',80,100),('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',90,100),('33333333-3333-4333-8333-333333333333','bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',10,20);"
 ].join("\n");
 await db.exec(schema);
 await db.exec(migration);
 return db;
}
test("V57 migration preserves 3 existing BCH results and backfills common total per congress",async(t)=>{
 const db=await setup();t.after(()=>db.close());
 const records=(await db.query("SELECT id,bch_total_ballots FROM public.congresses ORDER BY id")).rows;
 assert.deepEqual(records.map(r=>r.bch_total_ballots),[100,20]);
 const candidateTotals=(await db.query("SELECT total_ballots FROM public.bch_candidates ORDER BY id")).rows;
 assert.deepEqual(candidateTotals.map(r=>r.total_ballots),[100,100,20]);
});
test("one RPC change updates all candidate totals atomically and rejects totals below recorded votes",async(t)=>{
 const db=await setup();t.after(()=>db.close());
 const response=await db.query("SELECT public.set_bch_shared_ballot_total($1,$2) AS changed",[A,120]);
 assert.equal(response.rows[0].changed,2);
 assert.deepEqual((await db.query("SELECT total_ballots FROM public.bch_candidates ORDER BY id")).rows.map(r=>r.total_ballots),[120,120,20]);
 assert.equal((await db.query("SELECT bch_total_ballots FROM public.congresses WHERE id=$1",[A])).rows[0].bch_total_ballots,120);
 await assert.rejects(()=>db.query("SELECT public.set_bch_shared_ballot_total($1,$2)",[A,85]));
 assert.equal((await db.query("SELECT bch_total_ballots FROM public.congresses WHERE id=$1",[A])).rows[0].bch_total_ballots,120);
});
test("a shared total cannot be removed while any candidate has recorded votes",async(t)=>{
 const db=await setup();t.after(()=>db.close());
 await assert.rejects(()=>db.query("SELECT public.set_bch_shared_ballot_total($1,$2)",[A,null]));
 assert.equal((await db.query("SELECT count(*)::integer AS n FROM public.bch_candidates WHERE congress_id=$1",[A])).rows[0].n,2);
});
test("per-account restrictions store only denials and cannot grant extra privileges",async(t)=>{
 const db=await setup();t.after(()=>db.close());
 await db.query("INSERT INTO public.btc_account_capability_restrictions(congress_id,user_id,ability,allowed) VALUES($1,$2,'bch.write',false)",[A,U]);
 assert.deepEqual((await db.query("SELECT ability,allowed FROM public.btc_account_capability_restrictions")).rows,[{ability:"bch.write",allowed:false}]);
 await assert.rejects(()=>db.query("INSERT INTO public.btc_account_capability_restrictions(congress_id,user_id,ability,allowed) VALUES($1,$2,'bch.read',true)",[A,U]));
 await assert.rejects(()=>db.query("INSERT INTO public.btc_account_capability_restrictions(congress_id,user_id,ability,allowed) VALUES($1,$2,'team.manage',false)",[B,U]));
});
