import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {PGlite} from "@electric-sql/pglite";
import {validateBchReorder} from "../src/lib/bch-candidates.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const congress="bb4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const delegate="aa4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const actor="cc4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const other="dd4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
function compile(path,mocks){
 const javascript=ts.transpileModule(read(path),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const mod={exports:{}};
 new Function("require","module","exports",javascript)(name=>{
  if(name==="next/server")return {NextResponse:{json:(data,options={})=>
   new Response(JSON.stringify(data),{status:options.status||200,headers:options.headers})}};
  if(name in mocks)return mocks[name];
  throw Error("Unexpected import "+name);
 },mod,mod.exports);
 return mod.exports;
}
const req=(url,body,origin="http://localhost:3000")=>new Request("http://localhost:3000"+url,{
 method:"POST",headers:{"Content-Type":"application/json",host:"localhost:3000",origin},
 body:JSON.stringify(body)
});

test("Delegate profile PATCH limits edits to own congress and immutable QR/auth identity",async()=>{
 const calls=[],logs=[];
 function mock({admin=true,user=true}={}){
  const chain={
   update(patch){calls.push(patch);return this;},eq(){return this;},select(){return this;},
   async maybeSingle(){return {data:{id:delegate,unit:"Công nghệ",position:"Bí thư"},error:null};}
  };
  return compile("src/app/api/delegates/route.ts",{
   "@/lib/auth":{getAuth:async()=>({user:user?{id:actor}:null,supabase:{from:()=>chain}}),
    hasCongressAbility:async()=>admin},
   "@/lib/delegate-demographics":{normalizeGender:value=>value||null,normalizeBirthDate:value=>value||null},
   "@/lib/system-log":{writeSystemLog:async data=>{logs.push(data);return "log";}}
  }).PATCH;
 }
 const patch=mock();
 const api="/api/delegates";
 const valid={congressId:congress,delegateId:delegate,unit:" Khoa Công nghệ ",position:" Bí thư "};
 const response=await patch(req(api,valid));
 assert.equal(response.status,200);
 assert.deepEqual(calls[0],{unit:"Khoa Công nghệ",position:"Bí thư"});
 assert.equal(logs[0].event,"delegate.profile_updated");
 assert.equal(logs[0].congressId,congress);
 assert.equal((await patch(req(api,{...valid,auth_user_id:other}))).status,400);
 assert.equal((await patch(req(api,{...valid,position:"A".repeat(161)}))).status,400);
 assert.equal((await patch(req(api,valid,"https://other.test"))).status,403);
 assert.equal(calls.length,1);
 assert.equal((await mock({admin:false})(req(api,valid))).status,403);
 assert.equal((await mock({user:false})(req(api,valid))).status,401);
 assert.equal(calls.length,1);
});

test("BCH drag-and-drop reorder validates UUID uniqueness and scopes RPC to authorized congress",async()=>{
 assert.equal(validateBchReorder([delegate,other]),true);
 for(const invalid of [[],[delegate,delegate],["invalid"],[delegate,delegate.toUpperCase()],[null],Array(501).fill(delegate)])
  assert.equal(validateBchReorder(invalid),false);
 const calls=[],logs=[];
 function route(admin=true){
  return compile("src/app/api/bch-candidates/reorder/route.ts",{
   "@/lib/auth":{getAuth:async()=>({user:{id:actor},supabase:{rpc:async(name,args)=>{
    calls.push({name,args});return {error:null};}}}),hasCongressAbility:async()=>admin},
   "@/lib/bch-candidates":{validateBchReorder},
   "@/lib/system-log":{writeSystemLog:async data=>{logs.push(data);return "x";}}
  }).POST;
 }
 const request=req("/api/bch-candidates/reorder",{congressId:congress,orderedIds:[other,delegate]});
 const response=await route()(request);
 assert.equal(response.status,200);
 assert.deepEqual(calls,[{name:"reorder_bch_candidates",args:{p_congress_id:congress,p_ids:[other,delegate]}}]);
 assert.equal(logs[0].event,"bch.order_updated");
 assert.equal((await route(false)(req("/api/bch-candidates/reorder",{congressId:congress,orderedIds:[other,delegate]}))).status,403);
 assert.equal((await route()(req("/api/bch-candidates/reorder",{congressId:congress,orderedIds:[delegate,delegate]}))).status,400);
 assert.equal(calls.length,1);
});
test("BCH SQL applies ordered UUID list atomically with invoker permission and exact set check",()=>{
 const sql=read("supabase/upgrade-bch-order-v39.sql");
 assert.match(sql,/SECURITY INVOKER/i);
 assert.match(sql,/private\.has_congress_role\(p_congress_id,'admin'\)/);
 assert.match(sql,/WITH ORDINALITY/i);
 assert.match(sql,/count\(DISTINCT item\)/i);
 assert.match(sql,/cardinality\(p_ids\)/i);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.reorder_bch_candidates/i);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION.*TO authenticated/i);
 const client=read("src/components/bch-candidates-client.tsx");
 assert.match(client,/draggable=\{canReorder\}/);
 assert.match(client,/onDrop=\{event=>/);
 assert.match(client,/resetChosen|moveCandidate/);
 assert.match(client,/setCandidates\(previous\)/);
 const portal=read("src/app/my-card/bch/page.tsx");
 assert.match(portal,/display_order/);
});

