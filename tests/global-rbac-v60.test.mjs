import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {PGlite} from "@electric-sql/pglite";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const migration=read("supabase/upgrade-global-rbac-groups-v60.sql");
const CONGRESS="aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const OTHER="bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const ADMIN="cccccccc-cccc-4ccc-cccc-cccccccccccc";
const STAFF="dddddddd-dddd-4ddd-dddd-dddddddddddd";
const DELEGATE="eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee";
const GUEST="ffffffff-ffff-4fff-8fff-ffffffffffff";

async function schema(){
 const db=new PGlite();
 await db.exec([
  "CREATE ROLE anon;","CREATE ROLE authenticated;","CREATE ROLE service_role;",
  "CREATE SCHEMA auth;","CREATE SCHEMA private;",
  "CREATE TABLE auth.users(id uuid primary key);",
  "CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.user_id',true),'')::uuid $$;",
  "CREATE TABLE public.congresses(id uuid primary key);",
  "CREATE TABLE public.congress_members(congress_id uuid,user_id uuid,role text);",
  "CREATE TABLE public.btc_accounts(user_id uuid,congress_id uuid,disabled_at timestamptz);",
  "CREATE TABLE public.delegates(id uuid primary key,congress_id uuid,auth_user_id uuid,is_active boolean not null default true);",
  "CREATE TABLE public.bch_candidates(id uuid primary key,congress_id uuid not null);",
  "CREATE TABLE public.documents(id uuid primary key,congress_id uuid not null);",
  "CREATE TABLE public.seating_layouts(id uuid primary key,congress_id uuid not null);",
  "CREATE TABLE public.attendance_sessions(id uuid primary key,congress_id uuid not null);",
  "INSERT INTO auth.users VALUES ('"+ADMIN+"'),('"+STAFF+"'),('"+DELEGATE+"'),('"+GUEST+"');",
  "INSERT INTO public.congresses VALUES ('"+CONGRESS+"'),('"+OTHER+"');",
  "INSERT INTO public.congress_members VALUES ('"+CONGRESS+"','"+ADMIN+"','admin'),('"+CONGRESS+"','"+STAFF+"','checkin'),('"+CONGRESS+"','"+DELEGATE+"','delegate'),('"+CONGRESS+"','"+GUEST+"','guest');",
  "INSERT INTO public.btc_accounts VALUES ('"+ADMIN+"','"+CONGRESS+"',null),('"+STAFF+"','"+CONGRESS+"',null);",
  "INSERT INTO public.delegates VALUES ('11111111-1111-4111-8111-111111111111','"+CONGRESS+"','"+DELEGATE+"',true);"
 ].join("\n"));
 await db.exec(migration);
 return db;
}

test("V60 migration creates RLS-protected group, assignment and portal restriction tables",async t=>{
 const db=await schema();t.after(()=>db.close());
 const r=await db.query("SELECT relname,relrowsecurity FROM pg_class WHERE relname IN ('rbac_groups','rbac_account_assignments','rbac_portal_denials') ORDER BY relname");
 assert.equal(r.rows.length,3);
 assert.ok(r.rows.every(x=>x.relrowsecurity));
 for(const table of ["rbac_groups","rbac_account_assignments","rbac_portal_denials"]){
  const rights=await db.query("SELECT has_table_privilege('authenticated',$1,'INSERT') AS write,has_table_privilege('authenticated',$1,'SELECT') AS read",["public."+table]);
  assert.deepEqual(rights.rows[0],{write:false,read:true});
 }
});

test("V60 cross-tenant and cross-role group assignments fail at database trigger",async t=>{
 const db=await schema();t.after(()=>db.close());
 const a=(await db.query("INSERT INTO rbac_groups(congress_id,role,name,abilities) VALUES ($1,'delegate','Đại biểu chỉ xem tài liệu',ARRAY['portal.access','portal.documents']) RETURNING id",[CONGRESS])).rows[0].id;
 await db.query("INSERT INTO rbac_account_assignments(congress_id,user_id,group_id) VALUES ($1,$2,$3)",[CONGRESS,DELEGATE,a]);
 await assert.rejects(()=>db.query("INSERT INTO rbac_account_assignments(congress_id,user_id,group_id) VALUES ($1,$2,$3)",[CONGRESS,STAFF,a]));
 await assert.rejects(()=>db.query("INSERT INTO rbac_account_assignments(congress_id,user_id,group_id) VALUES ($1,$2,$3)",[OTHER,DELEGATE,a]));
 await assert.rejects(()=>db.query("INSERT INTO rbac_account_assignments(congress_id,user_id,group_id) VALUES ($1,$2,$3)",[CONGRESS,ADMIN,a]));
});

