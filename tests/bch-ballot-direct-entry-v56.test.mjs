import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateManualBchBallots,ballotPercentage,formatBallotPercentage}
 from "../src/lib/bch-candidates.ts";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("manual BCH tally validates a complete pair, not voting- or attendance-derived totals",()=>{
 const valid=validateManualBchBallots({votes_received:"175",total_ballots:"190"});
 assert.deepEqual(valid,{data:{votes_received:175,total_ballots:190},error:null});
 assert.equal(formatBallotPercentage(valid.data?.votes_received,valid.data?.total_ballots),"92,11%");
 assert.equal(ballotPercentage(0,200),0);
 const empty=validateManualBchBallots({votes_received:"",total_ballots:""});
 assert.deepEqual(empty.data,{votes_received:null,total_ballots:null});
 assert.equal(validateManualBchBallots({votes_received:null,total_ballots:null}).error,null);
});

test("manual tally rejects partial, fractional, exponential, negative and impossible counts",()=>{
 for(const [votes,total] of [
  ["10",""],["","10"],["101","100"],["-1","100"],["1.5","100"],
  ["1e2","200"],[" 1","100"],[" ","100"],["1","0"],["1","1000001"],
  [1.1,100],[1000001,1000001]
 ]){
  const result=validateManualBchBallots({votes_received:votes,total_ballots:total});
  assert.equal(result.data,null,String(votes)+"/"+String(total));
  assert.ok(result.error);
 }
 assert.equal(validateManualBchBallots(null).data,null);
});

test("BCH personnel toolbar never links to BTC permissions; top-level panel enables direct vote entry",()=>{
 const ui=read("src/components/bch-candidates-client.tsx");
 assert.doesNotMatch(ui,/Phân quyền BTC|\/permissions/);
 assert.doesNotMatch(ui,/import Link from "next\/link"/);
 assert.match(ui,/Nhập kết quả kiểm phiếu/);
 assert.match(ui,/href="#ket-qua-kiem-phieu-bch"/);
 assert.match(ui,/<BchBallotEditor/);
 assert.match(ui,/congressKind==="doan"&&canManage&&<BchBallotEditor/);
 assert.match(ui,/onSaved=\{saved=>/);
 assert.match(ui,/congressKind==="doan"&&canManage&&<th>Kết quả kiểm phiếu/);
 assert.match(ui,/congressKind==="doan"&&canManage&&<td/);
 assert.match(ui,/congressKind==="doan"&&canManage&&<div className="col-span-2/);
});

test("editing personnel preserves existing tallies, because results are written only by tally endpoint",()=>{
 const ui=read("src/components/bch-candidates-client.tsx");
 assert.match(ui,/validateBchInput\(\{\.\.\.form,votes_received:"",total_ballots:""\}\)/);
 assert.match(ui,/ballotEnabled:false,\.\.\.checked\.data/);
 assert.doesNotMatch(ui,/<fieldset className="rounded-xl border border-\[#d6e5ef\]/);
 const form=ui.slice(ui.indexOf("const formatCandidate="),ui.indexOf("function bchPhotoUrl"));
 assert.match(form,/votes_received:"",total_ballots:""/);
 const api=read("src/app/api/bch-candidates/ballots/route.ts");
 assert.match(api,/\.update\(\{\.\.\.checked\.data,updated_at:/);
 assert.doesNotMatch(api,/\.update\(\{\.\.\.body/);
});

test("ballot endpoint is protected by server congress scope and role plus optimistic concurrency",()=>{
 const api=read("src/app/api/bch-candidates/ballots/route.ts");
 assert.match(api,/export async function PATCH/);
 assert.match(api,/origin&&new URL\(origin\)\.host!==request\.headers\.get\("host"\)/);
 assert.match(api,/getAuth\(\)/);
 assert.match(api,/getCongressRole\(supabase,user\.id,congressId\)/);
 assert.match(api,/canCongress\(role,"bch\.write"\)/);
 assert.match(api,/congress\.data\.kind!=="doan"/);
 assert.match(api,/validateManualBchBallots\(body\)/);
 assert.match(api,/\.eq\("congress_id",congressId\)\.eq\("id",id\)/);
 assert.match(api,/\.eq\("updated_at",expectedUpdatedAt\)/);
 assert.match(api,/bch\.ballot_updated/);
 assert.doesNotMatch(api,/createAdminClient|service_role/i);
});

test("vote editor has individual controlled inputs, percentage previews, feedback and clear confirmation",()=>{
 const ui=read("src/components/bch-ballot-editor.tsx");
 assert.match(ui,/id="ket-qua-kiem-phieu-bch"/);
 assert.match(ui,/candidates\.map\(item=><BallotRow/);
 assert.match(ui,/name="votes_received"/);
 assert.match(ui,/name="total_ballots"/);
 assert.match(ui,/ballotPercentage\(count,denominator\)/);
 assert.match(ui,/formatBallotPercentage\(count,denominator\)/);
 assert.match(ui,/method:"PATCH",credentials:"same-origin"/);
 assert.match(ui,/expectedUpdatedAt:item\.updated_at/);
 assert.match(ui,/window\.confirm\("Xóa số phiếu đã lưu/);
 assert.match(ui,/disabled=\{disabled\|\|saving\|\|!changed\|\|!checked\.data\}/);
 assert.match(ui,/role="alert"/);
 assert.match(ui,/Mỗi nhân sự có nút lưu riêng/);
});
