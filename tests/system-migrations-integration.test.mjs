import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {PGlite} from "@electric-sql/pglite";

// PostgreSQL-compatible in-process integration test. Isolated memory DB:
// no network, no Supabase credentials, no modifications to real delegates.
const migration=(name)=>readFileSync(new URL("../supabase/"+name,import.meta.url),"utf8");

async function startDatabase(){
 const db=new PGlite();
 await db.exec("create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key); create table public.organizations(id uuid primary key); create table public.congresses(id uuid primary key, organization_id uuid);");
 return db;
}

test("V26/V36/V37 migrations actually execute, aggregate concurrent errors and protect private tables",async(t)=>{
 const db=await startDatabase();
 t.after(async()=>{await db.close();});
 await t.test("Migrations deploy in sequence and remain idempotent",async()=>{
  for(const file of [
   "upgrade-seating-reusable-templates-v26.sql",
   "upgrade-system-observability-v36.sql",
   "upgrade-system-incidents-v37.sql"
  ]){
   await db.exec(migration(file));
  }
  // A safe re-run after a disconnected SQL editor must not break DDL.
  await db.exec(migration("upgrade-system-observability-v36.sql"));
  await db.exec(migration("upgrade-system-incidents-v37.sql"));
 });
 const congressId=randomUUID();
 await db.query("insert into public.congresses(id) values($1)",[congressId]);
 const insert="insert into public.system_logs(level,source,event,message,congress_id,request_id,context) values ($1,'attendance','attendance.checkin_write_failed','Không ghi được điểm danh',$2,$3,$4)";
 async function log(level="error",errorCode="PGRST999"){
  await db.query(insert,[level,congressId,randomUUID(),{endpoint:"/api/checkins",dbCode:errorCode}]);
 }
 await t.test("Fingerprint reliably groups 3 repeated errors into 1 incident",async()=>{
  for(let i=0;i<3;i++)await log();
  const {rows}=await db.query("select occurrence_count, window_count, reopened_count, resolution, level from public.system_incidents");
  assert.equal(rows.length,1);
  assert.equal(Number(rows[0].occurrence_count),3);
  assert.equal(Number(rows[0].window_count),3);
  assert.equal(rows[0].resolution,"open");
 });
 await t.test("Resolving the incident and receiving a new error reopens it",async()=>{
  await db.exec("update public.system_incidents set resolution='resolved'");
  await log();
  const {rows}=await db.query("select occurrence_count,reopened_count,resolution from public.system_incidents");
  assert.equal(Number(rows[0].occurrence_count),4);
  assert.equal(Number(rows[0].reopened_count),1);
  assert.equal(rows[0].resolution,"open");
 });
 await t.test("Different database codes produce different fingerprints",async()=>{
  await log("error","PGRST998");
  const {rows}=await db.query("select count(*)::integer as count from public.system_incidents");
  assert.equal(rows[0].count,2);
 });
 await t.test("Info events stay in raw logs but do not create incidents",async()=>{
  await log("info","PGRST777");
  const {rows}=await db.query("select count(*)::integer as count from public.system_incidents");
  assert.equal(rows[0].count,2);
 });
 await t.test("RLS and SQL grants prevent direct browser access",async()=>{
  const {rows}=await db.query("select (select relrowsecurity from pg_class where oid='public.system_logs'::regclass) as logs_rls, (select relrowsecurity from pg_class where oid='public.system_incidents'::regclass) as incidents_rls, has_table_privilege('anon','public.system_logs','SELECT') as anon_logs, has_table_privilege('authenticated','public.system_incidents','SELECT') as user_incidents, has_table_privilege('service_role','public.system_incidents','INSERT') as server_insert, has_schema_privilege('anon','daihoi_private','USAGE') as anon_private");
  assert.deepEqual(rows.map(row=>[row.logs_rls,row.incidents_rls,row.anon_logs,row.user_incidents,row.server_insert,row.anon_private]),[[true,true,false,false,true,false]]);
 });
});
