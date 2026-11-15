import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PGlite} from "@electric-sql/pglite";

const sql=readFileSync(new URL("../supabase/upgrade-bch-new-committee-v84.sql",import.meta.url),"utf8");
const congressA="aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const congressB="bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const actor="cccccccc-cccc-4ccc-cccc-cccccccccccc";
const ids=Array.from({length:5},(_,i)=>"11111111-1111-4111-8111-"+String(i+1).padStart(12,"0"));
const idsLiteral=(members)=>"ARRAY["+members.map(id=>"'"+id+"'::uuid").join(",")+"]";
const publish=(members,ack=false)=>"SELECT * FROM public.publish_bch_new_committee_v84("+
 "'"+congressA+"'::uuid,"+idsLiteral(members)+","+(ack?"true":"false")+",'"+actor+"'::uuid)";

async function newDatabase(legacy=false){
 const db=new PGlite();
 await db.exec([
  "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;",
  "CREATE TABLE public.congresses(id uuid PRIMARY KEY,kind text NOT NULL,bch_total_ballots integer);",
  "CREATE TABLE public.bch_candidates(id uuid PRIMARY KEY,congress_id uuid NOT NULL REFERENCES public.congresses(id),votes_received integer);",
  "INSERT INTO public.congresses(id,kind,bch_total_ballots) VALUES('"+congressA+"','doan',100),('"+congressB+"','doan',50);",
  ...ids.map((id,i)=>"INSERT INTO public.bch_candidates VALUES('"+id+"','"+congressA+"',"+[95,90,85,85,65][i]+");"),
  legacy?"CREATE TABLE public.bch_new_committee_publications(congress_id uuid PRIMARY KEY,member_ids uuid[] NOT NULL,member_count integer NOT NULL,published_at timestamptz NOT NULL);":"",
  legacy?"INSERT INTO public.bch_new_committee_publications VALUES('"+congressB+"',ARRAY['"+ids[0]+"']::uuid[],1,'2026-11-14T12:00:00Z');":""
 ].join("\n"));
 await db.exec(sql);
 return db;
}

test("V84 actual SQL creates NO new table, only columns on congresses and service-only RPC",async t=>{
 const db=await newDatabase();t.after(()=>db.close());
 const rows=(await db.query("SELECT bch_new_member_ids,bch_new_published_at FROM public.congresses")).rows;
 assert.equal(rows.length,2);
 assert.ok(rows.every(row=>row.bch_new_member_ids===null&&row.bch_new_published_at===null));
 const exists=(await db.query("SELECT to_regclass('public.bch_new_committee_publications') IS NULL AS no_table")).rows[0];
 assert.equal(exists.no_table,true);
 const priv=await db.query("SELECT has_function_privilege('authenticated','public.publish_bch_new_committee_v84(uuid,uuid[],boolean,uuid)','EXECUTE') AS visitor,has_function_privilege('service_role','public.publish_bch_new_committee_v84(uuid,uuid[],boolean,uuid)','EXECUTE') AS service");
 assert.equal(priv.rows[0].visitor,false);
 assert.equal(priv.rows[0].service,true);
});

test("publish exactly N and keep ID ordering, reject duplicates and incorrect ranking",async t=>{
 const db=await newDatabase();t.after(()=>db.close());
 await assert.rejects(()=>db.query(publish([ids[0],ids[0]])));
 await assert.rejects(()=>db.query(publish([ids[0],ids[4]])));
 const outcome=await db.query(publish([ids[0],ids[1]]));
 assert.equal(outcome.rows[0].published_count,2);
 const result=(await db.query("SELECT bch_new_member_ids,bch_new_published_at FROM public.congresses WHERE id=$1",[congressA])).rows[0];
 assert.deepEqual(result.bch_new_member_ids,[ids[0],ids[1]]);
 assert.ok(result.bch_new_published_at);
 await db.query("UPDATE public.bch_candidates SET votes_received=10 WHERE id=$1",[ids[0]]);
 const same=(await db.query("SELECT bch_new_member_ids FROM public.congresses WHERE id=$1",[congressA])).rows[0];
 assert.deepEqual(same.bch_new_member_ids,[ids[0],ids[1]],"snapshot must not silently change after ballot edits");
 await db.query("UPDATE public.congresses SET bch_new_member_ids=NULL,bch_new_published_at=NULL WHERE id=$1",[congressA]);
 assert.equal((await db.query("SELECT bch_new_published_at FROM public.congresses WHERE id=$1",[congressA])).rows[0].bch_new_published_at,null);
});

test("tie at election cutoff must be acknowledged; no extra seat added",async t=>{
 const db=await newDatabase();t.after(()=>db.close());
 await assert.rejects(()=>db.query(publish([ids[0],ids[1],ids[2]])));
 const outcome=await db.query(publish([ids[0],ids[1],ids[2]],true));
 assert.equal(outcome.rows[0].published_count,3);
 const result=(await db.query("SELECT cardinality(bch_new_member_ids) AS n FROM public.congresses WHERE id=$1",[congressA])).rows[0];
 assert.equal(result.n,3);
});

test("legacy V83 snapshot is backfilled when present; unrelated congress stays separate",async t=>{
 const db=await newDatabase(true);t.after(()=>db.close());
 const a=(await db.query("SELECT bch_new_member_ids FROM public.congresses WHERE id=$1",[congressA])).rows[0];
 const b=(await db.query("SELECT bch_new_member_ids,bch_new_published_at FROM public.congresses WHERE id=$1",[congressB])).rows[0];
 assert.equal(a.bch_new_member_ids,null);
 assert.deepEqual(b.bch_new_member_ids,[ids[0]]);
 assert.ok(b.bch_new_published_at);
 await db.query("UPDATE public.congresses SET bch_new_member_ids=NULL,bch_new_published_at=NULL WHERE id=$1",[congressB]);
 await db.exec(sql); // idempotent; MUST NOT re-publish a previously retracted V83 snapshot
 const stable=(await db.query("SELECT bch_new_member_ids,bch_new_published_at FROM public.congresses WHERE id=$1",[congressB])).rows[0];
 assert.equal(stable.bch_new_member_ids,null);
 assert.equal(stable.bch_new_published_at,null);
});
