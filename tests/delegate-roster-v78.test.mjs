import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 DELEGATE_ROSTER_HEADERS,DELEGATE_ROSTER_SUBHEADERS,parseDelegateImportSheet
} from "../src/lib/delegate-roster-import.ts";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const row=(id,name,male,female)=>[
 1,name,id,male,female,"Đồng Nai","Không","Kinh","26/03/2015",
 "Bí thư Chi đoàn","0900000000","23DTH1","Đảng viên"
];

test("Vietnamese roster imports only the seven existing delegate profile fields",()=>{
 const headers=[...DELEGATE_ROSTER_HEADERS];
 headers[2]="MSVV";
 headers[3]="NGÀY THÁNG NĂM SINH\n(17/02/2000)";
 const data=parseDelegateImportSheet([
  headers,[...DELEGATE_ROSTER_SUBHEADERS],
  row("TEST0001","Nguyễn Văn A",36824,null),
  row("TEST0002","Trần Thị B",null,38492)
 ]);
 assert.equal(data.length,2);
 assert.deepEqual(Object.keys(data[0]).sort(),[
  "full_name","student_id","unit","position","delegate_type","gender","birth_date"
 ].sort());
 assert.equal(data[0].gender,"male");
 assert.equal(data[0].birth_date,"2000-10-25");
 assert.equal(data[1].gender,"female");
 assert.equal(data[1].birth_date,"2005-05-20");
 assert.equal(data[0].position,"Bí thư Chi đoàn");
 assert.equal(data[0].unit,"23DTH1");
 assert.equal(data[0].student_id,"TEST0001");
 assert.equal(data[0].hometown,undefined);
 assert.equal(data[0].phone_number,undefined);
});

test("date format variations still work and irrelevant columns are not validated",()=>{
 const headers=[[...DELEGATE_ROSTER_HEADERS],[...DELEGATE_ROSTER_SUBHEADERS]];
 const invalidExtra=row("2200000010","Nguyễn Văn A",new Date("2000-12-15T00:00:00Z"),null);
 invalidExtra[8]="not-a-date"; // ignored: union-join date is not a delegate field
 invalidExtra[10]="anything"; // ignored: phone number is not a delegate field
 const data=parseDelegateImportSheet([
  ...headers,invalidExtra,
  row("2200000011","Đỗ Thị B",null,"20/04/2003"),
  row("2200000012","Lê Văn C",null,null)
 ]);
 assert.deepEqual(data.map(d=>[d.gender,d.birth_date]),[
  ["male","2000-12-15"],["female","2003-04-20"],["",""]
 ]);
});

test("both male and female cells on the same row are rejected",()=>{
 assert.throws(()=>parseDelegateImportSheet([
  [...DELEGATE_ROSTER_HEADERS],[...DELEGATE_ROSTER_SUBHEADERS],
  row("TEST0001","Nguyễn Văn A","25/10/2000","20/04/2003")
 ]),/Dòng 3.*chỉ được điền/);
});

test("bad birthdates, repeated MSSV and missing IDs remain blocked",()=>{
 const headers=[[...DELEGATE_ROSTER_HEADERS],[...DELEGATE_ROSTER_SUBHEADERS]];
 assert.throws(()=>parseDelegateImportSheet([
  ...headers,row("TEST0001","Nguyễn Văn A","31/02/2000",null)
 ]),/Dòng 3.*Ngày sinh NAM/);
 assert.throws(()=>parseDelegateImportSheet([
  ...headers,row("TEST0001","Nguyễn Văn A",36824,null),
  row("TEST0001","Nguyễn Văn B",null,38492)
 ]),/Dòng 4.*trùng/);
 assert.throws(()=>parseDelegateImportSheet([
  ...headers,row("","Nguyễn Văn A",36824,null)
 ]),/Dòng 3.*thiếu MSSV/);
});

test("legacy seven-column cross-congress export can still be imported",()=>{
 const data=parseDelegateImportSheet([
  ["MSSV","Họ tên","Đơn vị","Chức vụ","Vai trò","Giới tính","Ngày sinh"],
  ["00123456","Nguyễn Văn A","22DTH1","Bí thư","Chính thức","Nam","25/10/2000"],
  ["","Khách mời A","Khoa CNTT","Đại diện","Khách mời","Nữ","10/04/1988"]
 ]);
 assert.equal(data[0].student_id,"00123456");
 assert.equal(data[0].gender,"male");
 assert.equal(data[1].delegate_type,"guest");
});

test("delegate management retains screenshot columns and no extra profile fields",()=>{
 const page=read("src/app/congresses/[id]/delegates/page.tsx");
 const ui=read("src/components/delegates-client.tsx");
 const api=read("src/app/api/delegates/route.ts");
 assert.match(page,/id,congress_id,code,full_name,unit,student_id,position/);
 assert.match(ui,/<th>Ảnh<\/th><th>Mã đại biểu<\/th><th>Họ tên<\/th><th>MSSV \/ Email<\/th>/);
 assert.match(ui,/<th>Vai trò<\/th><th>Giới tính \/ Ngày sinh<\/th><th>Tài khoản<\/th><th>Ảnh \/ Thẻ<\/th>/);
 assert.match(ui,/parseDelegateImportSheet\(matrix\)/);
 assert.match(ui,/columnSpan:2/);
 assert.match(ui,/rowSpan:2/);
 assert.match(ui,/stickyRowsCount:2/);
 assert.doesNotMatch(ui,/rosterReady|ROSTER_EDIT_FIELDS|editExtra|importNeedsRoster/);
 for(const field of ["hometown","religion","ethnicity","union_join_date","phone_number","class_name","profile_notes"]){
  assert.doesNotMatch(page,new RegExp(field));
  assert.doesNotMatch(api,new RegExp(field));
 }
 assert.match(api,/hasCongressAbility\(supabase,user.id,congressId,"delegates.write"\)/);
});
