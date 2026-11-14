import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

function compile(path,mocks={}){
 const code=ts.transpileModule(read(path),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
  jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true
 }}).outputText;
 const m={exports:{}};
 new Function("require","module","exports",code)(name=>{
  if(name in mocks)return mocks[name];
  if(name==="server-only")return {};
  throw Error("Unexpected module "+name);
 },m,m.exports);
 return m.exports;
}

const slug="dai-hoi-cong-nghe";
const id="2a046404-62ad-4530-94ad-98bb05bb126e";
const reply={
 json:(data,opts={})=>new Response(JSON.stringify(data),{
  status:opts.status||200,headers:opts.headers
 })
};
test("V75 public BCH endpoint is read-only, validates live congress, and excludes ballot totals",async()=>{
 let status="live",failed=false,empty=false;
 const observed=[];
 const db={from(table){
  observed.push(["from",table]);
  const query={
   select(fields){observed.push(["select",fields]);return this},
   eq(name,value){observed.push(["eq",name,value]);return this},
   order(field,options){observed.push(["order",field,options]);return this},
   limit(n,options){observed.push(["limit",n,options]);return this},
   abortSignal(signal){observed.push(["abortSignal",signal]);return this},
   maybeSingle:async()=>failed?{data:null,error:{code:"XX000"}}:status==="live"?
    {data:{id,name:"Đại hội",bch_candidates:empty?[]:[{
     id,congress_id:id,full_name:"Ứng viên",birth_year:2002,
     current_position:"Đoàn viên",votes_received:100,
     total_ballots:110,photo_path:null
    }]},error:null}:
    {data:null,error:null}
  };
  return query;
 }};
 const route=compile("src/app/api/guest/[slug]/bch/route.ts",{
  "next/server":{NextResponse:reply},
  "@/lib/supabase/admin":{createAdminClient:()=>db}
 });
 const call=(s=slug)=>route.GET(new Request("https://example.test/api/guest/"+s+"/bch"),{
  params:Promise.resolve({slug:s})
 });
 let r=await call();
 assert.equal(r.status,200);
 assert.match(r.headers.get("Cache-Control"),/no-store/);
 const candidate=(await r.json()).candidates[0];
 assert.equal(candidate.full_name,"Ứng viên");
 assert.equal(candidate.congressName,"Đại hội");
 assert.equal(candidate.votes_received,undefined);
 assert.equal(candidate.total_ballots,undefined);
 assert.ok(observed.some(row=>row[0]==="eq"&&row[1]==="status"&&row[2]==="live"));
 assert.equal(observed.filter(row=>row[0]==="from").length,1);
 assert.ok(observed.some(row=>row[0]==="select"&&row[1].includes("bch_candidates(")));
 assert.deepEqual(observed.find(row=>row[0]==="limit"),["limit",500,{referencedTable:"bch_candidates"}]);
 assert.ok(observed.some(row=>row[0]==="order"&&row[2]?.referencedTable==="bch_candidates"));
 assert.ok(observed.some(row=>row[0]==="abortSignal"&&row[1] instanceof AbortSignal));
 assert.match(r.headers.get("Server-Timing"),/^supabase;dur=/);
 assert.equal((await call("bad.slug")).status,404);
 empty=true;
 assert.deepEqual((await (await call()).json()).candidates,[]);
 empty=false;
 status="completed";
 assert.equal((await call()).status,404);
 status="live";failed=true;
 assert.equal((await call()).status,503);
});
test("Guest main page only transfers BCH count, loading full profiles on click",()=>{
 const page=read("src/app/guest/[slug]/page.tsx");
 const component=read("src/components/guest-congress-reader.tsx");
 assert.match(page,/bch_candidates\(count\)/);
 assert.match(page,/documents\(\$\{PUBLIC_DOCUMENT\}\)/);
 assert.match(page,/\.eq\("documents\.delegate_visible",true\)/);
 assert.match(page,/\.eq\("status","live"\)/);
 assert.match(page,/\.limit\(500,\{referencedTable:"documents"\}\)/);
 assert.match(page,/\.abortSignal\(AbortSignal\.timeout\(9000\)\)/);
 assert.doesNotMatch(page,/from\("documents"\)|from\("bch_candidates"\)/);
 assert.doesNotMatch(page,/votes_received|total_ballots/);
 assert.match(component,/fetch\("\/api\/guest\/"/);
 assert.match(component,/credentials:"omit",cache:"no-store"/);
 assert.match(component,/controller\.abort\(\)/);
 assert.match(component,/if\(tab!=="bch"/);
 assert.match(component,/loadError\?/);
});
test("Guest RSC loads one live public snapshot, exact count, visible documents and denies closed congress",async()=>{
 const calls=[];
 let mode="live";
 const publicDocument={id:"f1",file_name:"Đề án",delegate_visible:true,display_order:0};
 const query={
  select(fields){calls.push(["select",fields]);return this},
  eq(field,value){calls.push(["eq",field,value]);return this},
  order(field,options){calls.push(["order",field,options]);return this},
  limit(n,options){calls.push(["limit",n,options]);return this},
  abortSignal(signal){calls.push(["signal",signal]);return this},
  async maybeSingle(){
   if(mode==="failed")return {error:{code:"XX000"},data:null};
   if(mode==="closed")return {error:null,data:null};
   return {error:null,data:{
    id,slug,name:"Đại hội",kind:"doan",term:null,venue:null,
    starts_at:null,ends_at:null,status:"live",
    documents:[publicDocument],
    bch_candidates:[{count:2}]
   }};
  }
 };
 const page=compile("src/app/guest/[slug]/page.tsx",{
  "next/navigation":{notFound:()=>{throw new Error("NEXT_NOT_FOUND")}},
  "@/lib/supabase/admin":{createAdminClient:()=>({
   from(table){calls.push(["from",table]);return query}
  })},
  "@/components/guest-congress-reader":{GuestCongressReader:"guestReader"},
  "react/jsx-runtime":{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})}
 });
 const run=(s=slug)=>page.default({params:Promise.resolve({slug:s})});
 const rendered=await run();
 assert.equal(rendered.type,"guestReader");
 assert.equal(rendered.props.candidateCount,2);
 assert.deepEqual(rendered.props.docs,[publicDocument]);
 assert.equal(rendered.props.congress.id,id);
 assert.equal(rendered.props.congress.bch_candidates,undefined);
 assert.equal(rendered.props.congress.documents,undefined);
 assert.deepEqual(calls.filter(x=>x[0]==="from"),[["from","congresses"]]);
 assert.ok(calls.some(x=>x[0]==="select"&&x[1].includes("bch_candidates(count)")&&x[1].includes("documents(")));
 assert.ok(calls.some(x=>x[0]==="eq"&&x[1]==="documents.delegate_visible"&&x[2]===true));
 assert.ok(calls.some(x=>x[0]==="eq"&&x[1]==="status"&&x[2]==="live"));
 assert.deepEqual(calls.find(x=>x[0]==="limit"),["limit",500,{referencedTable:"documents"}]);
 assert.ok(calls.some(x=>x[0]==="signal"&&x[1] instanceof AbortSignal));
 await assert.rejects(()=>run("bad.slug"),/NEXT_NOT_FOUND/);
 mode="closed";
 await assert.rejects(()=>run(),/NEXT_NOT_FOUND/);
 mode="failed";
 const unavailable=await run();
 assert.equal(unavailable.type,"main");
 assert.equal(unavailable.props.role,"alert");
});

