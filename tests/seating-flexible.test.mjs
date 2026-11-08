import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  seatGridSizeValid,seatGridCellIndex,seatGridPosition,seatGridPattern,
  setSeatGridCells,validateSeatDrafts,validateImport
} from "../src/lib/seating.ts";
const id=()=>crypto.randomUUID();
test("Canvas linh hoạt theo hàng/cột, từ 1 đến 500 vị trí",()=>{
  assert.equal(seatGridSizeValid({rows:1,columns:1}),true);
  assert.equal(seatGridSizeValid({rows:20,columns:25}),true);
  assert.equal(seatGridSizeValid({rows:25,columns:30}),false);
  assert.equal(seatGridSizeValid({rows:0,columns:20}),false);
  assert.equal(seatGridSizeValid({rows:12.5,columns:20}),false);
  assert.equal(seatGridSizeValid({rows:10,columns:31}),false);
});
test("12 hàng x 15 cột = 180 ô, ghế cuối ở hàng L vị trí 15",()=>{
  const size={rows:12,columns:15};
  const result=setSeatGridCells([],seatGridPattern("full",size),new Set(),id,size,"delegate");
  assert.equal(result.error,null);
  assert.equal(result.seats.length,180);
  assert.equal(result.seats.at(-1).code,"G-L-15");
  assert.deepEqual(seatGridPosition(11,14,size),{x:907,y:850});
  assert.equal(seatGridCellIndex(result.seats.at(-1),size),179);
  assert.equal(validateSeatDrafts(result.seats),null);
});
test("Mẫu lối đi theo bề rộng tùy chỉnh",()=>{
  const size={rows:8,columns:15};
  const pattern=seatGridPattern("center-aisle",size);
  assert.equal(pattern.size,112);
  for(let row=0;row<8;row++)assert.ok(!pattern.has(row*15+7));
});
test("Ghế khách mời có loại guest, đại biểu delegate",()=>{
  const size={rows:3,columns:4};
  const guest=setSeatGridCells([],new Set([0]),new Set(),id,size,"guest");
  assert.equal(guest.error,null);
  assert.equal(guest.seats[0].seatType,"guest");
  const filled=setSeatGridCells(guest.seats,new Set([0,1,2]),new Set(),id,size,"delegate");
  assert.equal(filled.error,null);
  assert.equal(filled.seats[0].seatType,"guest");
  assert.equal(filled.seats[1].seatType,"delegate");
});
test("Thay kích thước canvas không xóa ghế ngoài vùng",()=>{
  const initial={rows:10,columns:20};
  const small={rows:8,columns:12};
  const original=setSeatGridCells([],new Set([0,19,199]),new Set(),id,initial,"delegate").seats;
  assert.equal(seatGridCellIndex(original[2],small),null);
  const smallSet=setSeatGridCells(original,seatGridPattern("full",small),new Set(),id,small,"delegate");
  assert.equal(smallSet.error,null);
  assert.equal(smallSet.seats.length,98);
  assert.ok(smallSet.seats.some(s=>s.id===original[2].id));
});
test("Excel không thể phân khách mời vào ghế đại biểu và ngược lại",()=>{
  const size={rows:2,columns:2};
  const guest=setSeatGridCells([],new Set([0]),new Set(),id,size,"guest").seats;
  const both=setSeatGridCells(guest,new Set([0,1]),new Set(),id,size,"delegate").seats;
  const people=[
    {id:id(),code:"DB1",full_name:"Đại biểu 1",unit:"Chi đoàn",is_active:true,delegate_type:"official"},
    {id:id(),code:"KM1",full_name:"Khách mời 1",unit:"BTC",is_active:true,delegate_type:"guest"}
  ];
  assert.equal(validateImport([{seatCode:both[0].code,delegateCode:"KM1"},{seatCode:both[1].code,delegateCode:"DB1"}],both,people).length,0);
  const issues=validateImport([
    {seatCode:both[0].code,delegateCode:"DB1"},
    {seatCode:both[1].code,delegateCode:"KM1"}
  ],both,people);
  assert.ok(issues.some(i=>i.message.includes("không phù hợp")));
});
test("API sử dụng RPC v6 và lấy trường role từ Supabase",()=>{
  const api=readFileSync(new URL("../src/app/api/seating/route.ts",import.meta.url),"utf8");
  assert.match(api,/seating_save_layout_v6/);
  assert.match(api,/grid_rows,grid_columns/);
  assert.match(api,/delegate_type/);
  assert.match(api,/seat_type/);
  const sql=readFileSync(new URL("../supabase/upgrade-seating-v6.sql",import.meta.url),"utf8");
  assert.match(sql,/SEATING_ASSIGNED_TYPE_MISMATCH/);
  assert.match(sql,/d.delegate_type='guest'/);
  assert.match(sql,/REVOKE EXECUTE ON FUNCTION public.seating_save_layout_v6/);
});
