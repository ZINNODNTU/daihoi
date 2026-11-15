import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 BCH_IMPORT_COLUMNS,BCH_IMPORT_MAX_ROWS,parseBchImportMatrix,bchPersonKey,validateBchInput
} from "../src/lib/bch-candidates.ts";

const row=["1","Nguyễn Văn A",2001,"Đồng Nai","Kinh","Đại học",2017,"Bí thư Chi đoàn"];
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("BCH exported header is directly re-importable, numeric years retained",()=>{
 const parsed=parseBchImportMatrix([[...BCH_IMPORT_COLUMNS],row],[],4);
 assert.equal(parsed.rows.length,1);
 assert.equal(parsed.rows[0].full_name,"Nguyễn Văn A");
 assert.equal(parsed.rows[0].birth_year,2001);
 assert.equal(parsed.rows[0].union_join_year,2017);
 assert.equal(parsed.rows[0].display_order,5);
 assert.equal(parsed.rows[0].votes_received,null);
 assert.equal(parsed.invalidCount,0);
});
test("column order, accents and optional STT do not affect mapping",()=>{
 const matrix=[
  ["CHỨC VỤ HIỆN TẠI","Quê quán","Năm sinh","Dân tộc","Trình độ","Họ tên","Năm vào Đoàn"],
  ["Bí thư Chi đoàn","Đồng Nai","2001","Kinh","Đại học","Nguyễn Văn A","2017"]
 ];
 const parsed=parseBchImportMatrix(matrix,[],0);
 assert.equal(parsed.rows.length,1);
 assert.equal(parsed.rows[0].current_position,"Bí thư Chi đoàn");
});
test("validation reports missing and malformed cells without silently importing",()=>{
 const missing=parseBchImportMatrix([["Họ tên","Năm sinh"]],[],0);
 assert.match(missing.errors.join(" " ),/Thiếu cột/);
 const invalid=parseBchImportMatrix([[...BCH_IMPORT_COLUMNS],[...row.slice(0,6),2028,row[7]]],[],0);
 assert.equal(invalid.invalidCount,1);
 assert.equal(invalid.rows.length,0);
 assert.match(invalid.errors[0],/Dòng 2/);
});
test("congress scoped existing duplicates and repeated rows in Excel are skipped",()=>{
 const existing={full_name:"nguyen van a",birth_year:2001,hometown:"dong nai"};
 assert.equal(bchPersonKey(existing),bchPersonKey({full_name:"Nguyễn Văn A",birth_year:2001,hometown:"Đồng Nai"}));
 const other=["2","Nguyễn Văn B",2002,"Đồng Nai","Kinh","Đại học",2018,"Bí thư Chi đoàn"];
 const parsed=parseBchImportMatrix([[...BCH_IMPORT_COLUMNS],row,other,other],[existing],2);
 assert.equal(parsed.rows.length,1);
 assert.equal(parsed.rows[0].full_name,"Nguyễn Văn B");
 assert.equal(parsed.skipped,2);
});
test("maximum 200 records per file and 500 per congress are enforced",()=>{
 const source=Array.from({length:BCH_IMPORT_MAX_ROWS+1},(_,i)=>
  [String(i+1),"Nguyễn Văn "+i,2000,"Đồng Nai","Kinh","Đại học",2018,"Bí thư Chi đoàn"]);
 const parsed=parseBchImportMatrix([[...BCH_IMPORT_COLUMNS],...source],[],0);
 assert.equal(parsed.rows.length,0);
 assert.match(parsed.errors.join(" "),/tối đa 200/);
});
test("UI exposes an importer, preview, template and explicit confirmation",()=>{
 const ui=read("src/components/bch-candidates-client.tsx");
 assert.match(ui,/Nhập Excel/);
 assert.match(ui,/Tải file Excel mẫu/);
 assert.match(ui,/parseBchImportMatrix/);
 assert.match(ui,/Xác nhận nhập/);
 assert.match(ui,/src\/=|src=/);
});
test("import endpoint checks bch.write, revalidates and does not alter votes or existing candidates",()=>{
 const api=read("src/app/api/bch-candidates/import/route.ts");
 assert.match(api,/hasCongressAbility\(supabase,user.id,congressId,"bch.write"\)/);
 assert.match(api,/validateBchInput\(body.candidates\[i\]\)/);
 assert.match(api,/existingKeys/);
 assert.match(api,/\.insert\(records\)/);
 assert.match(api,/bchWriteData\(\{\.\.\.person,display_order:[\s\S]*?\},false\)/);
 assert.doesNotMatch(api,/\.update\(/);
});
