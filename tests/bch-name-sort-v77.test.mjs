import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {sortBchCandidatesByVietnameseName,sortBchCandidates} from "../src/lib/bch-candidates.ts";

const item=(id,full_name,display_order)=>({
 id,full_name,display_order,
 created_at:"2026-11-15T00:00:00Z",updated_at:"2026-11-15T00:00:00Z",
 congress_id:"c",birth_year:2000,hometown:"Đồng Nai",ethnicity:"Kinh",
 education_level:"Đại học",union_join_year:2018,current_position:"Bí thư",
 photo_path:null
});
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("sort by Vietnamese given name, never mistakenly by surname",()=>{
 const source=[
  item("4","Đỗ Thị Hằng",1),
  item("3","Trần Văn Dũng",2),
  item("2","Lê Thị Bình",3),
  item("1","Nguyễn Minh An",4)
 ];
 const ordered=sortBchCandidatesByVietnameseName(source);
 assert.deepEqual(ordered.map(c=>c.full_name),[
  "Nguyễn Minh An","Lê Thị Bình","Trần Văn Dũng","Đỗ Thị Hằng"
 ]);
 assert.deepEqual(source.map(c=>c.id),["4","3","2","1"],"source array is immutable");
 assert.equal(sortBchCandidates(source)[0].id,"4","manual display order remains default");
});

test("Vietnamese D versus Đ and middle-name tie-breaking",()=>{
 const source=[
  item("d","Phạm Văn Đức",4),
  item("b","Trần Thị An",2),
  item("c","Nguyễn An Dũng",3),
  item("a","Nguyễn Bảo An",1)
 ];
 assert.deepEqual(sortBchCandidatesByVietnameseName(source).map(c=>c.id),["a","b","c","d"]);
});

test("trimmed names, singleton names and deterministic same-name ordering",()=>{
 const source=[
  item("z","  Trần   Thị   Hằng ",2),
  item("b","Trần Thị Hằng",1),
  item("a","Ánh",3),
  item("c","Lê Hồng Hằng",4)
 ];
 assert.deepEqual(sortBchCandidatesByVietnameseName(source).map(c=>c.id),["a","c","b","z"]);
});

test("sort command uses the existing exact-list atomic RPC, checks write permission",()=>{
 const ui=read("src/components/bch-candidates-client.tsx");
 const api=read("src/app/api/bch-candidates/reorder/route.ts");
 assert.match(ui,/Sắp xếp theo tên A–Z/);
 assert.match(ui,/sortBchCandidatesByVietnameseName\(sorted\)/);
 assert.match(ui,/persistOrder\(ordered,"name"\)/);
 assert.match(ui,/onClick=\{alphabetizeByName\}/);
 assert.match(ui,/method==="name"/);
 assert.match(api,/hasCongressAbility\(supabase,user\.id,congressId,"bch\.write"\)/);
 assert.match(api,/rpc\("reorder_bch_candidates"/);
 assert.match(ui,/orderedIds:ordered\.map\(item=>item\.id\)/);
});

test("Excel and delegate views still use the persisted display order",()=>{
 const ui=read("src/components/bch-candidates-client.tsx");
 const api=read("src/app/api/bch-candidates/route.ts");
 assert.match(ui,/sortBchCandidates\(candidates\)/);
 assert.match(ui,/makeBchWorkbookRows\(sorted\)/);
 assert.match(api,/\.order\("display_order"/);
});
