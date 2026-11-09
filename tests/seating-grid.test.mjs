import {test} from "node:test";
import assert from "node:assert/strict";
import {
  SEAT_GRID_CAPACITY,SEAT_GRID_COLUMNS,SEAT_GRID_ROWS,
  seatGridPosition,seatGridCellIndex,seatGridPattern,
  setSeatGridCells,validateSeatDrafts
} from "../src/lib/seating.ts";

const id=()=>crypto.randomUUID();
test("Canvas mặc định có 200 ô: 10 hàng x 20 cột, vị trí/mã độc lập",()=>{
  assert.equal(SEAT_GRID_CAPACITY,200);
  assert.equal(SEAT_GRID_ROWS,10);
  assert.equal(SEAT_GRID_COLUMNS,20);
  assert.deepEqual(seatGridPosition(0,0),{x:95,y:190});
  assert.deepEqual(seatGridPosition(9,19),{x:1197,y:730});
  assert.throws(()=>seatGridPosition(10,0),/không hợp lệ/);
  assert.throws(()=>seatGridPosition(0,20),/không hợp lệ/);
});
test("Chọn ô -> tạo ghế có mã, bỏ ô -> xóa ghế và giữ ô lối đi",()=>{
  let state=setSeatGridCells([],new Set([0,19,199]),new Set(),id);
  assert.equal(state.error,null);
  assert.equal(state.seats.length,3);
  assert.equal(state.seats[0].code,"G-A-01");
  assert.equal(state.seats[1].code,"G-A-02");
  assert.equal(state.seats[2].code,"G-J-01");
  assert.equal(seatGridCellIndex(state.seats[2]),199);
  assert.equal(validateSeatDrafts(state.seats),null);
  state=setSeatGridCells(state.seats,new Set([0,199]),new Set(),id);
  assert.equal(state.error,null);
  assert.deepEqual(state.seats.map(s=>s.code),["G-A-01","G-J-01"]);
});
test("Mẫu 200 ghế, lối đi giữa 180 ghế, lưới trắng 0 ghế",()=>{
  assert.equal(seatGridPattern("full").size,200);
  assert.equal(seatGridPattern("center-aisle").size,180);
  assert.equal(seatGridPattern("empty").size,0);
  const full=setSeatGridCells([],seatGridPattern("full"),new Set(),id);
  assert.equal(full.error,null);
  assert.equal(full.seats.length,200);
  assert.equal(validateSeatDrafts(full.seats),null);
  const aisle=setSeatGridCells(full.seats,seatGridPattern("center-aisle"),new Set(),id);
  assert.equal(aisle.error,null);
  assert.equal(aisle.seats.length,180);
  for(let row=0;row<10;row++){
    const seats=aisle.seats.filter(s=>s.rowLabel===String.fromCharCode(65+row));
    assert.deepEqual(seats.map(s=>s.seatNumber),Array.from({length:18},(_,i)=>i+1));
  }
});
test("Cập nhật canvas giữ nguyên ID ghế để bảo toàn phân công",()=>{
  const current=setSeatGridCells([],new Set([0,1,2]),new Set(),id).seats;
  const keep=current.find(s=>seatGridCellIndex(s)===0);
  assert.ok(keep);
  const updated=setSeatGridCells(current,new Set([0,2,3]),new Set(),id);
  assert.equal(updated.error,null);
  assert.equal(updated.seats.find(s=>seatGridCellIndex(s)===0)?.id,keep.id);
  assert.equal(updated.seats.find(s=>seatGridCellIndex(s)===3)?.code,"G-A-03");
});
test("Không xóa ghế đã gán đại biểu - cập nhật hàng loạt là nguyên tử",()=>{
  const current=setSeatGridCells([],new Set([0,1,2]),new Set(),id).seats;
  const occupiedId=current[1].id;
  const attempt=setSeatGridCells(current,new Set([0,2]),new Set([occupiedId]),id);
  assert.match(attempt.error||"",/đã phân công/);
  assert.equal(attempt.seats,current);
  const emptied=setSeatGridCells(current,seatGridPattern("empty"),new Set([occupiedId]),id);
  assert.match(emptied.error||"",/đã phân công/);
  assert.equal(emptied.seats,current);
});
test("Ghế tọa độ tự do giữ nguyên khi tô hoặc xóa lưới",()=>{
  const manual={id:id(),code:"VIP-A-01",zone:"VIP",rowLabel:"A",seatNumber:1,x:1600,y:1100,blocked:false};
  assert.equal(seatGridCellIndex(manual),null);
  const full=setSeatGridCells([manual],seatGridPattern("full"),new Set(),id);
  assert.equal(full.error,null);
  assert.equal(full.seats.length,201);
  const empty=setSeatGridCells(full.seats,seatGridPattern("empty"),new Set(),id);
  assert.equal(empty.error,null);
  assert.deepEqual(empty.seats,[manual]);
});
test("Không tạo mã trùng nếu sơ đồ tự do đã có mã G-A-01",()=>{
  const existing={id:id(),code:"G-A-01",zone:"VIP",rowLabel:"A",seatNumber:1,x:1700,y:1200,blocked:false};
  const result=setSeatGridCells([existing],new Set([0]),new Set(),id);
  assert.equal(result.error,null);
  assert.equal(result.seats.length,2);
  assert.ok(result.seats.some(s=>s.code==="G-A-01-2"));
  assert.equal(validateSeatDrafts(result.seats),null);
});
test("Lưới có giới hạn và từ chối tọa độ/mã không hợp lệ",()=>{
  const bad=setSeatGridCells([],new Set([-1,200]),new Set(),id);
  assert.match(bad.error||"",/không hợp lệ/);
  assert.deepEqual(bad.seats,[]);
});
