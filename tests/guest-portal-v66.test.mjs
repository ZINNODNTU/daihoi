import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {PGlite} from "@electric-sql/pglite";
import ts from "typescript";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const C1="bb4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const C2="cc4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const secret="gv_"+"X".repeat(32);
const otherSecret="gv_"+"Y".repeat(32);
function compile(file,mocks={}){
 const js=ts.transpileModule(read(file),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const mod={exports:{}};
 new Function("require","module","exports",js)(name=>{
  if(name==="server-only")return {};
  if(name==="node:crypto")return requireCrypto;
  if(name in mocks)return mocks[name];
  throw Error("Unexpected import "+name);
 },mod,mod.exports);
 return mod.exports;
}
const requireCrypto=await import("node:crypto");
test("Guest viewer code is high entropy, securely hashed, scoped to one congress and revoked immediately",async()=>{
 let cookie=C1+"."+secret,enabled=true,hash=requireCrypto.createHash("sha256").update(secret).digest("hex");
 const db={from(table){
  assert.equal(table,"congress_guest_links");
  return {select(){return this;},eq(){return this;},maybeSingle:async()=>({
   data:{enabled,access_hash:hash},error:null
  })};
 }};
 const utils=compile("src/lib/guest-congress-access.ts",{
  "next/headers":{cookies:async()=>({get:()=>({value:cookie})})},
  "@/lib/supabase/admin":{createAdminClient:()=>db}
 });
 assert.equal(utils.compareGuestCode(secret,utils.hashGuestCode(secret)),true);
 assert.equal(utils.compareGuestCode(otherSecret,utils.hashGuestCode(secret)),false);
 assert.equal(utils.parseGuestSession(C1+"."+secret).congressId,C1);
 assert.equal(utils.parseGuestSession("invalid"),null);
 assert.equal(await utils.hasGuestCongressAccess(C1),true);
 assert.equal(await utils.hasGuestCongressAccess(C2),false);
 cookie=C2+"."+otherSecret;
 assert.equal(await utils.hasGuestCongressAccess(C1),false);
 cookie=C1+"."+secret;
 hash=utils.hashGuestCode(otherSecret);
 assert.equal(await utils.hasGuestCongressAccess(C1),false,"rotation invalidates old session");
 hash=utils.hashGuestCode(secret);enabled=false;
 assert.equal(await utils.hasGuestCongressAccess(C1),false,"disabling invalidates guest session");
});

test("V66 SQL scopes access codes, enables RLS and upgrades only unrestricted legacy guest groups",async t=>{
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
 assert.equal(rows[0].abilities.includes("portal.history"),true);
 assert.equal(rows[1].abilities.includes("portal.checkin"),false);
 assert.equal(rows[2].abilities.includes("portal.checkin"),false);
 const rls=(await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.congress_guest_links'::regclass")).rows;
 assert.equal(rls[0].relrowsecurity,true);
 await db.exec(`INSERT INTO congress_guest_links(congress_id,access_hash) VALUES
 ('${C1}','${"a".repeat(64)}');`);
 await assert.rejects(()=>db.exec(`INSERT INTO congress_guest_links(congress_id,access_hash) VALUES
 ('${C1}','${"b".repeat(64)}');`));
});

test("Guest delegate gets check-in and seating only with an active guest delegate profile",async()=>{
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
 assert.equal(withProfile.includes("portal.history"),true);
});

test("Guest-view documents and portraits are read-only, require matching congress access",()=>{
 const docs=read("src/app/api/documents/[id]/route.ts");
 const images=read("src/app/api/bch-candidates/[id]/photo/route.ts");
 const guest=read("src/app/guest/[slug]/page.tsx");
 const entry=read("src/components/guest-access-entry.tsx");
 const admin=read("src/app/api/congresses/[id]/guest-access/route.ts");
 assert.match(docs,/if\(!doc.delegate_visible\)return fail/);
 assert.match(docs,/hasGuestCongressAccess\(doc.congress_id\)/);
 assert.match(images,/hasGuestCongressAccess\(candidate.congress_id\)/);
 assert.match(guest,/\.eq\("delegate_visible",true\)/);
 assert.match(entry,/replaceState/);
 assert.match(admin,/hasCongressAbility\(supabase,user.id,id,"team.manage"\)/);
 assert.match(admin,/hashGuestCode\(accessCode\)/);
 assert.match(read("src/app/api/attendance/self-checkin/route.ts"),/if\(!user\)return fail/);
});
