import {test} from "node:test";
import assert from "node:assert/strict";
import {
  generateSection,rowLabelAt,validateSeatDrafts,validateImport,parseSeatImport
} from "../src/lib/seating.ts";
const id=()=>crypto.randomUUID();
const base={zone:"A",startRow:"A",rowCount:4,seatsPerRow:6,startX:100,startY:170,aisleAfter:3};
test("Tạo 24 ghế có mã duy nhất và dành lối đi",()=>{
  const seats=generateSection(base,[],id);
  assert.equal(seats.length,24);
  assert.equal(seats[0].code,"A-A-01");
  assert.equal(seats[5].code,"A-A-06");
  assert.equal(seats[6].code,"A-B-01");
  assert.equal(seats[3].x-seats[2].x,106);
  assert.equal(validateSeatDrafts(seats),null);
});
test("Bước hàng từ Z sang AA, AZ sang BA",()=>{
  assert.equal(rowLabelAt("Z",1),"AA");
  assert.equal(rowLabelAt("AZ",1),"BA");
  assert.throws(()=>rowLabelAt("A-2",1));
});
test("Không tạo ghế trùng mã/vị trí hoặc quá hạn mức",()=>{
  const current=generateSection(base,[],id);
  assert.throws(()=>generateSection(base,current,id),/trùng/);
  assert.throws(()=>generateSection({...base,rowCount:25,seatsPerRow:30},[],id),/500 ghế/);
  assert.match(validateSeatDrafts([...current,{...current[0],id:id()}])||"",/trùng/);
});
test("Đọc cột tiêu đề Excel tiếng Việt có dấu và giữ nguyên mã",()=>{
  const rows=parseSeatImport([
    ["Mã ghế","Họ tên","Mã đại biểu","ID sơ đồ","Phiên bản"],
    ["A-A-01","Nguyễn A","DB001","layout",5],
    ["A-A-02","","","",""],
  ]);
  assert.deepEqual(rows,[{seatCode:"A-A-01",delegateCode:"DB001"},{seatCode:"A-A-02",delegateCode:""}]);
  assert.throws(()=>parseSeatImport([["Tên ghế","Mã đại biểu"],["A1","DB01"]]),/Mã ghế/);
});
test("Phát hiện mã đại biểu sai, trùng đại biểu và ghế khóa",()=>{
  const seats=generateSection(base,[],id);
  seats[1].blocked=true;
  const delegates=[
    {id:id(),code:"DB001",full_name:"Đại biểu A",unit:"Khoa A",is_active:true},
    {id:id(),code:"DB002",full_name:"Đại biểu B",unit:"Khoa B",is_active:false}
  ];
  const problems=validateImport([
    {seatCode:"A-A-01",delegateCode:"DB001"},
    {seatCode:"A-A-02",delegateCode:"DB001"},
    {seatCode:"A-A-09",delegateCode:"DB002"},
    {seatCode:"A-A-01",delegateCode:"DB404"}
  ],seats,delegates);
  assert.ok(problems.some(p=>p.message.includes("khóa")));
  assert.ok(problems.some(p=>p.message.includes("nhiều ghế")));
  assert.ok(problems.some(p=>p.message.includes("không tồn tại")));
  assert.ok(problems.some(p=>p.message.includes("không còn hoạt động")));
  assert.ok(problems.some(p=>p.message.includes("xuất hiện nhiều lần")));
});
