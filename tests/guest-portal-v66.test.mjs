import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PGlite} from "@electric-sql/pglite";
import ts from "typescript";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const C1="bb4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const C2="cc4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
function compile(file,mocks={}){
 const js=ts.transpileModule(read(file),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const mod={exports:{}};
 new Function("require","module","exports",js)(name=>{
  if(name==="server-only")return {};
  if(name in mocks)return mocks[name];
  throw Error("Unexpected import "+name);
 },mod,mod.exports);
 return mod.exports;
}

test("V67 public guest reading checks a LIVE congress on every request, not a code or cookie",async()=>{
 let status="live",failed=false,lookups=[];
 const db={from(table){
  assert.equal(table,"congresses");
  return {select(fields){assert.equal(fields,"status");return this;},
   eq(k,v){lookups.push([k,v]);return this;},
   maybeSingle:async()=>failed?{data:null,error:{code:"PGRST"}}:{data:{status},error:null}};
 }};
 const access=compile("src/lib/public-congress-access.ts",{
  "@/lib/supabase/admin":{createAdminClient:()=>db}
 }).hasPublicCongressAccess;
 assert.equal(await access(C1),true);
 status="completed";
 assert.equal(await access(C1),false);
 status="preparing";
 assert.equal(await access(C1),false);
 status="live";
 assert.equal(await access(C2),true);
 assert.equal(await access("invalid"),false);
 failed=true;assert.equal(await access(C1),false);
 assert.deepEqual(lookups,Array.from({length:5},(_,i)=>["id",i===3?C2:C1]));
});

test("Public guest directory loads ONLY congresses with live status, no access code or admin toggle",async()=>{
 const checks=[];
 const list=compile("src/lib/guest-congress-list.ts",{
  "@/lib/supabase/admin":{createAdminClient:()=>({from(table){
   checks.push(["from",table]);
   return {select(fields){checks.push(["select",fields]);return this;},
    eq(k,v){checks.push(["eq",k,v]);return this;},
    order(k){checks.push(["order",k]);return this;},
    limit:async()=>({data:[{id:C1,slug:"dai-hoi-2026",name:"Đại hội",term:"2026–2029",
     kind:"doan",venue:"Hội trường",starts_at:null,ends_at:null}],error:null})
   };
  }})}
 }).loadAvailableGuestCongresses;
 const options=await list();
 assert.equal(options.length,1);
 assert.equal(options[0].slug,"dai-hoi-2026");
 assert.ok(checks.some(row=>row[0]==="eq"&&row[1]==="status"&&row[2]==="live"));
 assert.ok(!checks.some(row=>String(row[1]).includes("access_hash")||row[1]==="congress_guest_links"));
});

test("Legacy V66 storage stays RLS-protected but is no longer required for public guest access",async t=>{
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(`
 CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
 CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE TABLE public.congresses(id uuid PRIMARY KEY);
 CREATE TABLE public.rbac_groups(
  id int PRIMARY KEY,role text NOT NULL,abilities text[] NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
 );
 INSERT INTO auth.users VALUES ('aa4c23d0-b7a1-4ee7-9bf4-2a0c924aff06');
 INSERT INTO congresses VALUES ('${C1}'),('${C2}');
 INSERT INTO rbac_groups VALUES
 (1,'guest',ARRAY['portal.access','portal.card','portal.documents','portal.bch'],now()),
 (2,'guest',ARRAY['portal.access','portal.documents','portal.bch'],now()),
 (3,'delegate',ARRAY['portal.access','portal.card','portal.documents','portal.bch'],now());
 `);
 const sql=read("supabase/upgrade-guest-portal-v66.sql");
 await db.exec(sql);await db.exec(sql);
 const rows=(await db.query("SELECT id,abilities FROM rbac_groups ORDER BY id")).rows;
 assert.equal(rows[0].abilities.includes("portal.checkin"),true);
 assert.equal(rows[0].abilities.includes("portal.seating"),true);
 assert.equal(rows[1].abilities.includes("portal.checkin"),false);
 assert.equal(rows[2].abilities.includes("portal.checkin"),false);
 const rls=(await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.congress_guest_links'::regclass")).rows;
 assert.equal(rls[0].relrowsecurity,true);
 assert.equal(read("src/lib/public-congress-access.ts").includes("congress_guest_links"),false);
});

test("Guest delegates keep check-in and seating only when linked to an active delegate profile",async()=>{
 let linked=false;
 const db={from(table){
  if(table==="rbac_account_assignments")return {select(){return this;},eq(){return this;},
   maybeSingle:async()=>({data:null,error:null})};
  if(table==="rbac_portal_denials")return {select(){return this;},eq(){return this;},
   limit:async()=>({data:[],error:null})};
  if(table==="delegates")return {select(){return this;},eq(){return this;},
   limit:async()=>({data:linked?[{id:"profile"}]:[],error:null})};
  throw Error("Unrecognized "+table);
 }};
 const rbac=compile("src/lib/rbac-server.ts",{
  react:{cache:x=>x},
  "@/lib/rbac-schema":{isRbacMigrationPending:()=>false},
  "@/lib/supabase/admin":{createAdminClient:()=>db},
  "@/lib/access-rbac":{
   baseManagedAbilities:role=>role==="guest"?
    ["portal.access","portal.card","portal.documents","portal.bch","portal.checkin","portal.seating","portal.history"]:[],
   resolveGroupAbilities:(base,group)=>group===null?base:base.filter(x=>group.includes(x))
  }
 });
 const without=await rbac.getPortalAbilities("user",C1,"guest");
 assert.equal(without.includes("portal.documents"),true);
 assert.equal(without.includes("portal.checkin"),false);
 assert.equal(without.includes("portal.seating"),false);
 linked=true;
 const withProfile=await rbac.getPortalAbilities("user",C1,"guest");
 assert.equal(withProfile.includes("portal.checkin"),true);
 assert.equal(withProfile.includes("portal.seating"),true);
});

test("Anonymous PDF redirects only for a published document belonging to an ongoing congress",async()=>{
 let live=true,visible=true,congressChecked="";
 const db={from(table){
  assert.equal(table,"documents");
  return {select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{
   id:C2,congress_id:C1,drive_file_id:"testfile",mime_type:"application/pdf",delegate_visible:visible
  },error:null})};
 }};
 const API=compile("src/app/api/documents/[id]/route.ts",{
  "next/server":{NextResponse:{
   json:(value,{status=200,headers={}}={})=>new Response(JSON.stringify(value),{status,headers}),
   redirect:(url,status)=>new Response(null,{status,headers:{Location:String(url)}})
  }},
  "@/lib/auth":{getAuth:async()=>({user:null,supabase:{}})},
  "@/lib/supabase/admin":{createAdminClient:()=>db},
  "@/lib/drive-links":{googleDrivePreviewUrl:()=> "https://drive.google.com/file/d/testfile/preview",
   googleDriveFileUrl:()=> "https://drive.google.com/file/d/testfile/view"},
  "@/lib/system-log":{writeSystemLog:async()=>{}},
  "@/lib/public-congress-access":{hasPublicCongressAccess:async id=>{
   congressChecked=id;return live;
  }}
 });
 const request=()=>API.GET(new Request("https://daihoi.example/api/documents/"+C2),
  {params:Promise.resolve({id:C2})});
 const approved=await request();
 assert.equal(approved.status,302,await approved.clone().text());
 assert.equal(congressChecked,C1);
 assert.match(approved.headers.get("location"),/drive.google.com/);
 visible=false;
 assert.equal((await request()).status,403,"hidden document stays private even during live congress");
 visible=true;live=false;
 assert.equal((await request()).status,401,"completed/preparing congress does not expose Drive link");
});

test("Public guest UI has no code entry and APIs remain read-only",()=>{
 const entry=read("src/components/guest-access-entry.tsx");
 const list=read("src/lib/guest-congress-list.ts");
 const guest=read("src/app/guest/[slug]/page.tsx");
 const docs=read("src/app/api/documents/[id]/route.ts");
 const images=read("src/app/api/bch-candidates/[id]/photo/route.ts");
 assert.doesNotMatch(entry,/type="password"|gv_|onSubmit|Nhập mã|Mã đường dẫn/);
 assert.match(entry,/href=\{"\/guest\/"/);
 assert.match(list,/\.eq\("status","live"\)/);
 assert.match(guest,/\.eq\("status","live"\)/);
 assert.match(guest,/\.eq\("delegate_visible",true\)/);
 assert.match(docs,/hasPublicCongressAccess\(doc.congress_id\)/);
 assert.match(images,/hasPublicCongressAccess\(candidate.congress_id\)/);
 assert.match(read("src/app/api/attendance/self-checkin/route.ts"),/if\(!user\)return fail/);
 assert.doesNotMatch(read("src/app/congresses/[id]/team/page.tsx"),/GuestAccessManager/);
});
