import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {delegateUnitKey,groupDelegatesByUnit} from "../src/lib/delegate-unit-groups.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const demo=[
 {id:"1",unit:"Đoàn khoa",full_name:"Nguyễn Thành Nhân"},
 {id:"2",unit:"23DTH1",full_name:"Phan Lê Duy"},
 {id:"3",unit:"Khoa Công nghệ thông tin",full_name:"Mạch Thị Thanh Ngọc"},
 {id:"4",unit:"23dth1",full_name:"Nguyễn Ngọc Trâm Anh"},
 {id:"5",unit:" 23DTH1  ",full_name:"Phạm Thị Tuyết Nhi"},
 {id:"6",unit:"Đoàn  khoa",full_name:"Trần Vương Tuấn Kiệt"},
 {id:"7",unit:"",full_name:"Đại biểu chưa có đơn vị"},
 {id:"8",unit:null,full_name:"Đại biểu thứ hai chưa có đơn vị"},
];

test("group by unit, merge case/whitespace variants, count and place unassigned last",()=>{
 const groups=groupDelegatesByUnit(demo);
 assert.equal(groups.length,4);
 assert.deepEqual(groups.map(g=>g.label),[
  "23DTH1","Đoàn khoa","Khoa Công nghệ thông tin","Chưa phân đơn vị"
 ]);
 assert.deepEqual(groups.map(g=>g.delegates.length),[3,2,1,2]);
 assert.deepEqual(groups[0].delegates.map(d=>d.id),["2","4","5"]);
 assert.deepEqual(groups[1].delegates.map(d=>d.id),["1","6"]);
 assert.equal(groups[3].unassigned,true);
 assert.deepEqual(demo.map(d=>d.id),["1","2","3","4","5","6","7","8"],"input is untouched");
});
test("unit keys are normalized and unassigned unit is a distinct bucket",()=>{
 assert.equal(delegateUnitKey("  Đoàn   Khoa "),delegateUnitKey("đoàn khoa"));
 assert.equal(delegateUnitKey(undefined),delegateUnitKey(null));
 assert.notEqual(delegateUnitKey("Chưa phân đơn vị"),delegateUnitKey(""));
});
test("filtering search results changes only visible unit groups and preserves total data",()=>{
 const filtered=demo.filter(d=>d.full_name.toLowerCase().includes("nguyễn"));
 const groups=groupDelegatesByUnit(filtered);
 assert.equal(groups.length,2);
 assert.equal(groups.reduce((sum,g)=>sum+g.delegates.length,0),2);
 assert.equal(demo.length,8);
});
test("unit groups sort numeric Vietnamese labels naturally",()=>{
 const groups=groupDelegatesByUnit([
  {id:"a",unit:"Tổ 10"},{id:"b",unit:"Tổ 2"},{id:"c",unit:"Tổ 1"},
  {id:"d",unit:"Tổ Đ"},{id:"e",unit:"Tổ D"}
 ]);
 assert.deepEqual(groups.slice(0,3).map(g=>g.label),["Tổ 1","Tổ 2","Tổ 10"]);
 assert.equal(groups.length,5);
});
test("desktop and mobile lists group independently but share search and selection",()=>{
 const ui=read("src/components/delegates-client.tsx");
 assert.match(ui,/groupDelegatesByUnit\(filtered\)/);
 assert.match(ui,/groupDelegatesByUnit\(delegates\)/);
 assert.equal((ui.match(/\{unitGroups\.map\(group=><(?:Fragment|section)/g)||[]).length,2,"desktop & mobile");
 assert.match(ui,/function toggleUnit/);
 assert.match(ui,/function toggleAllUnits/);
 assert.match(ui,/function selectUnit/);
 assert.match(ui,/selectUnit\(group\.delegates\.map\(d=>d\.id\)\)/);
 assert.match(ui,/fullUnitCounts\.get\(group\.key\)/);
 assert.match(ui,/collapsedUnitKeys\.has\(group\.key\)/);
 assert.match(ui,/setCollapsedUnitKeys\(new Set\(\)\)/);
 assert.match(ui,/group\.delegates\.map\(d=><tr key=\{d\.id\}>/);
 assert.match(ui,/group\.delegates\.map\(d=><article key=\{d\.id\}/);
 assert.match(ui,/aria-expanded=\{!collapsed\}/);
 assert.match(ui,/aria-label=\{"Chọn tất cả đại biểu thuộc đơn vị "\+label\}/);
 assert.match(ui,/\{!filtered\.length&&<tr>/,"empty results still show");
});
