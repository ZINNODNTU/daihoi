import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {validateSeatDrafts} from "../src/lib/seating.ts";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const moduleFrom=(source,mocks)=>{
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const compiledModule={exports:{}};
 new Function("require","module","exports",js)(name=>{
  if(name in mocks)return mocks[name];
  throw Error("Unexpected import: "+name);
 },compiledModule,compiledModule.exports);
 return compiledModule.exports;
};
const {snapshotTemplateSeats,instantiateTemplateSeats}=moduleFrom(read("../src/lib/seating-templates.ts"),{
 "@/lib/seating":{validateSeatDrafts}
});
const seat=(id,code,x,seatType="delegate")=>({
 id,code,zone:"A",rowLabel:"A",seatNumber:1,x,y:190,blocked:false,seatType
});

test("Snapshot chỉ lưu tọa độ, mã và loại ghế; loại bỏ danh tính và phân công",()=>{
 const original=[
  {...seat("source-1","A-01",100),delegate_id:"secret",checked_in_at:"private"},
  {...seat("source-2","A-02",200,"guest"),blocked:true,barcode_code:"secret"}
 ];
 const saved=snapshotTemplateSeats(original);
 assert.equal(saved.length,2);
 for(const row of saved)for(const k of ["id","delegate_id","barcode_code","checked_in_at","congress_id","assigned_by"])
  assert.equal(Object.hasOwn(row,k),false,k);
 assert.deepEqual(saved.map(s=>s.seatType),["delegate","guest"]);
 assert.equal(saved[1].blocked,true);
 let id=0;
 const cloned=instantiateTemplateSeats(saved,()=>String(++id));
 assert.deepEqual(cloned.map(s=>s.id),["1","2"]);
 assert.deepEqual(cloned.map(s=>s.code),["A-01","A-02"]);
 assert.equal(cloned[1].seatType,"guest");
 assert.equal(cloned[1].blocked,true);
 assert.notEqual(cloned[0].id,original[0].id);
});

test("Từ chối mẫu trống, quá 500 ghế, tọa độ/mã trùng hoặc loại ghế sai",()=>{
 for(const data of [
  [],Array.from({length:501},(_,i)=>seat(String(i),"X-"+i,i)),
  [seat("x","A-01",100),seat("y","A-02",100)],
  [seat("x","A-01",100),seat("y","A-01",200)],
  [seat("x","A-01",100,"vip")],
  [{...seat("x","A-01",100),blocked:"no"}],
  [{...seat("x","A-01",100),seatNumber:0}]
 ]) assert.throws(()=>instantiateTemplateSeats(data,()=>crypto.randomUUID()));
});

test("API yêu cầu admin cho cả lưu mẫu, danh sách và áp dụng; không cho truy cập cross-tenant",()=>{
 const api=read("../src/app/api/seating/templates/route.ts");
 assert.match(api,/hasCongressAbility\(supabase,user\.id,congressId,\"seating\.write\"\)/);
 assert.match(api,/\.eq\("congress_id",congressId\)/);
 assert.match(api,/\.eq\("created_by",user\.id\)/);
 assert.match(api,/\.eq\("organization_id",organizationId\)/);
 assert.match(api,/\.eq\("visibility","organization"\)/);
 assert.match(api,/template\.created_by!==user\.id/);
 assert.match(api,/template\.organization_id===organizationId/);
 assert.match(api,/return fail\("Bạn không có quyền áp dụng mẫu sơ đồ này\.",403\)/);
 assert.match(api,/new URL\(origin\)\.host!==request\.headers\.get\("host"\)/);
});

test("Áp dụng tạo UUID sơ đồ và ghế mới, ghi bằng RPC nguyên tử của Đại hội đích",()=>{
 const api=read("../src/app/api/seating/templates/route.ts");
 assert.match(api,/instantiateTemplateSeats\(template\.seats,randomUUID\)/);
 assert.match(api,/const layoutId=randomUUID\(\)/);
 assert.match(api,/db\.rpc\("seating_save_layout_v6"/);
 assert.match(api,/p_congress_id:congressId,p_layout_id:layoutId,p_expected_version:0/);
 assert.doesNotMatch(api,/seat_assignments"\)\.insert|checkins"\)\.insert/);
 assert.match(api,/\.eq\("id",layoutId\)\.eq\("congress_id",congressId\)/);
});

test("Giao diện xuất hiện ở trang sơ đồ ghế và SQL có RLS, không sửa lịch sử",()=>{
 const ui=read("../src/components/seating-client.tsx");
 const sql=read("../supabase/upgrade-seating-reusable-templates-v26.sql");
 for(const keyword of ["Thư viện mẫu sơ đồ ghế","Lưu vào thư viện","Tạo sơ đồ mới từ mẫu","action:\"save-template\"","action:\"apply-template\""])
  assert.ok(ui.includes(keyword),keyword);
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON TABLE public\.seating_templates FROM PUBLIC,anon,authenticated/);
 assert.match(sql,/GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public\.seating_templates TO service_role/);
 assert.doesNotMatch(sql,/DELETE FROM public\.seat_assignments|TRUNCATE.*seats|DROP TABLE/i);
});
