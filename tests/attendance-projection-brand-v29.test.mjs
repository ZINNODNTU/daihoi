import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import * as seating from "../src/lib/seating.ts";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const source=read("../src/lib/attendance-seat-projection.ts");
const js=ts.transpileModule(source,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true
}}).outputText;
const exports={};
new Function("require","module","exports",js)(
 name=>{
  if(name==="@/lib/seating")return seating;
  throw Error("Unexpected dependency "+name);
 },{exports},exports
);
const {projectAttendanceSeats}=exports;
const seat=(row,col,type="delegate")=>({
 id:"seat-"+row+"-"+col,layout_id:"layout-A",
 code:"G-"+String.fromCharCode(65+row)+"-"+String(col+1).padStart(2,"0"),
 row_label:String.fromCharCode(65+row),seat_number:col+1,zone:"G",
 x:seating.SEAT_GRID_LEFT+col*seating.SEAT_GRID_STEP_X,
 y:seating.SEAT_GRID_TOP+row*seating.SEAT_GRID_STEP_Y,
 blocked:false,seat_type:type
});

test("Hàng F không còn rơi xuống dải mã ghế dưới sơ đồ vì grid_rows cũ chỉ có 5",()=>{
 const seats=[seat(0,1),seat(0,2),...Array.from({length:24},(_,i)=>seat(5,i+1,i===11?"guest":"delegate"))];
 const original=seats.map(s=>({...s}));
 const result=projectAttendanceSeats({grid_rows:5,grid_columns:28},seats);
 assert.deepEqual(result.size,{rows:6,columns:28});
 assert.equal(result.outside.length,0);
 assert.equal(result.cells.size,26);
 assert.deepEqual(result.seatNumbers.get("seat-5-1"),1);
 assert.deepEqual(result.seatNumbers.get("seat-5-12"),12);
 assert.deepEqual(result.seatNumbers.get("seat-5-24"),24);
 assert.equal(result.seatNumbers.get("seat-0-1"),1);
 assert.deepEqual(seats,original,"Projection must never modify persisted seat codes");
});

test("Không tính số cho khoảng trống và lối đi, guest và delegate cùng dãy số",()=>{
 const seats=[seat(0,0),seat(0,1,"guest"),seat(0,4),seat(0,7)];
 const view=projectAttendanceSeats({grid_rows:3,grid_columns:8},seats);
 assert.deepEqual(seats.map(s=>view.seatNumbers.get(s.id)),[1,2,3,4]);
 assert.equal(view.cells.get(2),undefined);
 assert.equal(view.cells.get(3),undefined);
 assert.equal(view.outside.length,0);
});

test("Giữ ghế thực sự nằm ngoài lưới trong dữ liệu, không render chip mã G-F-x",()=>{
 const vip={...seat(0,0),id:"vip",zone:"VIP",x:1600,y:1270,code:"VIP-A-01"};
 const view=projectAttendanceSeats({grid_rows:5,grid_columns:10},[seat(0,0),vip]);
 assert.equal(view.outside.length,1);
 assert.equal(view.outside[0].id,"vip");
 const ui=read("../src/components/attendance-projection.tsx");
 assert.doesNotMatch(ui,/outside\.map\(seat/);
 assert.match(ui,/projectAttendanceSeats/);
 assert.match(ui,/seatNumbers\.get\(seat\.id\)/);
 assert.doesNotMatch(ui,/\{c\+1\}<\/span>/);
 const board=read("../src/components/attendance-live-board.tsx");
 assert.match(board,/projectAttendanceSeats/);
 assert.match(board,/seatNumbers\.get\(seat\.id\)/);
});

test("Loại Đại hội điều khiển logo ở quản trị, thẻ, màn hình điểm danh và cổng đại biểu",()=>{
 const branding=read("../src/components/brand-mark.tsx");
 assert.match(branding,/huy-hieu-hoi-sinh-vien\.png/);
 assert.match(branding,/huy-hieu-doan\.png/);
 assert.match(branding,/congressBranding\[kind\]/);
 const logo=readFileSync(new URL("../public/branding/huy-hieu-hoi-sinh-vien.png",import.meta.url));
 assert.equal(logo[0],137);
 assert.equal(logo[1],80);
 assert.ok(logo.byteLength>10000);
 const adminLayout=read("../src/app/congresses/[id]/layout.tsx");
 assert.match(adminLayout,/congressKind=\{congress\.kind\}/);
 const adminShell=read("../src/components/app-shell.tsx");
 assert.match(adminShell,/BrandMark kind=\{congressKind\}/);
 const sessionPage=read("../src/app/congresses/[id]/attendance/live/page.tsx");
 assert.match(sessionPage,/select\("name,kind"\)/);
 assert.match(sessionPage,/congressKind=\{congressResult\.data\?\.kind\|\|"doan"\}/);
 const sessionView=read("../src/components/session-qr-screen.tsx");
 assert.match(sessionView,/BrandMark kind=\{congressKind\}/);
 const choice=read("../src/lib/active-congress.ts");
 assert.match(choice,/loadSharedCongressInfo/);
 assert.match(read("../src/lib/portal-shared-reads.ts"),/\.select\("id,name,term,status,kind,venue"\)/);
 const portal=read("../src/components/delegate-shell.tsx");
 assert.match(portal,/BrandMark kind=\{congresses\.find\(item=>item\.id===activeCongressId\)\?\.kind\|\|"doan"\}/);
 const card=read("../src/components/my-delegate-cards.tsx");
 assert.match(card,/congressBranding\[item\.kind\]\.src/);
});

test("Màn chiếu làm mới sơ đồ định kỳ thay vì giữ dữ liệu ghế cũ 2 phút",()=>{
 const live=read("../src/components/use-attendance-live.ts");
 assert.match(live,/\},10000\);/);
 assert.doesNotMatch(live,/\},120000\);/);
});
