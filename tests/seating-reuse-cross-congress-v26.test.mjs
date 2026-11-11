import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {createHash} from "node:crypto";
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
const reuseHelpers=evaluate(read("../src/lib/seating-reuse.ts"),{"node:crypto":{createHash}});
const user="a1111111-aaaa-4111-8111-111111111111";
const source="b1111111-bbbb-4111-8111-111111111111";
const target="b2222222-bbbb-4222-8222-222222222222";
const layout="d1111111-dddd-4111-8111-111111111111";
function dbFixture(){
 const tables={
  profiles:[{id:user,platform_role:"user"}],
  btc_accounts:[{user_id:user,congress_id:source,disabled_at:null},{user_id:user,congress_id:target,disabled_at:null}],
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
   is(k,v){eq.push([k,v]);return this;},
   in(k,v){ins.push([k,v]);return this;},order(){return this;},limit(){return this;},
   async maybeSingle(){return {data:rows()[0]||null,error:null};},
   then(ok,err){return Promise.resolve({data:rows(),count:rows().length,error:null}).then(ok,err);}};
  return obj;
 }
 return {calls,tables,db:{from(table){return {select(){return query(table);}};},
  async rpc(name,args){
   calls.push({name,args});
   if(tables.seating_layouts.some(layout=>layout.id===args.p_layout_id))return {data:null,error:{code:"23505"}};
   tables.seating_layouts.push({id:args.p_layout_id,congress_id:args.p_congress_id,title:args.p_title,
    stage_label:args.p_stage_label,grid_rows:args.p_grid_rows,grid_columns:args.p_grid_columns});
   for(const seat of args.p_seats)tables.seats.push({id:seat.id,congress_id:args.p_congress_id,
    layout_id:args.p_layout_id,code:seat.code,zone:seat.zone,row_label:seat.rowLabel,
    seat_number:seat.seatNumber,x:seat.x,y:seat.y,blocked:seat.blocked,seat_type:seat.seatType});
   return {data:1,error:null};}}};
}
function route(fixture,{admin=true,sourceAdmin=true,userId=user}={}){
 let n=0;
 const randomUUID=()=>"00000000-0000-4000-8000-"+String(++n).padStart(12,"0");
 return evaluate(read("../src/app/api/seating/reuse/route.ts"),{
  "node:crypto":{randomUUID},
  "next/cache":{revalidateTag:()=>{}},
  "@/lib/seating-reuse":reuseHelpers,
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
 assert.equal((await route(f).POST(post(source,layout,source))).status,200);
 assert.equal(f.calls.length,0);
});

test("Dùng cùng một sơ đồ nguồn nhiều lần chỉ tạo một bản ghế tại Đại hội đích",async()=>{
 const f=dbFixture(),handler=route(f);
 const first=await handler.POST(post());
 const a=await first.json();
 assert.equal(first.status,200);
 assert.equal(a.created,true);
 assert.equal(a.reused,false);
 assert.equal(f.calls.length,1);
 const ids=f.tables.seats.filter(seat=>seat.congress_id===target).map(seat=>seat.id);
 const second=await handler.POST(post());
 const b=await second.json();
 assert.equal(second.status,200);
 assert.equal(b.reused,true);
 assert.equal(b.layoutId,a.layoutId);
 assert.equal(b.seatCount,2);
 assert.equal(f.calls.length,1,"Không được gửi thêm RPC tạo sơ đồ");
 assert.deepEqual(f.tables.seats.filter(seat=>seat.congress_id===target).map(seat=>seat.id),ids);
});

test("Dùng sơ đồ trong cùng Đại hội chỉ chọn bản hiện hữu, không tạo mới",async()=>{
 const f=dbFixture();
 const result=await route(f).POST(post(source,layout,source));
 const body=await result.json();
 assert.equal(result.status,200);
 assert.equal(body.layoutId,layout);
 assert.equal(body.reused,true);
 assert.equal(body.created,false);
 assert.equal(body.seatCount,2);
 assert.equal(f.calls.length,0);
});

test("Dùng lại bản sao từ phiên bản cũ không nhân đôi dữ liệu ghế",async()=>{
 const f=dbFixture(),legacy="d2222222-dddd-4222-8222-222222222222";
 f.tables.seating_layouts.push({...f.tables.seating_layouts[0],id:legacy,congress_id:target});
 f.tables.seats.push(...f.tables.seats.filter(s=>s.congress_id===source).map((seat,index)=>({
  ...seat,id:"e1111111-aaaa-4111-8111-"+String(index+1).padStart(12,"0"),
  congress_id:target,layout_id:legacy
 })));
 const result=await route(f).POST(post());
 const body=await result.json();
 assert.equal(result.status,200);
 assert.equal(body.layoutId,legacy);
 assert.equal(body.reused,true);
 assert.equal(f.calls.length,0);
 assert.equal(f.tables.seating_layouts.length,2);
});

test("Cùng tên khác hình học không bị nhận nhầm là sơ đồ nguồn",async()=>{
 const f=dbFixture(),old="d3333333-dddd-4333-8333-333333333333";
 f.tables.seating_layouts.push({...f.tables.seating_layouts[0],id:old,congress_id:target});
 f.tables.seats.push(...f.tables.seats.filter(s=>s.congress_id===source).map((seat,index)=>({
  ...seat,id:"e2222222-aaaa-4111-8111-"+String(index+1).padStart(12,"0"),
  congress_id:target,layout_id:old,x:seat.x+15
 })));
 const result=await route(f).POST(post());
 assert.equal(result.status,200);
 assert.equal((await result.json()).created,true);
 assert.equal(f.calls.length,1);
});

test("Danh sách dùng lại không tiết lộ sơ đồ nguồn khi BTC đã bị thu hồi",async()=>{
 const f=dbFixture();
 f.tables.btc_accounts=[];
 const result=await route(f).GET(new Request("http://localhost:3000/api/seating/reuse?congressId="+target));
 assert.equal(result.status,200);
 assert.deepEqual((await result.json()).layouts,[]);
});

test("Định danh sơ đồ đích ổn định cho từng nguồn/từng Đại hội",()=>{
 const id=reuseHelpers.reusableLayoutId(target,"layout",layout);
 assert.match(id,/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
 assert.equal(id,reuseHelpers.reusableLayoutId(target,"layout",layout));
 assert.notEqual(id,reuseHelpers.reusableLayoutId(source,"layout",layout));
 assert.notEqual(id,reuseHelpers.reusableLayoutId(target,"template",layout));
});

test("GET đánh dấu sơ đồ nguồn đã được sử dụng ở Đại hội đích để hiển thị Mở lại",async()=>{
 const f=dbFixture(),handler=route(f);
 const first=await handler.POST(post());
 assert.equal(first.status,200);
 const layoutId=(await first.json()).layoutId;
 const response=await handler.GET(new Request("http://localhost:3000/api/seating/reuse?congressId="+target));
 const body=await response.json();
 assert.equal(response.status,200);
 assert.equal(body.layouts.length,1);
 assert.equal(body.layouts[0].alreadyUsedId,layoutId);
 assert.equal(f.calls.length,1);
});

test("Giao diện chọn sơ đồ cũ không dùng chức năng tạo mới",()=>{
 const ui=read("../src/components/seating-client.tsx");
 assert.match(ui,/function selectSavedLayout\(id:string\)/);
 assert.match(ui,/onClick=\{\(\)=>selectSavedLayout\(item\.id\)\}/);
 assert.match(ui,/alreadyUsedId\?"Mở sơ đồ đã có"/);
 assert.match(ui,/result\.reused/);
});