test("V78 Vercel project pins a single Mumbai compute region for all server functions",()=>{
 const config=JSON.parse(read("vercel.json"));
 assert.deepEqual(config.regions,["bom1"]);
 assert.equal(config.functions,undefined);
});

test("V78 public guest routes prefer Mumbai region matching the Supabase database",()=>{
 for(const path of [
  "src/app/guest/page.tsx",
  "src/app/guest/[slug]/page.tsx",
  "src/app/api/guest/[slug]/bch/route.ts"
 ]){
  const source=read(path);
  assert.match(source,/export const preferredRegion="bom1"/,path);
  assert.match(source,/export const dynamic="force-dynamic"/,path);
 }
});

test("Supabase media pagination counts records via HEAD, queries at most 36 records per view",()=>{
 const page=read("src/app/dashboard/media/page.tsx");
 const component=read("src/components/media-library-client.tsx");
 assert.match(page,/PAGE_SIZE=36/);
 assert.match(page,/MIXED_SIZE=18/);
 assert.match(page,/\.select\("id",\{count:"exact",head:true\}\)/);
 assert.match(page,/\.range\(from,to\)/);
 assert.match(page,/\.order\("full_name"\)\.order\("id"\)/);
 assert.match(page,/if\(profile\?\.platform_role!=="super_admin"\)redirect/);
 assert.match(page,/\.replace\(\/\[\^\\p\{L\}\\p\{N\}\\s-\]\/gu,""\)/);
 assert.doesNotMatch(page,/\.limit\(1000\)/);
 assert.doesNotMatch(component,/useState\(36\)/);
 assert.match(component,/method="GET" action="\/dashboard\/media"/);
 assert.match(component,/page>1/);
 assert.match(component,/page<pageCount/);
});
test("Realtime refreshes structure after changes, preserves fallback snapshots, and avoids overlap",()=>{
 const live=read("src/components/use-attendance-live.ts");
 assert.match(live,/FULL_REALTIME_MS=30000/);
 assert.match(live,/FULL_FALLBACK_MS=10000/);
 assert.match(live,/if\(!active\|\|!sessionId\|\|fullBusy\)return/);
 assert.match(live,/fullBusy=true/);
 assert.match(live,/fullBusy=false/);
 assert.match(live,/structuralPending=true/);
 assert.match(live,/seat_assignments/);
 assert.match(live,/seating_layouts/);
 assert.match(live,/attendance_sessions/);
 assert.match(live,/document.visibilityState==="hidden"/);
 assert.match(live,/clearTimeout\(structuralTimer\)/);
 assert.match(live,/void updates\(\)/);
 assert.match(read("src/app/api/attendance/live/route.ts"),/Cache-Control":"private, no-store"/);
});
