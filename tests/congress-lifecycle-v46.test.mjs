import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {PGlite} from "@electric-sql/pglite";

const sql=readFileSync(new URL("../supabase/upgrade-congress-lifecycle-v46.sql",import.meta.url),"utf8");
async function database(){
 const db=new PGlite();
 await db.exec(`
  create schema if not exists public;
  create role anon;create role authenticated;create role service_role;
  create schema auth;create table auth.users(id uuid primary key);
  create table public.profiles(id uuid primary key references auth.users(id),platform_role text not null);
  create table public.congresses(id uuid primary key,name text not null);
  create table public.delegates(id uuid primary key, congress_id uuid references public.congresses(id) on delete cascade,
   auth_user_id uuid references auth.users(id) on delete set null);
  create table public.btc_accounts(user_id uuid primary key references auth.users(id),congress_id uuid references public.congresses(id) on delete cascade);
  create table public.congress_members(congress_id uuid references public.congresses(id) on delete cascade,
   user_id uuid references auth.users(id),role text, primary key(congress_id,user_id));
  create table public.seating_layouts(id uuid primary key, congress_id uuid references public.congresses(id) on delete cascade,
   created_by uuid references auth.users(id));
  create table public.attendance_sessions(id uuid primary key,congress_id uuid references public.congresses(id) on delete cascade,
   seating_layout_id uuid references public.seating_layouts(id) on delete set null);
  create table public.checkins(id uuid primary key,congress_id uuid references public.congresses(id) on delete cascade,
   session_id uuid not null references public.attendance_sessions(id),
   delegate_id uuid not null references public.delegates(id), checked_in_by uuid references auth.users(id));
  create table public.seats(id uuid primary key,layout_id uuid references public.seating_layouts(id) on delete cascade);
  create table public.seat_assignments(seat_id uuid references public.seats(id) on delete cascade,
   assigned_by uuid references auth.users(id));
  create table public.documents(id uuid primary key,congress_id uuid references public.congresses(id) on delete cascade,
   uploaded_by uuid references auth.users(id));
  create table public.bch_candidates(id uuid primary key,congress_id uuid references public.congresses(id) on delete cascade,
   created_by uuid references auth.users(id));
  create table public.audit_logs(id serial primary key,congress_id uuid references public.congresses(id) on delete cascade,
   actor_id uuid references auth.users(id),action text,details jsonb);
  create table public.seating_templates(id uuid primary key,created_by uuid references auth.users(id));
  create table public.voting_sessions(id uuid primary key,congress_id uuid references public.congresses(id) on delete cascade);
  create table public.votes(id uuid primary key,voting_session_id uuid references public.voting_sessions(id));
  create table public.system_logs(id uuid primary key default gen_random_uuid(),
   level text,source text,event text,message text,actor_id uuid,context jsonb);
 `);
 await db.exec(sql);
 return db;
}
async function seed(db){
 const ids=Object.fromEntries(["admin","user","other","congress","second","delegate","guest","session","map","checkin","doc","bch","voteSession","vote"].map(x=>[x,randomUUID()]));
 const q=async(s,args)=>db.query(s,args);
 for(const u of ["admin","user","other","delegate","guest"])await q("insert into auth.users(id) values($1)",[ids[u]]);
 await q("insert into public.profiles values($1,'super_admin'),($2,'user')",[ids.admin,ids.user]);
 await q("insert into public.congresses values($1,'Đại hội A'),($2,'Đại hội B')",[ids.congress,ids.second]);
 await q("insert into public.delegates values($1,$2,$3),($4,$5,$6)",[
  ids.delegate,ids.congress,ids.delegate,ids.guest,ids.second,ids.guest
 ]);
 await q("insert into public.seating_layouts values($1,$2,$3)",[ids.map,ids.congress,ids.admin]);
 await q("insert into public.attendance_sessions values($1,$2,$3)",[ids.session,ids.congress,ids.map]);
 await q("insert into public.checkins values($1,$2,$3,$4,$5)",[
  ids.checkin,ids.congress,ids.session,ids.delegate,ids.admin
 ]);
 await q("insert into public.documents values($1,$2,$3)",[ids.doc,ids.congress,ids.admin]);
 await q("insert into public.bch_candidates values($1,$2,$3)",[ids.bch,ids.congress,ids.admin]);
 await q("insert into public.voting_sessions values($1,$2)",[ids.voteSession,ids.congress]);
 await q("insert into public.votes values($1,$2)",[ids.vote,ids.voteSession]);
 return ids;
}
test("V46 migration: isolated, transactional and privilege-protected congress reset",async(t)=>{
 const db=await database();t.after(async()=>db.close());
 const i=await seed(db);
 const call=(actor,name,remove,sections)=>db.query(
  "select public.congress_purge_v46($1,$2,$3,$4,$5) AS result",
  [i.congress,actor,name,remove,sections]);
 await t.test("non-admin cannot reset and incorrect confirmation fails",async()=>{
  await assert.rejects(call(i.user,"Đại hội A",false,["documents"]),/CONGRESS_FORBIDDEN/);
  await assert.rejects(call(i.admin,"Wrong name",false,["documents"]),/CONGRESS_CONFIRMATION_MISMATCH/);
  await assert.rejects(call(i.admin,"Đại hội A",false,["bogus"]),/CONGRESS_INVALID_OPTIONS/);
  const {rows}=await db.query("select count(*)::int AS total from public.documents where congress_id=$1",[i.congress]);
  assert.equal(rows[0].total,1);
 });
 await t.test("selective reset removes delegates + dependent checkins, preserves other sections",async()=>{
  const {rows}=await call(i.admin,"Đại hội A",false,["delegates"]);
  assert.equal(rows[0].result.deleted,false);
  const counts=await db.query(`select
   (select count(*) from public.checkins where congress_id=$1)::int AS checkins,
   (select count(*) from public.delegates where congress_id=$1)::int AS delegates,
   (select count(*) from public.documents where congress_id=$1)::int AS documents,
   (select count(*) from public.attendance_sessions where congress_id=$1)::int AS sessions`,[i.congress]);
  assert.deepEqual(counts.rows[0],{checkins:0,delegates:0,documents:1,sessions:1});
  const other=await db.query("select count(*)::int AS total from public.delegates where congress_id=$1",[i.second]);
  assert.equal(other.rows[0].total,1);
  const queue=await db.query("select user_id,status from public.congress_identity_cleanup_queue where congress_id=$1",[i.congress]);
  assert.equal(queue.rows.length,1);assert.equal(queue.rows[0].user_id,i.delegate);
 });
 await t.test("seating reset detaches sessions, documents reset leaves BCH intact",async()=>{
  await call(i.admin,"Đại hội A",false,["seating"]);
  const seating=await db.query(`select
   (select count(*) from public.seating_layouts where congress_id=$1)::int AS maps,
   (select seating_layout_id from public.attendance_sessions where id=$2) AS linked`,[i.congress,i.session]);
  assert.deepEqual(seating.rows[0],{maps:0,linked:null});
  await call(i.admin,"Đại hội A",false,["documents"]);
  const docs=await db.query(`select
   (select count(*) from public.documents where congress_id=$1)::int AS docs,
   (select count(*) from public.bch_candidates where congress_id=$1)::int AS bch`,[i.congress]);
  assert.deepEqual(docs.rows[0],{docs:0,bch:1});
 });
 await t.test("full deletion removes votes, sessions and congress, retains other congress",async()=>{
  const {rows}=await call(i.admin,"Đại hội A",true,[]);
  assert.equal(rows[0].result.deleted,true);
  const result=await db.query(`select
   (select count(*) from public.congresses where id=$1)::int AS gone,
   (select count(*) from public.congresses where id=$2)::int AS other,
   (select count(*) from public.votes)::int AS votes`,[i.congress,i.second]);
  assert.deepEqual(result.rows[0],{gone:0,other:1,votes:0});
 });
});
