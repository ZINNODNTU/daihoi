import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const uuid="a74c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const congress="b84c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const actor="c94c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
function run(source,mocks){
 const compiled=ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true
 }}).outputText;
 const mod={exports:{}};
 new Function("require","module","exports",compiled)(name=>{
  if(name in mocks)return mocks[name];
  throw Error("Unexpected import: "+name);
 },mod,mod.exports);
 return mod.exports;
}
const next={NextResponse:{json:(body,options={})=>new Response(JSON.stringify(body),{
 status:options.status||200,headers:{"Content-Type":"application/json",...(options.headers||{})}
})}};
function makeMock({assignments=0,sessions=0,version=4,admin=true,user={id:actor},
 hasLayout=true}={}){
 const calls={deletes:[],audits:[]};
 const db={
  from(table){
   const where=new Map();
   let operation="";
   const chain={
    select(){return this;},
    eq(key,value){where.set(key,value);return this;},
    delete(){operation="delete";return this;},
    insert(data){calls.audits.push({table,data});return Promise.resolve({error:null});},
    async maybeSingle(){
     if(table==="seating_layouts"&&operation==="delete"){
      calls.deletes.push(Object.fromEntries(where));
      if(where.get("version")!==version||!hasLayout)return {data:null,error:null};
      return {data:{id:uuid},error:null};
     }
     return {data:hasLayout?{id:uuid,version,title:"Sơ đồ A"}:null,error:null};
    },
    then(resolve,reject){
     if(table==="seat_assignments")return Promise.resolve({count:assignments,error:null}).then(resolve,reject);
     if(table==="attendance_sessions")return Promise.resolve({count:sessions,error:null}).then(resolve,reject);
     return Promise.resolve({data:null,error:null}).then(resolve,reject);
    }
   };
   return chain;
  }
 };
 const api=run(read("../src/app/api/seating/route.ts"),{
  "next/server":next,
  "@/lib/auth":{
   getAuth:async()=>({user,supabase:{}}),
   hasRole:async()=>admin
  },
  "@/lib/supabase/admin":{createAdminClient:()=>db},
  "@/lib/seating":{validateSeatDrafts:()=>null,seatGridSizeValid:()=>true}
 });
 return {api,calls};
}
function request(version=4,origin="http://localhost:3000"){
 return new Request("http://localhost:3000/api/seating",{method:"DELETE",
  headers:{"Content-Type":"application/json","Origin":origin,"host":"localhost:3000"},
  body:JSON.stringify({congressId:congress,layoutId:uuid,expectedVersion:version})
 });
}
test("Admin chỉ được xóa sơ đồ chưa phân ghế và chưa gắn phiên điểm danh",async()=>{
 const fx=makeMock();
 const response=await fx.api.DELETE(request());
 assert.equal(response.status,200);
 assert.equal((await response.json()).deletedLayoutId,uuid);
 assert.equal(fx.calls.deletes.length,1);
 assert.deepEqual(fx.calls.deletes[0],{id:uuid,congress_id:congress,version:4});
 assert.equal(fx.calls.audits.length,1);
 assert.equal(fx.calls.audits[0].data.action,"seating.layout_deleted");
});

test("Chặn xóa sơ đồ đã phân ghế hoặc gắn bất cứ phiên điểm danh nào",async()=>{
 for(const config of [{assignments:1},{sessions:1},{assignments:3,sessions:2}]){
  const f=makeMock(config);
  const result=await f.api.DELETE(request());
  assert.equal(result.status,409);
  assert.equal(f.calls.deletes.length,0);
  assert.equal(f.calls.audits.length,0);
 }
});

test("Phải có quyền admin, đúng UUID, đúng version và cùng origin mới được xóa",async()=>{
 const noAdmin=makeMock({admin:false});
 assert.equal((await noAdmin.api.DELETE(request())).status,403);
 const anonymous=makeMock({user:null});
 assert.equal((await anonymous.api.DELETE(request())).status,401);
 const oldVersion=makeMock({version:5});
 assert.equal((await oldVersion.api.DELETE(request(4))).status,409);
 const tampered=makeMock();
 assert.equal((await tampered.api.DELETE(request(4,"https://evil.example"))).status,403);
 const missing=makeMock({hasLayout:false});
 assert.equal((await missing.api.DELETE(request())).status,404);
 assert.equal(noAdmin.calls.deletes.length+anonymous.calls.deletes.length+
  oldVersion.calls.deletes.length+tampered.calls.deletes.length+missing.calls.deletes.length,0);
});

test("Admin UI có danh sách sơ đồ, thao tác sửa/xóa và thông báo bảo vệ dữ liệu",()=>{
 const ui=read("../src/components/seating-client.tsx");
 assert.match(ui,/aria-label="Quản lý sơ đồ đã tạo"/);
 assert.match(ui,/data\.layouts\.map\(item=>/);
 assert.match(ui,/editSavedLayout\(item\.id\)/);
 assert.match(ui,/deleteSavedLayout\(item\)/);
 assert.match(ui,/method:"DELETE"/);
 assert.match(ui,/expectedVersion:target\.version/);
 assert.match(read("../src/app/api/seating/route.ts"),/Hãy bỏ phân công/);
});

test("Cổng đại biểu chọn Đại hội bằng bottom sheet hỗ trợ search và responsive",()=>{
 const ui=read("../src/components/portal-congress-picker.tsx");
 const shell=read("../src/components/delegate-shell.tsx");
 assert.match(ui,/role="dialog" aria-modal="true"/);
 assert.match(ui,/max-h-\[min\(89dvh,820px\)\]/);
 assert.match(ui,/env\(safe-area-inset-bottom\)/);
 assert.match(ui,/replace\(\/\[\\u0300-\\u036f\]\/g,""\)/);
 assert.match(ui,/aria-current=\{selected\?"true"/);
 assert.match(ui,/router\.refresh\(\)/);
 assert.match(ui,/type="search"/);
 assert.match(ui,/text-\[16px\]/);
 assert.match(shell,/activeCongressId\|\|path!=="\/my-card"/);
});
