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
 let status="live",failed=false;
 const observed=[];
 const db={from(table){
  observed.push(["from",table]);
  const query={
   select(fields){observed.push(["select",fields]);return this},
   eq(name,value){observed.push(["eq",name,value]);return this},
   order(){return this},
   limit:async()=>failed?{error:{code:"XX000"}}:{data:[{
    id,congress_id:id,full_name:"Ứng viên",birth_year:2002,
    current_position:"Đoàn viên",votes_received:100,
    total_ballots:110,photo_path:null
   }],error:null},
   maybeSingle:async()=>status==="live"?
    {data:{id,name:"Đại hội"},error:null}:
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
 assert.ok(observed.some(row=>row[0]==="limit" || row[0]==="from" && row[1]==="bch_candidates"));
 assert.equal((await call("bad.slug")).status,404);
 status="completed";
 assert.equal((await call()).status,404);
 status="live";failed=true;
 assert.equal((await call()).status,503);
});
test("Guest main page only transfers BCH count, loading full profiles on click",()=>{
 const page=read("src/app/guest/[slug]/page.tsx");
 const component=read("src/components/guest-congress-reader.tsx");
 assert.match(page,/select\("id",\{head:true,count:"exact"\}\)/);
 assert.doesNotMatch(page,/select\("id,congress_id,full_name,birth_year/);
 assert.match(component,/fetch\("\/api\/guest\/"/);
 assert.match(component,/credentials:"omit",cache:"no-store"/);
 assert.match(component,/controller\.abort\(\)/);
 assert.match(component,/if\(tab!=="bch"/);
 assert.match(component,/loadError\?/);
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
