import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateSharedBchTotal,validateBchVotes,ballotPercentage,formatBallotPercentage}
 from "../src/lib/bch-candidates.ts";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("the congress has exactly one total while each candidate enters only votes achieved",()=>{
 assert.equal(validateSharedBchTotal("190"),190);
 assert.equal(validateBchVotes("175",190).votes,175);
 assert.equal(formatBallotPercentage(175,190),"92,11%");
 assert.equal(ballotPercentage(0,190),0);
 assert.equal(validateBchVotes("",190).votes,null);
 assert.equal(validateSharedBchTotal(""),null);
});
test("reject invalid common total and candidate votes exceeding it",()=>{
 for(const total of ["-1","0","1000001","1.5","1e2"," 5",{}]){
  assert.equal(validateSharedBchTotal(total),undefined);
 }
 for(const count of ["191","-1","1.5","1e2"," 1"]){
  assert.ok(validateBchVotes(count,190).error);
 }
 assert.ok(validateBchVotes("5",null).error);
});
test("BCH personnel has no BTC permission shortcut and exposes a standalone tally panel",()=>{
 const ui=read("src/components/bch-candidates-client.tsx");
 assert.doesNotMatch(ui,/Phân quyền BTC|\/permissions/);
 assert.match(ui,/Nhập kết quả kiểm phiếu/);
 assert.match(ui,/href="#ket-qua-kiem-phieu-bch"/);
 assert.match(ui,/<BchBallotEditor/);
 assert.match(ui,/congressKind==="doan"&&canManage&&<BchBallotEditor/);
 assert.match(ui,/total=\{sharedTotal\}/);
 assert.match(ui,/onTotalSaved=\{value=>/);
 assert.match(ui,/onSaved=\{saved=>/);
});
test("biographical edits intentionally never overwrite ballot results",()=>{
 const ui=read("src/components/bch-candidates-client.tsx");
 const personnel=read("src/app/api/bch-candidates/route.ts");
 assert.match(ui,/validateBchInput\(\{\.\.\.form,votes_received:"",total_ballots:""\}\)/);
 assert.match(ui,/ballotEnabled:false,\.\.\.checked\.data/);
 assert.match(personnel,/bchWriteData/);
 const api=read("src/app/api/bch-candidates/ballots/route.ts");
 assert.match(api,/\.update\(\{votes_received:checked\.votes,total_ballots:checked\.votes===null\?null:congress\.data\.bch_total_ballots/);
 assert.doesNotMatch(api,/\.update\(\{\.\.\.body/);
});
test("ballot endpoint uses effective account permission plus single common total",()=>{
 const api=read("src/app/api/bch-candidates/ballots/route.ts");
 const totalApi=read("src/app/api/bch-candidates/ballots/total/route.ts");
 assert.match(api,/hasCongressAbility\(supabase,user\.id,congressId,"bch\.write"\)/);
 assert.match(api,/select\("kind,bch_total_ballots"\)/);
 assert.match(api,/validateBchVotes\(body\?\.votes_received,congress\.data\.bch_total_ballots\)/);
 assert.match(api,/\.eq\("updated_at",expectedUpdatedAt\)/);
 assert.match(totalApi,/set_bch_shared_ballot_total/);
 assert.match(totalApi,/validateSharedBchTotal/);
});
test("ballot UI accepts one shared total and per-candidate count, no repeated denominators",()=>{
 const ui=read("src/components/bch-ballot-editor.tsx");
 assert.match(ui,/id="ket-qua-kiem-phieu-bch"/);
 assert.match(ui,/name="bch_total_ballots"/);
 assert.match(ui,/name="votes_received"/);
 assert.doesNotMatch(ui,/name="total_ballots"/);
 assert.match(ui,/ballotPercentage\(checked\.votes,total\)/);
 assert.match(ui,/\/api\/bch-candidates\/ballots\/total/);
 assert.match(ui,/\/api\/bch-candidates\/ballots"/);
 assert.match(ui,/expectedUpdatedAt:item\.updated_at/);
 assert.match(ui,/window\.confirm/);
 assert.match(ui,/role="alert"/);
});
