import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateSharedBchTotal,validateBchVotes,ballotPercentage,formatBallotPercentage}
 from "../src/lib/bch-candidates.ts";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("manual BCH tally validates one common denominator independently of attendance",()=>{
 assert.equal(validateSharedBchTotal("75"),75);
 assert.deepEqual(validateBchVotes("60",75),{votes:60,error:null});
 assert.equal(formatBallotPercentage(60,75),"80,00%");
 assert.equal(ballotPercentage(0,75),0);
 assert.equal(validateBchVotes("",75).votes,null);
 assert.equal(validateSharedBchTotal(""),null);
});
test("reject invalid denominators and counts exceeding a shared total",()=>{
 for(const input of ["-1","0","1000001","1.5","1e2"," 4",{}])
  assert.equal(validateSharedBchTotal(input),undefined);
 for(const input of ["76","-1","1.5","1e2"," 1"])
  assert.ok(validateBchVotes(input,75).error);
 assert.ok(validateBchVotes("5",null).error);
});
test("personnel view contains no vote results or tally editor; a dedicated ballot page exists",()=>{
 const personnel=read("src/components/bch-candidates-client.tsx");
 const page=read("src/app/congresses/[id]/ballots/page.tsx");
 const shell=read("src/components/app-shell.tsx");
 assert.doesNotMatch(personnel,/BchBallotEditor|ballotPercentage|formatBallotPercentage/);
 assert.doesNotMatch(personnel,/votes_received\?\?""/);
 assert.match(personnel,/href=\{"\/congresses\/"\+congressId\+"\/ballots"\}/);
 assert.match(shell,/name:"Kiểm phiếu BCH",href:base\+"\/ballots"/);
 assert.match(page,/ballots\.read/);
 assert.match(page,/canWrite=\{canWrite\}/);
 assert.match(read("src/app/congresses/[id]/ballots/layout.tsx"),/requireCongressAbility\(id,"ballots\.read"\)/);
});
test("BCH biographical editing never writes vote counts, even if caller sends ballotEnabled",()=>{
 const api=read("src/app/api/bch-candidates/route.ts");
 const edit=read("src/components/bch-candidates-client.tsx");
 assert.match(edit,/ballotEnabled:false/);
 assert.match(api,/bchWriteData\(checked\.data,false\)/);
 assert.doesNotMatch(api,/body\.ballotEnabled===true/);
 assert.match(api,/select\(PUBLIC_BCH_FIELDS\)/);
});
test("tally endpoints use separate permissions and service-only serialized RPCs",()=>{
 const candidate=read("src/app/api/bch-candidates/ballots/route.ts");
 const total=read("src/app/api/bch-candidates/ballots/total/route.ts");
 assert.match(candidate,/hasCongressAbility\(supabase,user\.id,congressId,"ballots\.write"\)/);
 assert.match(total,/hasCongressAbility\(supabase,user\.id,congressId,"ballots\.write"\)/);
 assert.match(candidate,/set_bch_candidate_votes_v58/);
 assert.match(total,/set_bch_shared_ballot_total/);
 assert.match(candidate,/createAdminClient\(\)/);
 assert.match(total,/createAdminClient\(\)/);
});
test("dedicated ballot editor has one common denominator and per-candidate vote input",()=>{
 const editor=read("src/components/bch-ballot-editor.tsx");
 const page=read("src/components/bch-ballots-client.tsx");
 assert.match(editor,/name="bch_total_ballots"/);
 assert.match(editor,/name="votes_received"/);
 assert.doesNotMatch(editor,/name="total_ballots"/);
 assert.match(editor,/ballotPercentage\(checked\.votes,total\)/);
 assert.match(page,/BchBallotEditor/);
 assert.match(page,/toFile\("kiem-phieu-BCH-"/);
});
