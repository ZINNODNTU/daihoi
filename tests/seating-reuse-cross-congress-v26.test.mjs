import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {validateSeatDrafts,renumberGridSeats} from "../src/lib/seating.ts";

const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
function evaluate(source,modules){
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const m={exports:{}};
 new Function("require","module","exports",js)(key=>{
  if(!(key in modules))throw Error("unknown module "+key);
  return modules[key];
 },m,m.exports);
 return m.exports;
}
const helpers=evaluate(read("../src/lib/seating-templates.ts"),{
 "@/lib/seating":{validateSeatDrafts}
});
const user="a1111111-aaaa-4111-8111-111111111111";
const source="b1111111-bbbb-4111-8111-111111111111";
const target="b2222222-bbbb-4222-8222-222222222222";
const layout="d1111111-dddd-4111-8111-111111111111";
function dbFixture(){
 const tables={
  profiles:[{id:user,platform_role:"user"}],
  congress_members:[{congress_id:source,user_id:user,role:"admin"},{congress_id:target,user_id:user,role:"admin"}],
  congresses:[{id:source,name:"Đại hội A"},{id:target,name:"Đại hội B"}],
  seating_layouts:[{id:layout,congress_id:source,title:"Hội trường A",stage_label:"SÂN KHẤU",grid_rows:10,grid_columns:20,updated_at:"2026-11-09T10:00:00Z"}],
  seats:[{id:"f1111111-ffff-4111-8111-111111111111",congress_id:source,layout_id:layout,
   code:"A-01",zone:"A",row_label:"A",seat_number:1,x:100,y:190,blocked:false,seat_type:"delegate"},
   {id:"f2222222-ffff-4222-8222-222222222222",congress_id:source,layout_id:layout,
   code:"A-02",zone:"A",row_label:"A",seat_number:2,x:160,y:190,blocked:false,seat_type:"guest"}]
 };
 const calls=[];
 function query(table){
  const eq=[],ins=[];
  function rows(){return (tables[table]||[]).filter(r=>eq.every(([k,v])=>r[k]===v)&&
   ins.every(([k,values])=>values.includes(r[k])));}
  const obj={select(){return this;},eq(k,v){eq.push([k,v]);return this;},
   in(k,v){ins.push([k,v]);return this;},order(){return this;},limit(){return this;},
   async maybeSingle(){return {data:rows()[0]||null,error:null};},
   then(ok,err){return Promise.resolve({data:rows(),error:null}).then(ok,err);}};
  return obj;
 }
 return {calls,db:{from(table){return {select(){return query(table);}};},
  async rpc(name,args){calls.push({name,args});return {data:1,error:null};}}};
}
function route(fixture,{admin=true,sourceAdmin=true,userId=user}={}){
 let n=0;
 const randomUUID=()=>"00000000-0000-4000-8000-"+String(++n).padStart(12,"0");
 return evaluate(read("../src/app/api/seating/reuse/route.ts"),{
  "node:crypto":{randomUUID},
  "next/server":{NextResponse:{json:(body,options={})=>new Response(JSON.stringify(body),{
   status:options.status||200,headers:{"Content-Type":"application/json",...options.headers}})}},
  "@/lib/auth":{getAuth:async()=>({supabase:{},user:userId?{id:userId}:null}),
   hasRole:async(_db,_user,congress)=>congress===source?sourceAdmin:admin},
  "@/lib/supabase/admin":{createAdminClient:()=>fixture.db},
  "@/lib/seating":{renumberGridSeats},
  "@/lib/seating-templates":helpers
 });
}
const post=(sourceCongressId=source,sourceLayoutId=layout,congressId=target)=>new Request(
 "http://localhost:3000/api/seating/reuse",{
 method:"POST",headers:{"Content-Type":"application/json","host":"localhost:3000","origin":"http://localhost:3000"},
 body:JSON.stringify({sourceCongressId,sourceLayoutId,congressId})
});

test("GET chỉ liệt kê sơ đồ thuộc Đại hội khác do tài khoản quản trị",async()=>{
 const f=dbFixture();
 const result=await route(f).GET(new Request("http://localhost:3000/api/seating/reuse?congressId="+target));
 assert.equal(result.status,200);
 const data=await result.json();
 assert.equal(data.layouts.length,1);
 assert.equal(data.layouts[0].congressName,"Đại hội A");
 assert.equal(data.layouts[0].title,"Hội trường A");
 assert.equal("delegate_id" in data.layouts[0],false);
});

test("POST sao chép sơ đồ từ Đại hội nguồn sang Đại hội đích, ID ghế mới không có người ngồi",async()=>{
 const f=dbFixture();
 const result=await route(f).POST(post());
 assert.equal(result.status,200);
 assert.equal((await result.json()).seatCount,2);
 assert.equal(f.calls.length,1);
 const saved=f.calls[0];
 assert.equal(saved.name,"seating_save_layout_v6");
 assert.equal(saved.args.p_congress_id,target);
 assert.equal(saved.args.p_expected_version,0);
 assert.notEqual(saved.args.p_layout_id,layout);
 assert.deepEqual(saved.args.p_seats.map(s=>s.code),["A-01","A-02"]);
 assert.equal(saved.args.p_seats[0].id!=="f1111111-ffff-4111-8111-111111111111",true);
 assert.equal(saved.args.p_seats[1].seatType,"guest");
 assert.doesNotMatch(JSON.stringify(saved.args.p_seats),/delegate_id|assigned_by|checked_in_at/);
});

test("Không được sao chép sơ đồ nếu không có quyền admin ở Đại hội nguồn hoặc đích",async()=>{
 const f=dbFixture();
 assert.equal((await route(f,{admin:false}).POST(post())).status,403);
 assert.equal((await route(f,{sourceAdmin:false}).POST(post())).status,403);
 assert.equal((await route(f,{userId:null}).POST(post())).status,401);
 assert.equal((await route(f).POST(post(source,layout,source))).status,400);
 assert.equal(f.calls.length,0);
});
