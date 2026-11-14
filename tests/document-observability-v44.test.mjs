import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {PGlite} from "@electric-sql/pglite";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const congress="bb4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const otherCongress="cc4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const first="aa4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const second="dd4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const third="ee4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const actor="ff4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
function compile(path,mocks){
 const js=ts.transpileModule(read(path),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const mod={exports:{}};
 new Function("require","module","exports",js)(name=>{
  if(name==="next/server")return {NextResponse:{json:(body,options={})=>
   new Response(JSON.stringify(body),{status:options.status||200,headers:options.headers})}};
  if(name==="@/lib/public-congress-access")return {hasPublicCongressAccess:async()=>false};
   if(name in mocks)return mocks[name];
  throw Error("Unexpected import "+name);
 },mod,mod.exports);
 return mod.exports;
}
const makePost=(url,payload)=>new Request("https://daihoi.example"+url,{
 method:"POST",headers:{origin:"https://daihoi.example",host:"daihoi.example",
  "Content-Type":"application/json"},body:JSON.stringify(payload)
});
const makeDelete=(id,congressId)=>new Request("https://daihoi.example/api/documents/"+id,{
 method:"DELETE",headers:{origin:"https://daihoi.example",host:"daihoi.example",
  "Content-Type":"application/json"},body:JSON.stringify({congressId})
});

test("Document migration creates display order, preserves newest-first, and atomically reorders exact congress",async t=>{
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
 CREATE TABLE public.documents(id uuid PRIMARY KEY,congress_id uuid NOT NULL,
 file_name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
 INSERT INTO public.documents(id,congress_id,file_name,created_at) VALUES
 ('${first}','${congress}','old','2026-01-01'),
 ('${second}','${congress}','new','2026-03-01'),
 ('${third}','${otherCongress}','other','2026-02-01');`);
 const sql=read("supabase/upgrade-document-management-v43.sql");
 await db.exec(sql);
 let result=await db.query("SELECT id,display_order FROM documents WHERE congress_id=$1 ORDER BY display_order",[congress]);
 assert.deepEqual(result.rows.map(r=>r.id),[second,first]);
 assert.equal(result.rows[0].display_order,1);
 await db.exec(sql); // safely repeat migration without corrupting the order
 await db.exec("GRANT SELECT,UPDATE ON public.documents TO service_role; SET ROLE service_role");
 await db.exec(`select public.reorder_congress_documents('${congress}',ARRAY['${first}','${second}']::uuid[]);`);
 result=await db.query("SELECT id,display_order FROM documents WHERE congress_id=$1 ORDER BY display_order",[congress]);
 assert.deepEqual(result.rows.map(r=>r.id),[first,second]);
 await assert.rejects(()=>db.exec(`select public.reorder_congress_documents('${congress}',ARRAY['${first}','${first}']::uuid[]);`));
 await assert.rejects(()=>db.exec(`select public.reorder_congress_documents('${congress}',ARRAY['${first}','${third}']::uuid[]);`));
 result=await db.query("SELECT id FROM documents WHERE congress_id=$1 ORDER BY display_order",[congress]);
 assert.deepEqual(result.rows.map(r=>r.id),[first,second]);
 assert.equal((await db.query("SELECT display_order FROM documents WHERE id=$1",[third])).rows[0].display_order,1);
 assert.match(sql,/REVOKE ALL ON FUNCTION.*FROM PUBLIC,anon,authenticated/i);
});

test("Document reorder endpoint enforces authorized congress, unique ids and atomic RPC",async()=>{
 const calls=[],logs=[];
 const route=(allowed=true)=>compile("src/app/api/documents/reorder/route.ts",{
  "@/lib/auth":{getAuth:async()=>({user:{id:actor},supabase:{}}),hasCongressAbility:async()=>allowed},
  "@/lib/supabase/admin":{createAdminClient:()=>({rpc:async(name,args)=>{calls.push({name,args});return {error:null};}})},
  "@/lib/system-log":{writeSystemLog:async x=>{logs.push(x);return "ok";}}
 }).POST;
 const input={congressId:congress,orderedIds:[first,second]};
 const result=await route()(makePost("/api/documents/reorder",input));
 assert.equal(result.status,200);
 assert.deepEqual(calls[0],{name:"reorder_congress_documents",args:{p_congress_id:congress,p_ids:[first,second]}});
 assert.equal(logs[0].event,"documents.order_updated");
 assert.equal((await route(false)(makePost("/api/documents/reorder",input))).status,403);
 assert.equal((await route()(makePost("/api/documents/reorder",{...input,orderedIds:[first,first]}))).status,400);
 assert.equal((await route()(makePost("/api/documents/reorder",{...input,orderedIds:[first,third,first]}))).status,400);
 assert.equal(calls.length,1);
});

test("Document delete removes metadata for one congress without invoking Drive deletion",async()=>{
 const calls=[],logs=[];
 const route=(allowed=true,found=true)=>compile("src/app/api/documents/[id]/route.ts",{
  "@/lib/auth":{getAuth:async()=>({user:{id:actor},supabase:{}}),hasCongressAbility:async()=>allowed},
  "@/lib/supabase/admin":{createAdminClient:()=>({
   from:()=>({delete(){calls.push("delete");return this;},eq(k,v){calls.push([k,v]);return this;},
    select(){return this;},async maybeSingle(){return {data:found?{id:first,file_name:"van-kien.pdf"}:null,error:null};}})
  })},
  "@/lib/drive-links":{googleDriveFileUrl:()=>"",googleDrivePreviewUrl:()=>""},
  "@/lib/system-log":{writeSystemLog:async x=>{logs.push(x);return "ok";}}
 }).DELETE;
 assert.equal((await route()(makeDelete(first,congress),{params:Promise.resolve({id:first})})).status,200);
 assert.deepEqual(calls,[ "delete",["id",first],["congress_id",congress] ]);
 assert.equal(logs[0].event,"documents.removed");
 assert.equal((await route(false)(makeDelete(first,congress),{params:Promise.resolve({id:first})})).status,403);
 assert.equal((await route(true,false)(makeDelete(first,congress),{params:Promise.resolve({id:first})})).status,404);
 assert.equal((await route()(makeDelete("fake",congress),{params:Promise.resolve({id:"fake"})})).status,400);
});

test("Admin documents UI includes remove and accessible ordering controls; delegate honors display order",()=>{
 const ui=read("src/components/documents-client.tsx");
 assert.match(ui,/Gỡ tài liệu/);
 assert.match(ui,/window\.confirm/);
 assert.match(ui,/draggable=\{canReorder\}/);
 assert.match(ui,/onDrop=\{event=>/);
 assert.match(ui,/ArrowUp/);assert.match(ui,/ArrowDown/);
 assert.match(read("src/app/my-card/documents/page.tsx"),/order\("display_order"/);
 assert.match(read("src/components/delegate-documents-list.tsx"),/a\.display_order/);
});

test("System log export has authorization gates, scope filter, bounded export and spreadsheet formula protection",async()=>{
 const filters=[];
 const data=[{
  occurred_at:"2026-11-11T12:00:00Z",level:"error",source:"api",
  event:"webhook.failed",message:"=HYPERLINK(\"https://unsafe.example\")",
  congress_id:congress,request_id:first,status_code:500,duration_ms:22,
  resolution:"open",release:"abc",environment:"production",fingerprint:"hash"
 }];
 const mock={
  "@/lib/system-log-access":{getSystemLogAccess:async()=>({
   user:{id:actor},allowed:true,superAdmin:false,congressIds:[congress]
  })},
  "@/lib/supabase/admin":{createAdminClient:()=>({from:()=>({
   select(){return this;},gte(){return this;},order(){return this;},
   limit(){return this;},eq(k,v){filters.push([k,v]);return this;},
   in(k,v){filters.push([k,v]);return this;},ilike(){return this;},
   then(resolve){return Promise.resolve({data,count:1,error:null}).then(resolve);}
  })})}
 };
 const api=compile("src/app/api/system-logs/export/route.ts",mock);
 const url="https://daihoi.example/api/system-logs/export?congressId="+congress+"&requestId="+first+"&period=24h";
 const res=await api.GET(new Request(url));
 assert.equal(res.status,200);
 assert.match(res.headers.get("content-type"),/text\/csv/);
 assert.equal(res.headers.get("x-export-rows"),"1");
 const bytes=new Uint8Array(await res.clone().arrayBuffer());
 assert.deepEqual([...bytes.slice(0,3)],[239,187,191]);
 const csv=await res.text();
 assert.match(csv,/\u0027=HYPERLINK/);
 assert.ok(filters.some(([name,v])=>name==="congress_id"&&v===congress));
 assert.ok(filters.some(([name,v])=>name==="request_id"&&v===first));
 assert.equal((await api.GET(new Request(url.replace(congress,otherCongress)))).status,403);
 assert.equal((await api.GET(new Request(url.replace(first,"invalid")))).status,400);
 const deny=compile("src/app/api/system-logs/export/route.ts",{
  ...mock,"@/lib/system-log-access":{getSystemLogAccess:async()=>({user:{id:actor},allowed:false})}
 });
 assert.equal((await deny.GET(new Request(url))).status,403);
 assert.equal(api.csvCell("  =1+2").startsWith("\"'"),true);
});

test("Event histogram never returns data across unprivileged congresses",async()=>{
 const args=[];
 const api=compile("src/app/api/system-logs/analytics/route.ts",{
  "@/lib/system-log-access":{getSystemLogAccess:async()=>({
   user:{id:actor},allowed:true,superAdmin:false,congressIds:[congress]
  })},
  "@/lib/supabase/admin":{createAdminClient:()=>({from:()=>({
   select(){return this;},gte(){return this;},order(){return this;},
   limit(){return this;},eq(k,v){args.push([k,v]);return this;},
   in(k,v){args.push([k,v]);return this;},
   then(resolve){return Promise.resolve({data:[{
    occurred_at:new Date(Date.now()-60000).toISOString(),level:"error",source:"documents"
   }],count:1,error:null}).then(resolve);}
  })})}
 }).GET;
 const res=await api(new Request("https://daihoi.example/api/system-logs/analytics?period=24h&congressId="+congress));
 assert.equal(res.status,200);
 const json=await res.json();
 assert.equal(json.counted,1);
 assert.equal(json.levels.error,1);
 assert.equal(json.buckets.reduce((v,b)=>v+b.total,0),1);
 assert.ok(args.some(([key,v])=>key==="congress_id"&&v===congress));
 assert.equal((await api(new Request("https://daihoi.example/api/system-logs/analytics?congressId="+otherCongress))).status,403);
});
