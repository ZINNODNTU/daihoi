import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 DELEGATE_ROSTER_HEADERS,DELEGATE_ROSTER_SUBHEADERS,parseDelegateImportSheet
} from "../src/lib/delegate-roster-import.ts";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const data=(id,name,male,female)=>[
 1,name,id,male,female,"Đồng Nai","Không","Kinh",42089,
 "BÍ THƯ","0900000000","23DTH1","Đảng viên"
];

test("two-level official roster headers (even source MSVV typo) work",()=>{
 const headers=[...DELEGATE_ROSTER_HEADERS];
 headers[2]="MSVV";
 headers[3]="NGÀY THÁNG NĂM SINH\n(17/02/2000)";
 headers[9]="CHỨC VỤ – ĐƠN VỊ CÔNG TÁC";
 const rows=parseDelegateImportSheet([
  headers,[...DELEGATE_ROSTER_SUBHEADERS],
  data("TEST0001","Nguyễn Văn A",36824,null),
  data("TEST0002","Trần Thị B",null,38492)
 ]);
 assert.equal(rows.length,2);
 assert.equal(rows[0].gender,"male");
 assert.equal(rows[0].birth_date,"2000-10-25");
 assert.equal(rows[1].gender,"female");
 assert.equal(rows[1].birth_date,"2005-05-20");
 assert.equal(rows[0].student_id,"TEST0001");
 assert.equal(rows[0].phone_number,"0900000000");
 assert.equal(rows[0].hometown,"Đồng Nai");
 assert.equal(rows[0].religion,"Không");
 assert.equal(rows[0].ethnicity,"Kinh");
 assert.equal(rows[0].union_join_date,"2015-03-26");
 assert.equal(rows[0].position,"BÍ THƯ");
 assert.equal(rows[0].class_name,"23DTH1");
 assert.equal(rows[0].unit,"23DTH1");
 assert.equal(rows[0].profile_notes,"Đảng viên");
});
test("real Date cells, dd/mm/yyyy strings, and missing dates work",()=>{
 const base=[[...DELEGATE_ROSTER_HEADERS],[...DELEGATE_ROSTER_SUBHEADERS]];
 const rows=parseDelegateImportSheet([
  ...base,
  data("2200000010","Phạm Văn A",new Date("2000-12-15T00:00:00Z"),null),
  data("2200000011","Đỗ Thị B",null,"20/04/2003"),
  data("2200000012","Lê Văn C",null,null)
 ]);
 assert.deepEqual(rows.map(row=>[row.gender,row.birth_date]),[
  ["male","2000-12-15"],["female","2003-04-20"],["",""]
 ]);
});
test("male and female date on the same row is rejected without creating records",()=>{
 assert.throws(()=>parseDelegateImportSheet([
  [...DELEGATE_ROSTER_HEADERS],[...DELEGATE_ROSTER_SUBHEADERS],
  data("TEST0001","Nguyễn Văn A","25/10/2000","20/04/2003")
 ]),/Dòng 3.*chỉ được điền/);
});
test("invalid dates, duplicate IDs, missing MSSV are row-specific errors",()=>{
 const headers=[[...DELEGATE_ROSTER_HEADERS],[...DELEGATE_ROSTER_SUBHEADERS]];
 assert.throws(()=>parseDelegateImportSheet([
  ...headers,data("TEST0001","Nguyễn Văn A","31/02/2000",null)
 ]),/Dòng 3.*Ngày sinh NAM/);
 assert.throws(()=>parseDelegateImportSheet([
  ...headers,data("TEST0001","Nguyễn Văn A",36824,null),
  data("TEST0001","Nguyễn Văn B",null,38492)
 ]),/Dòng 4.*trùng/);
 assert.throws(()=>parseDelegateImportSheet([
  ...headers,data("","Nguyễn Văn A",36824,null)
 ]),/Dòng 3.*thiếu MSSV/);
});
test("legacy seven-column cross-congress files continue to import",()=>{
 const rows=parseDelegateImportSheet([
  ["MSSV","Họ tên","Đơn vị","Chức vụ","Vai trò","Giới tính","Ngày sinh"],
  ["00123456","Nguyễn Văn A","Lớp 22DTH1","Bí thư","Chính thức","Nam","25/10/2000"],
  ["","Khách mời A","Khác","Đại diện","Khách mời","Nữ","10/04/1988"]
 ]);
 assert.equal(rows[0].student_id,"00123456");
 assert.equal(rows[0].gender,"male");
 assert.equal(rows[1].delegate_type,"guest");
});
test("schema is additive, protected by existing RLS, and UI warns while pending",()=>{
 const sql=read("supabase/upgrade-delegate-roster-v78.sql");
 const page=read("src/app/congresses/[id]/delegates/page.tsx");
 const api=read("src/app/api/delegates/route.ts");
 const ui=read("src/components/delegates-client.tsx");
 for(const field of ["hometown","religion","ethnicity","union_join_date","phone_number","class_name","profile_notes"]){
  assert.match(sql,new RegExp("ADD COLUMN IF NOT EXISTS "+field));
  assert.match(api,new RegExp(field));
 }
 assert.doesNotMatch(sql,/DISABLE ROW LEVEL SECURITY|GRANT.*\b(?:anon|PUBLIC)\b/i);
 assert.match(api,/hasCongressAbility\(supabase,user.id,congressId,"delegates.write"\)/);
 assert.match(page,/missingRoster/);
 assert.match(ui,/parseDelegateImportSheet\(matrix\)/);
 assert.match(ui,/columnSpan:2/);
 assert.match(ui,/rowSpan:2/);
 assert.match(ui,/stickyRowsCount:2/);
 assert.match(ui,/!rosterReady&&importNeedsRoster/);
});
