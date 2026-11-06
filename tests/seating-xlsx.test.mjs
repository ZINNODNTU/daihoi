import {test} from "node:test";
import assert from "node:assert/strict";
import writeExcelFile from "write-excel-file/node";
import {readSheet} from "read-excel-file/node";
import {parseSeatImport} from "../src/lib/seating.ts";

test("Xuất rồi đọc lại Excel 2 sheet mà không làm hỏng mã đại biểu",async()=>{
 const version=4,layoutId="b8be99a5-f9d2-43b4-97b7-398e7d05c790";
 const workbook=await writeExcelFile([
  {sheet:"Phan ghe",data:[
   ["Mã ghế","Khu vực","Hàng","Số ghế","Mã đại biểu","Họ tên (tham khảo)","Đơn vị (tham khảo)","ID sơ đồ","Phiên bản"],
   ["A-A-01","A","A",1,"00071","Nguyễn Văn A","Đơn vị A",layoutId,version],
   ["A-A-02","A","A",2,"","","",layoutId,version]
  ]},
  {sheet:"Danh sach dai bieu",data:[["Mã đại biểu","Họ và tên"],["00071","Nguyễn Văn A"]]}
 ]).toBuffer();
 const rows=await readSheet(workbook,"Phan ghe");
 assert.equal(rows[1][4],"00071");
 assert.equal(rows[1][7],layoutId);
 assert.equal(rows[1][8],version);
 assert.deepEqual(parseSeatImport(rows.map(row=>row.map(cell=>cell===null?null:String(cell)))),
  [{seatCode:"A-A-01",delegateCode:"00071"},{seatCode:"A-A-02",delegateCode:""}]);
 const delegates=await readSheet(workbook,"Danh sach dai bieu");
 assert.equal(delegates[1][0],"00071");
});
