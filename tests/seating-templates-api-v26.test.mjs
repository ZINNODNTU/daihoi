import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {validateSeatDrafts,renumberGridSeats} from "../src/lib/seating.ts";

const code=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const evaluate=(source,mocks)=>{
 const compiled=ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const compiledModule={exports:{}};
 new Function("require","module","exports",compiled)(
  name=>{if(!(name in mocks))throw Error("Unexpected import: "+name);return mocks[name];},
  compiledModule,compiledModule.exports
 );
 return compiledModule.exports;
};
const helpers=evaluate(code("../src/lib/seating-templates.ts"),{
 "@/lib/seating":{validateSeatDrafts}
});
const userId="a1111111-aaaa-4111-8111-111111111111";
const sourceCongress="b1111111-bbbb-4111-8111-111111111111";
const targetCongress="b2222222-bbbb-4222-8222-222222222222";
const sourceOrg="c1111111-cccc-4111-8111-111111111111";
const targetOrg="c2222222-cccc-4222-8222-222222222222";
const templateId="d1111111-dddd-4111-8111-111111111111";
const sourceLayout="e1111111-eeee-4111-8111-111111111111";
function fixture({creator=userId,visibility="private",org=sourceOrg}={}){
 const seats=[
  {id:"f1111111-ffff-4111-8111-111111111111",congress_id:sourceCongress,layout_id:sourceLayout,
   code:"A-01",zone:"A",row_label:"A",seat_number:1,x:100,y:190,blocked:false,seat_type:"delegate"},
  {id:"f2222222-ffff-4222-8222-222222222222",congress_id:sourceCongress,layout_id:sourceLayout,
   code:"A-02",zone:"A",row_label:"A",seat_number:2,x:160,y:190,blocked:false,seat_type:"guest"}
 ];
 const template={id:templateId,created_by:creator,organization_id:org,visibility,
  title:"Phòng họp 2 dãy",stage_label:"SÂN KHẤU",grid_rows:10,grid_columns:20,
  seat_count:2,updated_at:"2026-11-09T10:00:00Z",
  seats:helpers.snapshotTemplateSeats(seats.map(s=>({
   id:s.id,code:s.code,zone:s.zone,rowLabel:s.row_label,seatNumber:s.seat_number,
   x:s.x,y:s.y,blocked:s.blocked,seatType:s.seat_type
  })))};
 const tables={
  congresses:[{id:sourceCongress,organization_id:sourceOrg},
   {id:targetCongress,organization_id:targetOrg}],
  seating_layouts:[{id:sourceLayout,congress_id:sourceCongress,title:"Sơ đồ cũ",
   stage_label:"SÂN KHẤU",grid_rows:10,grid_columns:20}],
  seats,seating_templates:[template]
 };
 const calls={rpc:[],insert:[]};
 function chain(name,source=tables[name]||[]){
  const where=[];let take=Infinity;
  const result=()=>({data:source.filter(r=>where.every(([key,value])=>r[key]===value)).slice(0,take),error:null});
  return {
   select(){return this;},eq(key,value){where.push([key,value]);return this;},
   order(){return this;},limit(n){take=n;return this;},
   async maybeSingle(){const {data}=result();return {data:data[0]||null,error:null};},
   async single(){const {data}=result();return {data:data[0]||null,error:null};},
   then(onOk,onErr){return Promise.resolve(result()).then(onOk,onErr);}
  };
 }
 const db={
  from(name){
   return {
    select(){return chain(name);},
    insert(row){
     calls.insert.push(row);
     return chain(name,[{...row,id:templateId,seat_count:row.seats.length}]);
    }
   };
  },
  async rpc(name,args){calls.rpc.push({name,args});return {data:1,error:null};}
 };
 return {db,calls};
}
function endpoints(fx,{admin=true,user=userId}={}){
 let counter=0;
 const randomUUID=()=>"00000000-0000-4000-8000-"+String(++counter).padStart(12,"0");
 return evaluate(code("../src/app/api/seating/templates/route.ts"),{
  "node:crypto":{randomUUID},
  "next/server":{NextResponse:{json:(payload,options={})=>
   new Response(JSON.stringify(payload),{status:options.status||200,headers:{"Content-Type":"application/json",...options.headers}})}},
  "@/lib/auth":{getAuth:async()=>({user:user?{id:user}:null,supabase:{}}),
   hasCongressAbility:async()=>admin},
  "@/lib/supabase/admin":{createAdminClient:()=>fx.db},
  "@/lib/seating":{renumberGridSeats},
  "@/lib/seating-templates":helpers
 });
}
function request(congressId,action,other={},origin="http://localhost:3000"){
 return new Request("http://localhost:3000/api/seating/templates",{
  method:"POST",headers:{"Content-Type":"application/json","host":"localhost:3000","origin":origin},
  body:JSON.stringify({congressId,action,...other})
 });
}

