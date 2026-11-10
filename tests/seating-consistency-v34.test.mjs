import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {projectSeatGrid,seatGridCellIndex,seatGridPosition,setSeatGridCells} from "../src/lib/seating.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const size={rows:6,columns:28};
const indices=new Set(Array.from({length:6},(_,r)=>[
 ...Array.from({length:12},(_,c)=>r*28+c+1),
 ...Array.from({length:12},(_,c)=>r*28+c+15)
]).flat());
const makeSeats=()=>setSeatGridCells([],indices,new Set(),()=>crypto.randomUUID(),size).seats;

test("Sơ đồ 6 hàng × 28 ô có 144 ghế; 2 ô giữa và 2 mép là lối đi, số ghế 1–24",()=>{
 const seats=makeSeats();
 assert.equal(seats.length,144);
 const view=projectSeatGrid(size,seats);
 assert.deepEqual(view.size,size);
 assert.equal(view.cells.size,144);
 assert.equal(view.outside.length,0);
 for(let row=0;row<6;row++){
  const sequence=[];
  for(let col=0;col<28;col++){
   const seat=view.cells.get(row*28+col);
   if(seat)sequence.push(view.seatNumbers.get(seat.id));
   else assert.ok([0,13,14,27].includes(col),"Không được mất vị trí lối đi");
  }
  assert.deepEqual(sequence,Array.from({length:24},(_,i)=>i+1));
 }
 assert.equal(view.cells.get(5*28+26)?.rowLabel,"F");
 assert.equal(view.seatNumbers.get(view.cells.get(5*28+26).id),24);
});

test("Kích thước lưu cũ 5×28 tự nhận diện hàng F; ghế cũ không bị tạo lại hoặc đổi người ngồi",()=>{
 const seats=makeSeats();
 const ids=seats.map(s=>s.id);
 const legacy=seats.map(s=>({...s,seatNumber:seatGridCellIndex(s,size)%28+1}));
 const view=projectSeatGrid({rows:5,columns:28},legacy);
 assert.deepEqual(view.size,{rows:6,columns:28});
 assert.equal(view.cells.size,144);
 assert.deepEqual(legacy.map(s=>s.id),ids);
 assert.equal(view.seatNumbers.get(legacy.find(s=>seatGridCellIndex(s,size)===5*28+26).id),24);
 assert.notEqual(view.seatNumbers.get(legacy[0].id),legacy[0].seatNumber,
  "View must use normalized seat numbers, not obsolete persisted columns");
});

test("Ghế khách mời và ghế bị khóa vẫn là ghế thực; ghế tự do được bảo toàn đúng vị trí",()=>{
 const seats=makeSeats();
 const guest={...seats[0],seatType:"guest"};
 const locked={...seats[1],blocked:true};
 const free={id:crypto.randomUUID(),zone:"VIP",code:"VIP-A-01",seatNumber:1,x:1800,y:1000,rowLabel:"A",blocked:false,seatType:"guest"};
 const view=projectSeatGrid(size,[guest,locked,...seats.slice(2),free]);
 assert.equal(view.cells.size,144);
 assert.equal(view.outside.length,1);
 assert.equal(view.outside[0],free);
 assert.equal(view.seatNumbers.get(guest.id),1);
 assert.equal(view.seatNumbers.get(locked.id),2);
 assert.deepEqual(seatGridPosition(5,26,size),{x:1603,y:490});
});

test("Quản trị và cổng đại biểu dùng chung lưới vật lý và không đánh số ô trống",()=>{
 const grid=read("src/lib/seating.ts");
 const editor=read("src/components/seating-client.tsx");
 const canvas=read("src/components/seat-grid-canvas.tsx");
 const delegate=read("src/components/delegate-seat-hall.tsx");
 const projector=read("src/lib/attendance-seat-projection.ts");
 assert.match(grid,/export function projectSeatGrid/);
 assert.match(editor,/const inferred=projectSeatGrid\(storedSize,next\.seats\)/);
 assert.match(editor,/renumberGridSeats\(next\.seats,nextSize\)/);
 assert.match(canvas,/Lối vào/);
 assert.match(canvas,/min\(46%,300px\)/);
 assert.match(delegate,/data-physical-seat-grid/);
 assert.match(delegate,/size\.rows/);
 assert.match(delegate,/size\.columns/);
 assert.match(delegate,/title="Lối đi \/ ô trống"/);
 assert.match(delegate,/seatNumbers\.get\(seat\.id\)/);
 assert.match(delegate,/displayedSeatCode/);
 assert.match(delegate,/className="delegate-seat-landscape"/);
 assert.match(projector,/return projectSeatGrid\(/);
});
