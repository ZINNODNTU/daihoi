import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 DELEGATE_IMPORT_COLUMNS,DELEGATE_IMPORT_BATCH_SIZE,delegateImportRow,
 selectDelegateTransfer,splitDelegateImportBatches
} from "../src/lib/delegate-transfer.ts";
import {normalizeBirthDate,normalizeGender} from "../src/lib/delegate-demographics.ts";
const one=(id,fields={})=>({
 id,student_id:"00001234",full_name:"Nguyễn Thành Nhân",
 unit:"Đoàn khoa",position:"Bí thư",delegate_type:"official",
 gender:"male",birth_date:"2004-02-16",
 photo_path:"people/secret.jpg",auth_user_id:"private-id",barcode_code:"SECRET",...fields
});
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("cross-congress export columns exactly match import template and normalize losslessly",()=>{
 const row=delegateImportRow(one("1"));
 assert.deepEqual([...DELEGATE_IMPORT_COLUMNS],["MSSV","Họ tên","Đơn vị","Chức vụ","Vai trò","Giới tính","Ngày sinh"]);
 assert.deepEqual(row,["00001234","Nguyễn Thành Nhân","Đoàn khoa","Bí thư","Chính thức","Nam","16/02/2004"]);
 assert.equal(normalizeGender(row[5]),"male");
 assert.equal(normalizeBirthDate(row[6]),"2004-02-16");
 assert.equal(row[0],"00001234"); // preserve leading zeroes
 assert.equal(row.some(cell=>cell?.includes("secret")||cell?.includes("private-id")),false);
});
test("guest, alternate, missing demographics are retained for import",()=>{
 const guest=delegateImportRow(one("g",{
  student_id:null,delegate_type:"guest",gender:null,birth_date:null
 }));
 assert.deepEqual(guest,["","Nguyễn Thành Nhân","Đoàn khoa","Bí thư","Khách mời","",""]);
 const alternate=delegateImportRow(one("a",{delegate_type:"alternate",gender:"female"}));
 assert.equal(alternate[4],"Dự khuyết");
 assert.equal(alternate[5],"Nữ");
});
test("select all is independent of filtered selection and order is preserved",()=>{
 const data=[one("1"),one("2"),one("3")];
 assert.deepEqual(selectDelegateTransfer(data,null).map(d=>d.id),["1","2","3"]);
 assert.deepEqual(selectDelegateTransfer(data,new Set(["3","1"])).map(d=>d.id),["1","3"]);
 assert.deepEqual(selectDelegateTransfer(data,new Set(["bad"])),[]);
 assert.equal(data.length,3);
});
test("downloads split on importer 250-row limit and keep valid headers",()=>{
 const data=Array.from({length:501},(_,i)=>one(String(i),{student_id:String(i).padStart(6,"0")}));
 assert.equal(DELEGATE_IMPORT_BATCH_SIZE,250);
 const sheets=splitDelegateImportBatches(data);
 assert.deepEqual(sheets.map(x=>x.length),[250,250,1]);
 assert.equal(sheets[0][0].id,"0");
 assert.equal(sheets[1][0].id,"250");
 assert.equal(sheets[2][0].id,"500");
 assert.deepEqual(splitDelegateImportBatches([]),[]);
});
test("UI exposes selectable table/mobile cards, all/selected exports and importer duplicate safeguards",()=>{
 const ui=read("src/components/delegates-client.tsx");
 assert.match(ui,/exportDelegates\("all"\)/);
 assert.match(ui,/exportDelegates\("selected"\)/);
 assert.match(ui,/selectFiltered/);
 assert.match(ui,/selectedIds\.has\(d\.id\)/);
 assert.match(ui,/delegateImportRow/);
 assert.match(ui,/DELEGATE_IMPORT_COLUMNS/);
 assert.match(ui,/save\(importableRows\)/);
 assert.match(ui,/existingStudentIds/);
 assert.doesNotMatch(read("src/lib/delegate-transfer.ts"),/barcode_code|auth_user_id/);
});
