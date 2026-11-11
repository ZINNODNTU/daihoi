import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {
 seatGridCellIndex,seatGridPattern,setSeatGridCells,validateSeatDrafts,
 seatGridSizeValid,renumberGridSeats
} from "../src/lib/seating.ts";

const src=readFileSync(new URL("../src/lib/seating-plan.ts",import.meta.url),"utf8");
const js=ts.transpileModule(src,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
}}).outputText;
const unit={exports:{}};
new Function("require","module","exports",js)(name=>{
 if(name==="@/lib/seating")return {seatGridCellIndex,seatGridPattern,setSeatGridCells,validateSeatDrafts,
  seatGridSizeValid,renumberGridSeats};
 throw Error("Unsupported module "+name);
},unit,unit.exports);

const {applySeatGridCommand}=unit.exports;
const size={rows:4,columns:8};
let counter=0;
const id=()=>("test-seat-"+(++counter));
const initial=()=>setSeatGridCells([],seatGridPattern("full",size),new Set(),id,size).seats;
const indexOf=seat=>seatGridCellIndex(seat,size);

test("Atomic multi-aisle layout: 4 rows, 8 columns, numbering excludes empty cells",()=>{
 const all=initial(),before=new Map(all.map(s=>[indexOf(s),s.id]));
 const plan=applySeatGridCommand(all,new Set(),size,{kind:"clear-aisles",columns:[0,3,4,7]},id);
 assert.equal(plan.error,null);
 assert.equal(plan.seats.length,16);
 assert.equal(validateSeatDrafts(plan.seats),null);
 for(let row=0;row<4;row++){
  const seats=plan.seats.filter(s=>indexOf(s)!==null&&Math.floor(indexOf(s)/8)===row)
   .sort((a,b)=>indexOf(a)-indexOf(b));
  assert.deepEqual(seats.map(s=>s.seatNumber),[1,2,3,4]);
  assert.deepEqual(seats.map(s=>indexOf(s)%8),[1,2,5,6]);
  assert.ok(seats.every(s=>before.get(indexOf(s))===s.id),"untouched UUID must survive");
 }
});

test("Assigned seat prevents entire destructive batch; never partially removes chairs",()=>{
 const all=initial();
 const guarded=all.find(s=>indexOf(s)===11);
 const outcome=applySeatGridCommand(all,new Set([guarded.id]),size,
  {kind:"clear-aisles",columns:[3,4]},id);
 assert.ok(outcome.error?.includes("phân công"));
 assert.strictEqual(outcome.seats,all);
 assert.equal(outcome.seats.length,32);
});

test("Row operations create and clear only selected rows without changing other rows",()=>{
 const all=initial();
 const cleared=applySeatGridCommand(all,new Set(),size,{kind:"clear-row",row:2},id);
 assert.equal(cleared.error,null);
 assert.equal(cleared.seats.length,24);
 assert.ok(cleared.seats.every(s=>Math.floor(indexOf(s)/8)!==2));
 const filled=applySeatGridCommand(cleared.seats,new Set(),size,
  {kind:"fill-row",row:2,seatType:"delegate"},id);
 assert.equal(filled.error,null);
 assert.equal(filled.seats.length,32);
 assert.equal(validateSeatDrafts(filled.seats),null);
 for(const seat of all.filter(s=>Math.floor(indexOf(s)/8)!==2)){
  assert.equal(filled.seats.find(s=>s.id===seat.id)?.id,seat.id);
 }
});

test("Guest-front-row conversion is atomic and preserves codes and assignment IDs",()=>{
 const all=initial();
 const occupied=all.find(s=>indexOf(s)===1);
 const forbidden=applySeatGridCommand(all,new Set([occupied.id]),size,
  {kind:"guest-row",row:0},id);
 assert.ok(forbidden.error?.includes("phân công"));
 assert.strictEqual(forbidden.seats,all);
 const changed=applySeatGridCommand(all,new Set(),size,{kind:"guest-row",row:0},id);
 assert.equal(changed.error,null);
 assert.equal(changed.seats.filter(s=>s.seatType==="guest").length,8);
 for(const seat of all){
  const result=changed.seats.find(s=>s.id===seat.id);
  assert.ok(result);
  assert.equal(result.code,seat.code);
 }
 const restored=applySeatGridCommand(changed.seats,new Set(),size,
  {kind:"delegate-row",row:0},id);
 assert.equal(restored.seats.filter(s=>s.seatType==="guest").length,0);
});

test("Aisle and row commands reject invalid indices and protect legacy off-grid seats",()=>{
 const all=initial();
 for(const command of [
  {kind:"clear-column",column:8},
  {kind:"clear-row",row:-1},
  {kind:"clear-aisles",columns:[]},
  {kind:"clear-aisles",columns:[-1]}
 ]){
  const result=applySeatGridCommand(all,new Set(),size,command,id);
  assert.ok(result.error);
  assert.strictEqual(result.seats,all);
 }
 const outside={...all[0],id:"outside-uuid",zone:"VIP",code:"VIP-X-01",x:3000,y:3000};
 const result=applySeatGridCommand([...all,outside],new Set(),size,
  {kind:"clear-column",column:0},id);
 assert.equal(result.error,null);
 assert.ok(result.seats.some(s=>s.id==="outside-uuid"));
});
test("Editor exposes live capacity, bulk tools, history and synced dimensions",()=>{
 const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
 const canvas=read("src/components/seat-grid-canvas.tsx");
 const client=read("src/components/seating-client.tsx");
 assert.match(canvas,/useState\(String\(rows\)\)/);
 assert.match(client,/key=\{layoutId\+"-"\+gridRows\+"x"\+gridColumns\}/);
 assert.match(canvas,/onCommand\(\{kind:"guest-row"/);
 assert.match(canvas,/onCommand\(\{kind:"clear-column"/);
 assert.match(canvas,/onCommand\(\{kind:"clear-aisles"/);
 assert.match(canvas,/undoCount/);
 assert.match(canvas,/missingDelegates/);
 assert.match(client,/rememberSeats/);
 assert.match(client,/resetHistory/);
 assert.match(client,/applySeatGridCommand/);
});