test("GET thư viện chỉ trả mẫu cá nhân và mẫu được chia sẻ cho đơn vị đích",async()=>{
 const mine=fixture();
 const url="http://localhost:3000/api/seating/templates?congressId="+targetCongress;
 const response=await endpoints(mine).GET(new Request(url));
 assert.equal(response.status,200);
 const body=await response.json();
 assert.deepEqual(body.templates.map(t=>t.id),[templateId]);
 assert.equal("seats" in body.templates[0],false);
 const hidden=fixture({creator:"a2222222-aaaa-4222-8222-222222222222",org:sourceOrg});
 const hiddenResponse=await endpoints(hidden).GET(new Request(url));
 assert.deepEqual((await hiddenResponse.json()).templates,[]);
});

test("POST lưu mẫu chỉ lấy ghế và metadata, không ghi ID ghế/đại biểu từ sơ đồ nguồn",async()=>{
 const fx=fixture();
 const route=endpoints(fx);
 const response=await route.POST(request(sourceCongress,"save-template",
  {layoutId:sourceLayout,title:"Mẫu hội trường",visibility:"organization"}));
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.ok,true);
 assert.equal(fx.calls.insert.length,1);
 assert.equal(fx.calls.insert[0].organization_id,sourceOrg);
 assert.deepEqual(Object.keys(fx.calls.insert[0].seats[0]).sort(),
  ["code","zone","rowLabel","seatNumber","x","y","blocked","seatType"].sort());
 assert.equal(fx.calls.rpc.length,0);
});

test("POST dùng mẫu ở Đại hội khác tạo layout và ghế mới bằng RPC, không phân người",async()=>{
 const fx=fixture();
 const response=await endpoints(fx).POST(request(targetCongress,"apply-template",{templateId}));
 assert.equal(response.status,200);
 assert.equal((await response.json()).seatCount,2);
 assert.equal(fx.calls.rpc.length,1);
 const rpc=fx.calls.rpc[0];
 assert.equal(rpc.name,"seating_save_layout_v6");
 assert.equal(rpc.args.p_congress_id,targetCongress);
 assert.equal(rpc.args.p_expected_version,0);
 assert.notEqual(rpc.args.p_layout_id,sourceLayout);
 assert.notEqual(rpc.args.p_seats[0].id,"f1111111-ffff-4111-8111-111111111111");
 assert.equal(rpc.args.p_seats[1].seatType,"guest");
 assert.equal(JSON.stringify(rpc.args).includes("delegate_id"),false);
 assert.equal(fx.calls.insert.length,0);
});

test("Không dùng mẫu cá nhân của người khác, không dùng mẫu chung khác đơn vị",async()=>{
 for(const options of [
  {creator:"a2222222-aaaa-4222-8222-222222222222",visibility:"private",org:targetOrg},
  {creator:"a2222222-aaaa-4222-8222-222222222222",visibility:"organization",org:sourceOrg}
 ]){
  const fx=fixture(options);
  const response=await endpoints(fx).POST(request(targetCongress,"apply-template",{templateId}));
  assert.equal(response.status,403);
  assert.equal(fx.calls.rpc.length,0);
 }
 const shared=fixture({
  creator:"a2222222-aaaa-4222-8222-222222222222",visibility:"organization",org:targetOrg
 });
 assert.equal((await endpoints(shared).POST(request(targetCongress,"apply-template",{templateId}))).status,200);
});

test("Từ chối chưa đăng nhập, không phải admin, mã Đại hội sai và Origin lạ",async()=>{
 const f=fixture();
 assert.equal((await endpoints(f,{user:null}).POST(request(targetCongress,"apply-template",{templateId}))).status,401);
 assert.equal((await endpoints(f,{admin:false}).POST(request(targetCongress,"apply-template",{templateId}))).status,403);
 assert.equal((await endpoints(f).POST(request("bad","apply-template",{templateId}))).status,400);
 assert.equal((await endpoints(f).POST(request(targetCongress,"apply-template",{templateId},"https://other.example"))).status,403);
 assert.equal(f.calls.rpc.length,0);
});
