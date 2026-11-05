import {test} from "node:test";
import assert from "node:assert/strict";
import {calculateAttendance,csvCell,displayTime,makeAttendanceCsv,percentage} from "../src/lib/attendance-report.ts";
const people=[
 {id:"a",code:"DB001",full_name:"Nguyễn Văn A",unit:"Khoa CNTT",delegate_type:"official",is_active:true},
 {id:"b",code:"DB002",full_name:"Trần Thị B",unit:"Khoa CNTT",delegate_type:"official",is_active:true},
 {id:"c",code:"DB003",full_name:"Lê Văn C",unit:"Khoa Luật",delegate_type:"alternate",is_active:true},
 {id:"d",code:"KM004",full_name:"Khách mời",unit:"Khoa Luật",delegate_type:"guest",is_active:true},
 {id:"e",code:"DB005",full_name:"Đã hủy",unit:"Khoa CNTT",delegate_type:"official",is_active:false},
];
const checks=[
 {id:"1",delegate_id:"a",method:"qr",checked_in_at:"2026-11-05T01:30:00.000Z",checked_in_by:"admin1",note:null},
 {id:"2",delegate_id:"c",method:"manual",checked_in_at:"2026-11-05T01:40:00.000Z",checked_in_by:"admin2",note:"Không có điện thoại"},
 {id:"3",delegate_id:"d",method:"qr",checked_in_at:"2026-11-05T01:50:00.000Z",checked_in_by:"admin1",note:null},
];
test("Không gộp khách mời vào số đại biểu chính thức",()=>{
 const r=calculateAttendance(people,checks);
 assert.equal(r.total,4);
 assert.equal(r.present,3);
 assert.deepEqual(r.byType.official,{total:2,present:1});
 assert.deepEqual(r.byType.alternate,{total:1,present:1});
 assert.deepEqual(r.byType.guest,{total:1,present:1});
 assert.equal(r.byMethod.manual,1);
 assert.equal(r.byMethod.qr,2);
 assert.equal(r.absent,1);
 assert.equal(r.rows.find(x=>x.id==="b")?.present,false);
 assert.deepEqual(r.units.find(x=>x.unit==="Khoa CNTT"),{unit:"Khoa CNTT",total:2,present:1,officialTotal:2,officialPresent:1});
});
test("Không tính hồ sơ vô hiệu hoặc check-in không khớp",()=>{
 const r=calculateAttendance(people,[...checks,{...checks[0],id:"4",delegate_id:"e"}]);
 assert.equal(r.unmatchedCheckins,1);
 assert.equal(r.total,4);
});
test("CSV bảo vệ công thức và ký tự đặc biệt",()=>{
 assert.equal(csvCell("=1+1"),"\"'=1+1\"");
 assert.equal(csvCell(" \t@SUM(1)"),"\"' \t@SUM(1)\"");
 assert.equal(csvCell('Nguyễn "Văn" A'),'"Nguyễn ""Văn"" A"');
 const rows=calculateAttendance(people,checks).rows;
 const csv=makeAttendanceCsv("Đại hội", "Phiên trù bị",rows);
 assert.ok(csv.startsWith("\ufeff"));
 assert.ok(csv.includes("Thủ công"));
 assert.ok(csv.includes("Chưa điểm danh"));
});
test("Hiển thị múi giờ Việt Nam và tỷ lệ không chia cho 0",()=>{
 assert.match(displayTime("2026-11-05T01:30:00.000Z"),/08:30/);
 assert.equal(percentage(0,0),"—");
 assert.ok(percentage(1,2).includes("50"));
});