test("Account Excel never masquerades as readable existing Supabase Auth passwords",()=>{
 const account=read("src/components/delegate-accounts-client.tsx");
 assert.match(account,/resetSelectedAndExport/);
 assert.match(account,/selectedForReset/);
 assert.match(account,/\/api\/delegates\/accounts\/reset/);
 assert.match(account,/await exportIssued\(resetItems\)/);
 assert.match(account,/Chưa có mật khẩu để xuất/);
 assert.match(account,/Mật khẩu vừa cấp\/reset/);
});
test("BCH migration executes in PostgreSQL and reorders atomically without touching another congress",async(t)=>{
 const db=new PGlite();
 t.after(()=>db.close());
 await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon;
  CREATE SCHEMA auth; CREATE SCHEMA private;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT 'cc4c23d0-b7a1-4ee7-9bf4-2a0c924aff06'::uuid $$;
  CREATE FUNCTION private.has_congress_role(uuid,text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT true $$;
  GRANT USAGE ON SCHEMA auth, private TO authenticated;
  CREATE TABLE public.bch_candidates (
   id uuid PRIMARY KEY,congress_id uuid NOT NULL,display_order integer NOT NULL,
   updated_at timestamptz NOT NULL DEFAULT now()
  );
  GRANT SELECT,UPDATE ON public.bch_candidates TO authenticated;
  INSERT INTO public.bch_candidates(id,congress_id,display_order) VALUES
   ('aa4c23d0-b7a1-4ee7-9bf4-2a0c924aff06','bb4c23d0-b7a1-4ee7-9bf4-2a0c924aff06',1),('dd4c23d0-b7a1-4ee7-9bf4-2a0c924aff06','bb4c23d0-b7a1-4ee7-9bf4-2a0c924aff06',2),
   ('cc4c23d0-b7a1-4ee7-9bf4-2a0c924aff06','cc4c23d0-b7a1-4ee7-9bf4-2a0c924aff06',1);`);
 await db.exec(read("supabase/upgrade-bch-order-v39.sql"));
 await db.exec("SET ROLE authenticated");
 await db.exec(`SELECT public.reorder_bch_candidates('bb4c23d0-b7a1-4ee7-9bf4-2a0c924aff06',ARRAY['dd4c23d0-b7a1-4ee7-9bf4-2a0c924aff06','aa4c23d0-b7a1-4ee7-9bf4-2a0c924aff06']::uuid[])`);
 const readOrder=async()=>(await db.query("SELECT id,display_order FROM public.bch_candidates WHERE congress_id=$1 ORDER BY display_order",[congress])).rows;
 assert.deepEqual((await readOrder()).map(row=>row.id),[other,delegate]);
 assert.equal((await db.query("SELECT display_order FROM public.bch_candidates WHERE id=$1",[actor])).rows[0].display_order,1);
 await assert.rejects(()=>db.exec(`SELECT public.reorder_bch_candidates('bb4c23d0-b7a1-4ee7-9bf4-2a0c924aff06',ARRAY['aa4c23d0-b7a1-4ee7-9bf4-2a0c924aff06','aa4c23d0-b7a1-4ee7-9bf4-2a0c924aff06']::uuid[])`));
 assert.deepEqual((await readOrder()).map(row=>row.id),[other,delegate]);
 await assert.rejects(()=>db.exec(`SELECT public.reorder_bch_candidates('bb4c23d0-b7a1-4ee7-9bf4-2a0c924aff06',ARRAY['dd4c23d0-b7a1-4ee7-9bf4-2a0c924aff06','cc4c23d0-b7a1-4ee7-9bf4-2a0c924aff06']::uuid[])`));
 assert.deepEqual((await readOrder()).map(row=>row.id),[other,delegate]);
});
