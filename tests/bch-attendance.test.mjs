import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateBchInput,sortBchCandidates} from "../src/lib/bch-candidates.ts";
import {buildDelegateSeatMap,currentSessionCheckins} from "../src/lib/attendance-seating.ts";

const valid={
 full_name:"  Trần Thị   Mai  ",birth_year:2001,hometown:"Biên Hòa, Đồng Nai",
 ethnicity:"Kinh",education_level:"Đại học",union_join_year:2016,
 current_position:"Ủy viên BCH đương nhiệm",display_order:3
};
const file=(path)=>readFileSync(new URL(path,import.meta.url),"utf8");

test("BCH requires all seven personnel fields and strips excess spaces",()=>{
 const result=validateBchInput(valid,2026);
 assert.equal(result.error,null);
 assert.equal(result.data?.full_name,"Trần Thị Mai");
 assert.equal(result.data?.birth_year,2001);
 assert.equal(result.data?.union_join_year,2016);
 for(const key of ["full_name","birth_year","hometown","ethnicity","education_level","union_join_year","current_position"]){
  const changed={...valid,[key]:key.includes("year")?0:""};
  const testResult=validateBchInput(changed,2026);
  assert.notEqual(testResult.error,null,key);
 }
});
test("BCH rejects impossible years and unsafe sorts",()=>{
 assert.match(validateBchInput({...valid,birth_year:2030},2026).error||"",/Năm sinh/);
 assert.match(validateBchInput({...valid,union_join_year:1990},2026).error||"",/Năm vào Đoàn/);
 assert.match(validateBchInput({...valid,display_order:-2},2026).error||"",/Thứ tự/);
 assert.equal(validateBchInput({...valid,union_join_year:2019,display_order:0},2026).error,null);
 assert.equal(validateBchInput({...valid,ethnicity:"  Kinh  "},2026).data?.ethnicity,"Kinh");
});
test("BCH sorting is stable and leaves input immutable",()=>{
 const people=[
  {...valid,id:"z",display_order:2,full_name:"B"},
  {...valid,id:"a",display_order:1,full_name:"A"}
 ];
 const result=sortBchCandidates(people);
 assert.equal(result[0].id,"a");
 assert.equal(people[0].id,"z");
});
test("Most recent check-in comes first, scoped to the chosen session",()=>{
 const base={congress_id:"C",delegate_id:"D",checked_in_by:"U",
  qr_scope:"fixed",method:"qr",note:null};
 const input=[
  {...base,id:"1",session_id:"one",checked_in_at:"2026-11-08T05:00:00Z"},
  {...base,id:"2",session_id:"two",checked_in_at:"2026-11-08T10:00:00Z"},
  {...base,id:"3",session_id:"one",checked_in_at:"2026-11-08T07:00:00Z"}
 ];
 const recent=currentSessionCheckins(input,"one");
 assert.deepEqual(recent.map(c=>c.id),["3","1"]);
 assert.equal(input[0].id,"1");
});
test("Latest auditorium assignment is preferred without faking an unassigned seat",()=>{
 const layouts=[
  {id:"L2",title:"Hội trường B",updated_at:"2026-11-08T12:00:00Z"},
  {id:"L1",title:"Hội trường A",updated_at:"2026-11-07T12:00:00Z"}
 ];
 const seats=[
  {id:"S1",code:"A-01",zone:"A",row_label:"A",seat_number:1},
  {id:"S2",code:"B-08",zone:"B",row_label:"B",seat_number:8}
 ];
 const assignments=[
  {layout_id:"L1",seat_id:"S1",delegate_id:"D1"},
  {layout_id:"L2",seat_id:"S2",delegate_id:"D1"},
  {layout_id:"L1",seat_id:"NOT_FOUND",delegate_id:"D2"}
 ];
 const mapped=buildDelegateSeatMap(layouts,seats,assignments);
 assert.equal(mapped.D1.code,"B-08");
 assert.equal(mapped.D1.layoutTitle,"Hội trường B");
 assert.equal(mapped.D2,undefined);
});
test("BCH RLS limits reading to admin and secretary; write endpoints require admin",()=>{
 const sql=file("../supabase/upgrade-bch-candidates-v8.sql");
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
 assert.match(sql,/REVOKE ALL ON TABLE public\.bch_candidates FROM PUBLIC,anon/);
 assert.match(sql,/member\.role='secretary'/);
 assert.match(sql,/private\.has_congress_role\(congress_id,'admin'\)/);
 assert.match(sql,/bch_candidates_admin_insert/);
 assert.match(sql,/bch_candidates_admin_update/);
 assert.match(sql,/bch_candidates_admin_delete/);
 const api=file("../src/app/api/bch-candidates/route.ts");
 assert.match(api,/authorize\(congressId,true\)/);
 assert.match(api,/\.eq\("id",id\)\.eq\("congress_id",congressId\)/);
 assert.doesNotMatch(api,/createAdminClient/);
});
test("BCH UI includes all seven fields and export columns; attendance shows photo and seat",()=>{
 const ui=file("../src/components/bch-candidates-client.tsx");
 for(const label of ["Họ tên","Năm sinh","Quê quán","Dân tộc","Trình độ","Năm vào Đoàn","Chức vụ hiện tại"]){
  assert.ok(ui.includes(label),label);
 }
 assert.match(ui,/write-excel-file\/browser/);
 const flash=file("../src/components/recent-checkin-card.tsx");
 for(const detail of ["photo_path","full_name","unit","seat?.code","seat.layoutTitle"]){
  assert.ok(flash.includes(detail),detail);
 }
 const page=file("../src/app/congresses/[id]/attendance/page.tsx");
 assert.match(page,/createAdminClient/);
 assert.match(page,/canReadSeating/);
});
