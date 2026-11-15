import test from "node:test";
import assert from "node:assert/strict";
import writeExcelFile from "write-excel-file/node";
import {readSheet} from "read-excel-file/node";
import {
 DELEGATE_ROSTER_HEADERS,DELEGATE_ROSTER_SUBHEADERS,parseDelegateImportSheet
} from "../src/lib/delegate-roster-import.ts";

test("downloadable merged 8-column Excel preserves delegate type and can be imported",async()=>{
 const style={fontFamily:"Times New Roman",fontSize:11,fontWeight:"bold",align:"center",
  backgroundColor:"#E7F0F7",borderStyle:"thin"};
 const first=DELEGATE_ROSTER_HEADERS.map((label,index)=>{
  if(index===4)return null;
  return {value:label||"",type:String,...style,...(index===3?{columnSpan:2}:{rowSpan:2})};
 });
 const second=DELEGATE_ROSTER_SUBHEADERS.map((label,index)=>
  index===3||index===4?{value:label,type:String,...style}:null);
 const example=[1,"Nguyễn Văn A","00123456","25/10/2000","","Bí thư","Đoàn Khoa CNTT","Dự khuyết"];
 const buffer=await writeExcelFile([{
  sheet:"Danh sach dai bieu",stickyRowsCount:2,
  columns:Array.from({length:DELEGATE_ROSTER_HEADERS.length},()=>({width:20})),
  data:[first,second,example]
 }]).toBuffer();
 assert.ok(buffer.length>1500);
 const rows=await readSheet(buffer);
 assert.equal(rows[0].length,8);
 assert.deepEqual(rows[0].slice(5),["CHỨC VỤ","ĐƠN VỊ","LOẠI ĐẠI BIỂU"]);
 assert.equal(rows[1][3],"NAM");
 assert.equal(rows[1][4],"NỮ");
 const parsed=parseDelegateImportSheet(rows);
 assert.equal(parsed.length,1);
 assert.equal(parsed[0].student_id,"00123456");
 assert.equal(parsed[0].gender,"male");
 assert.equal(parsed[0].birth_date,"2000-10-25");
 assert.equal(parsed[0].position,"Bí thư");
 assert.equal(parsed[0].unit,"Đoàn Khoa CNTT");
 assert.equal(parsed[0].delegate_type,"alternate");
});
