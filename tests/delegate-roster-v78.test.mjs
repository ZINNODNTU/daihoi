import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 DELEGATE_ROSTER_HEADERS,DELEGATE_ROSTER_SUBHEADERS,parseDelegateImportSheet
} from "../src/lib/delegate-roster-import.ts";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const row=(id,name,male,female,position="Bí thư Chi đoàn",unit="23DTH1")=>[
 1,name,id,male,female,position,unit
];
const header=()=>[[...DELEGATE_ROSTER_HEADERS],[...DELEGATE_ROSTER_SUBHEADERS]];

test("official 7-column template has separate Chức vụ and Đơn vị, no unnecessary columns",()=>{
 assert.deepEqual([...DELEGATE_ROSTER_HEADERS],[
  "STT","HỌ VÀ TÊN","MSSV","NGÀY THÁNG NĂM SINH (dd/mm/yyyy)",
  "","CHỨC VỤ","ĐƠN VỊ"
 ]);
 assert.deepEqual([...DELEGATE_ROSTER_SUBHEADERS],["","","","NAM","NỮ","",""]);
 const data=parseDelegateImportSheet([...header(),
  row("TEST0001","Nguyễn Văn A",36824,null),
  row("TEST0002","Trần Thị B",null,38492,"Ủy viên BCH","Khoa CNTT")
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
 assert.equal(data[1].position,"Ủy viên BCH");
 assert.equal(data[1].unit,"Khoa CNTT");
});
test("accept MSVV typo, Date objects, text birth dates and missing dates",()=>{
 const headers=header();
 headers[0][2]="MSVV";
 headers[0][3]="NGÀY THÁNG NĂM SINH\n(17/02/2000)";
 const data=parseDelegateImportSheet([
  ...headers,
  row("2200000010","Nguyễn Văn A",new Date("2000-12-15T00:00:00Z"),null),
  row("2200000011","Đỗ Thị B",null,"20/04/2003"),
  row("2200000012","Lê Văn C",null,null)
 ]);
 assert.deepEqual(data.map(d=>[d.gender,d.birth_date]),[
  ["male","2000-12-15"],["female","2003-04-20"],["",""]
 ]);
});
test("reject simultaneous NAM/NỮ birthdates, invalid date, missing/duplicate student IDs",()=>{
 assert.throws(()=>parseDelegateImportSheet([...header(),
  row("TEST0001","Nguyễn Văn A","25/10/2000","20/04/2003")]),/Dòng 3.*chỉ được điền/);
 assert.throws(()=>parseDelegateImportSheet([...header(),
  row("TEST0001","Nguyễn Văn A","31/02/2000",null)]),/Dòng 3.*Ngày sinh NAM/);
 assert.throws(()=>parseDelegateImportSheet([...header(),
  row("TEST0001","Nguyễn Văn A",36824,null),
  row("TEST0001","Nguyễn Văn B",null,38492)]),/Dòng 4.*trùng/);
 assert.throws(()=>parseDelegateImportSheet([...header(),
  row("","Nguyễn Văn A",36824,null)]),/Dòng 3.*thiếu MSSV/);
});
test("older 13-column roster remains readable, irrelevant source columns discarded",()=>{
 const oldHeaders=["STT","HỌ VÀ TÊN","MSSV","NGÀY THÁNG NĂM SINH","","QUÊ QUÁN",
  "TÔN GIÁO","DÂN TỘC","NGÀY VÀO ĐOÀN","CHỨC VỤ – ĐƠN VỊ CÔNG TÁC",
  "SỐ ĐIỆN THOẠI","LỚP","GHI CHÚ (ĐẢNG VIÊN)"];
 const data=parseDelegateImportSheet([
  oldHeaders,["","","","NAM","NỮ","","","","","","","",""],
  [1,"Lê Văn D","TEST0009","25/10/2000",null,"Đồng Nai","Không","Kinh",
   "invalid ignored","Phó Bí thư","invalid ignored","22DTH1","Đảng viên"]
 ]);
 assert.equal(data[0].unit,"22DTH1");
 assert.equal(data[0].position,"Phó Bí thư");
 assert.equal(data[0].gender,"male");
 assert.equal("hometown" in data[0],false);
});
test("older flat cross-congress Excel still accepted",()=>{
 const data=parseDelegateImportSheet([
  ["MSSV","Họ tên","Đơn vị","Chức vụ","Vai trò","Giới tính","Ngày sinh"],
  ["00123456","Nguyễn Văn A","22DTH1","Bí thư","Chính thức","Nam","25/10/2000"],
  ["","Khách mời A","Khoa CNTT","Đại diện","Khách mời","Nữ","10/04/1988"]
 ]);
 assert.equal(data[0].student_id,"00123456");
 assert.equal(data[0].gender,"male");
 assert.equal(data[1].delegate_type,"guest");
});
test("UI remains compact with unchanged delegate columns",()=>{
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
 assert.match(ui,/DELEGATE_ROSTER_HEADERS.length/);
 assert.doesNotMatch(ui,/rosterReady|ROSTER_EDIT_FIELDS|editExtra|importNeedsRoster/);
 for(const field of ["hometown","religion","ethnicity","union_join_date","phone_number","class_name","profile_notes"]){
  assert.doesNotMatch(page,new RegExp(field));
  assert.doesNotMatch(api,new RegExp(field));
 }
 assert.match(api,/hasCongressAbility\(supabase,user.id,congressId,"delegates.write"\)/);
});