test("V60 denies disabled BTC access and permits only same-role valid identities",async t=>{
 const db=await schema();t.after(()=>db.close());
 const g=(await db.query("INSERT INTO rbac_groups(congress_id,role,name,abilities) VALUES ($1,'checkin','Tổ kiểm tra khu vực',ARRAY['workspace.view','attendance.read']) RETURNING id",[CONGRESS])).rows[0].id;
 await db.query("INSERT INTO rbac_account_assignments(congress_id,user_id,group_id) VALUES ($1,$2,$3)",[CONGRESS,STAFF,g]);
 await db.query("UPDATE btc_accounts SET disabled_at=now() WHERE user_id=$1",[STAFF]);
 const alternate=(await db.query("INSERT INTO rbac_groups(congress_id,role,name,abilities) VALUES ($1,'checkin','Tổ kiểm tra thay thế',ARRAY['workspace.view']) RETURNING id",[CONGRESS])).rows[0].id;
 await assert.rejects(()=>db.query("UPDATE rbac_account_assignments SET group_id=$1 WHERE user_id=$2",[alternate,STAFF]));
});

test("V60 grouped user is denied excluded permission by restrictive RLS helper",async t=>{
 const db=await schema();t.after(()=>db.close());
 const g=(await db.query("INSERT INTO rbac_groups(congress_id,role,name,abilities) VALUES ($1,'checkin','Tổ quét QR',ARRAY['workspace.view','attendance.read','attendance.scan']) RETURNING id",[CONGRESS])).rows[0].id;
 await db.query("INSERT INTO rbac_account_assignments(congress_id,user_id,group_id) VALUES ($1,$2,$3)",[CONGRESS,STAFF,g]);
 await db.query("SELECT set_config('test.user_id',$1,false)",[STAFF]);
 const result=(await db.query("SELECT private.rbac_staff_group_allows_v60($1,'attendance.scan') AS yes,private.rbac_staff_group_allows_v60($1,'documents.read') AS no,private.rbac_staff_group_allows_v60($2,'documents.read') AS other",[CONGRESS,OTHER])).rows[0];
 assert.deepEqual(result,{yes:true,no:false,other:true});
});

function compiled(path,mocks={}){
 const output=ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const obj={exports:{}};
 new Function("require","module","exports",output)(name=>{
  if(name in mocks)return mocks[name];
  throw Error("Missing stub "+name);
 },obj,obj.exports);
 return obj.exports;
}
test("Shared RBAC policy never grants beyond the base role and rejects invalid cross-role abilities",()=>{
 const policies=compiled("src/lib/congress-permissions.ts");
 const rbac=compiled("src/lib/access-rbac.ts",{"@/lib/congress-permissions":policies});
 assert.equal(rbac.validGroupAbilities("delegate",["portal.access","portal.documents"]),true);
 assert.equal(rbac.validGroupAbilities("delegate",["workspace.view"]),false);
 assert.equal(rbac.validGroupAbilities("guest",["portal.card"]),true);
 assert.equal(rbac.validGroupAbilities("checkin",["delegates.write"]),false);
 assert.equal(rbac.validGroupAbilities("checkin",["ballots.read"]),true);
 assert.equal(rbac.validGroupAbilities("checkin",["attendance.scan","attendance.scan"]),false);
 assert.deepEqual(rbac.resolveGroupAbilities(["portal.access","portal.card","portal.checkin"],["portal.access"]),["portal.access"]);
});

test("Read-only admin preview cannot grant a target user an authenticated session",()=>{
 const preview=read("src/app/dashboard/access/preview/[userId]/page.tsx");
 assert.match(preview,/platform_role!=="super_admin"/);
 assert.match(preview,/readonly_preview_opened/);
 assert.doesNotMatch(preview,/(signInWithPassword|setSession|exchangeCodeForSession|generateLink|updateUserById)/);
 const api=read("src/app/api/admin/access/route.ts");
 assert.ok(api.includes('data?.platform_role!=="super_admin"'));
 assert.match(api,/userId===actor/);
 const checkin=read("src/app/api/attendance/self-checkin/route.ts");
 assert.match(checkin,/hasPortalAbility\(user.id,session.congress_id,"portal.checkin"\)/);
});
