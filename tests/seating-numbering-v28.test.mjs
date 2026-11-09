import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 setSeatGridCells,seatGridCellIndex,
 renumberGridSeats,validateSeatDrafts
} from "../src/lib/seating.ts";

const id=()=>crypto.randomUUID();
const size={rows:3,columns:8};
const cell=seat=>seatGridCellIndex(seat,size);

test("Đánh số ghế liên tục hàng ngang, bỏ qua lối đi và ô trống",()=>{
 const chosen=new Set([0,1,4,7,9,15,16,23]);
 const result=setSeatGridCells([],chosen,new Set(),id,size);
 assert.equal(result.error,null);
 assert.deepEqual(result.seats.filter(s=>s.rowLabel==="A").map(s=>[cell(s),s.code,s.seatNumber]),[
  [0,"G-A-01",1],[1,"G-A-02",2],[4,"G-A-03",3],[7,"G-A-04",4]
 ]);
 assert.deepEqual(result.seats.filter(s=>s.rowLabel==="B").map(s=>s.seatNumber),[1,2]);
 assert.deepEqual(result.seats.filter(s=>s.rowLabel==="C").map(s=>s.seatNumber),[1,2]);
 assert.equal(validateSeatDrafts(result.seats),null);
});

test("Ghế đại biểu và khách mời chung một chuỗi số ghế, ô trống không chiếm số",()=>{
 const guests=setSeatGridCells([],new Set([0,4,15]),new Set(),id,size,"guest");
 assert.equal(guests.error,null);
 const both=setSeatGridCells(guests.seats,new Set([0,1,4,6,15]),new Set(),id,size,"delegate");
 assert.equal(both.error,null);
 assert.deepEqual(both.seats.filter(s=>s.rowLabel==="A").map(s=>[
  s.seatType,s.seatNumber,s.code]),[
  ["guest",1,"G-A-01"],["delegate",2,"G-A-02"],
  ["guest",3,"G-A-03"],["delegate",4,"G-A-04"]
 ]);
 assert.equal(both.seats.find(s=>cell(s)===15)?.code,"G-B-01");
});

test("Xóa/thêm ghế không đổi ID các ghế còn lại, giữ phân công và loại ghế",()=>{
 const before=setSeatGridCells([],new Set([0,1,3,5]),new Set(),id,size,"delegate").seats;
 const assigned=before.find(s=>cell(s)===5);
 const keep=before.find(s=>cell(s)===3);
 assert.ok(assigned&&keep);
 const removed=setSeatGridCells(before,new Set([0,3,5]),new Set([assigned.id]),id,size,"guest");
 assert.equal(removed.error,null);
 assert.deepEqual(removed.seats.map(s=>s.code),["G-A-01","G-A-02","G-A-03"]);
 assert.equal(removed.seats.find(s=>cell(s)===5)?.id,assigned.id);
 assert.equal(removed.seats.find(s=>cell(s)===3)?.id,keep.id);
 assert.equal(removed.seats.find(s=>cell(s)===5)?.seatType,"delegate");
});

test("Ghế khóa là ghế thực và vẫn có số; ô trống và lối đi không có số",()=>{
 const seats=setSeatGridCells([],new Set([0,3,5]),new Set(),id,size,"delegate").seats;
 const locked=seats.map(s=>({...s,blocked:cell(s)===3}));
 const result=renumberGridSeats(locked,size);
 assert.deepEqual(result.map(s=>s.seatNumber),[1,2,3]);
 assert.equal(result[1].blocked,true);
});

test("Chuẩn hóa sơ đồ cũ bị nhảy số giữ ID, không sửa ghế tự do ngoài lưới và không trùng mã",()=>{
 const existing=setSeatGridCells([],new Set([0,3,6,8]),new Set(),id,size).seats;
 const legacy=existing.map(s=>({
  ...s,seatNumber:(cell(s)%8)+1,
  code:"G-"+s.rowLabel+"-"+String((cell(s)%8)+1).padStart(2,"0")
 }));
 const free={id:id(),code:"VIP-A-01",zone:"VIP",rowLabel:"A",seatNumber:1,x:1800,y:1020,blocked:false,seatType:"guest"};
 const fixed=renumberGridSeats([...legacy,free],size);
 assert.deepEqual(fixed.filter(s=>s.zone==="G").map(s=>s.code),["G-A-01","G-A-02","G-A-03","G-B-01"]);
 assert.equal(fixed.at(-1),free);
 for(let i=0;i<legacy.length;i++)assert.equal(fixed[i].id,legacy[i].id);
 assert.deepEqual(renumberGridSeats(fixed,size),fixed);
});

test("Không tạo mã trùng nếu ghế thủ công dùng mã trùng với số mới",()=>{
 const manual={id:id(),code:"G-A-02",zone:"VIP",rowLabel:"A",seatNumber:2,x:1700,y:1040,blocked:false,seatType:"guest"};
 const made=setSeatGridCells([manual],new Set([0,4]),new Set(),id,size);
 assert.equal(made.error,null);
 assert.equal(validateSeatDrafts(made.seats),null);
 assert.ok(made.seats.some(s=>s.code==="G-A-02-2"));
 assert.equal(made.seats[0],manual);
});

test("Giao diện canvas hiển thị SỐ GHẾ thay vì số cột và đồng bộ Excel theo mã mới",()=>{
 const ui=readFileSync(new URL("../src/components/seat-grid-canvas.tsx",import.meta.url),"utf8");
 const admin=readFileSync(new URL("../src/components/seating-client.tsx",import.meta.url),"utf8");
 assert.match(ui,/String\(seat\.seatNumber\)\.padStart\(2,"0"\)/);
 assert.match(ui,/ghế số "\+seat\.seatNumber/);
 assert.match(ui,/ký hiệu C1|Ký hiệu C1/);
 assert.match(ui,/"C"\+\(column\+1\)/);
 assert.match(admin,/renumberGridSeats\(next\.seats,nextSize\)/);
 assert.match(admin,/setDirty\(needsSave\)/);
 assert.match(admin,/seatsToSave\.map/);
 assert.match(admin,/s\.seatNumber,d\?\.code/);
});
