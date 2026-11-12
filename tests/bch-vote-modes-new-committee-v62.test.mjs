import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 validateBchVoteEntry,ballotPercentage,sortBchBallotsByPercentage,
 selectNewBchMembers
} from "../src/lib/bch-candidates.ts";

function candidate(id,name,votes,order=0){
 return {id,full_name:name,display_order:order,created_at:"2026-01-01T00:00:00Z",
  updated_at:"2026-01-01T00:00:00Z",votes_received:votes,total_ballots:10};
}
const candidates=[
 candidate("a","A",9,1),
 candidate("c","C",6,3),
 candidate("b","B",6,2),
 candidate("d","D",0,4)
];

test("phiếu thuận preserves the entered count; phiếu ngược converts before percentage",()=>{
 assert.deepEqual(validateBchVoteEntry("4",10,"favorable"),{votes:4,entered:4,error:null});
 assert.deepEqual(validateBchVoteEntry("4",10,"against"),{votes:6,entered:4,error:null});
 assert.equal(ballotPercentage(validateBchVoteEntry("4",10,"against").votes,10),60);
 assert.equal(validateBchVoteEntry("10",10,"against").votes,0);
 assert.equal(validateBchVoteEntry("0",10,"against").votes,10);
 assert.equal(validateBchVoteEntry("",10,"against").votes,null);
});
test("invalid vote modes and counts fail closed rather than writing a misleading result",()=>{
 for(const val of ["11","-1","2.5"," 3","1e1",[],{}])
  assert.ok(validateBchVoteEntry(val,10,"against").error,JSON.stringify(val));
 assert.ok(validateBchVoteEntry(4,null,"against").error);
 assert.ok(validateBchVoteEntry(4,10,"invalid").error);
 assert.equal(validateBchVoteEntry(null,10,"against").votes,null);
});

test("ranking is by actual unrounded percentage; blanks are last with stable tie order",()=>{
 const ranked=sortBchBallotsByPercentage([
  ...candidates,candidate("e","E",null,5)
 ],10);
 assert.deepEqual(ranked.map(x=>x.id),["a","b","c","d","e"]);
 assert.deepEqual(candidates.map(c=>c.id),["a","c","b","d"],"do not mutate source order");
 const near=sortBchBallotsByPercentage([
  candidate("low","Lower",100000,1),candidate("high","Higher",100001,2)
 ],1000000);
 assert.equal(near[0].id,"high","do not compare rounded 2-decimal percentages");
});

test("new committee chooses exactly N highest-vote candidates and signals cutoff ties",()=>{
 const result=selectNewBchMembers(candidates,10,"2");
 assert.equal(result.error,null);
 assert.deepEqual(result.members.map(c=>c.id),["a","b"]);
 assert.equal(result.cutoffTie,true);
 const three=selectNewBchMembers(candidates,10,"3");
 assert.deepEqual(three.members.map(c=>c.id),["a","b","c"]);
 assert.equal(three.cutoffTie,false);
 const all=selectNewBchMembers(candidates,10,"4");
 assert.equal(all.members.length,4);
 assert.equal(all.members[3].votes_received,0);
});
test("do not announce an incomplete or impossible BCH slate",()=>{
 for(const size of ["",0,-1,1.5,"2.5","foo",5,100])
  assert.ok(selectNewBchMembers(candidates,10,size).error,String(size));
 assert.ok(selectNewBchMembers(candidates,null,2).error);
 assert.ok(selectNewBchMembers([...candidates,candidate("e","E",null)],10,2).error);
 assert.ok(selectNewBchMembers([],10,1).error);
});
test("ballot editor, percentage sorting and read-only launch UI are wired to the same tally",()=>{
 const editor=readFileSync(new URL("../src/components/bch-ballot-editor.tsx",import.meta.url),"utf8");
 const page=readFileSync(new URL("../src/components/bch-ballots-client.tsx",import.meta.url),"utf8");
 const launch=readFileSync(new URL("../src/components/bch-new-committee-launch.tsx",import.meta.url),"utf8");
 assert.match(editor,/option value="against">Phiếu ngược/);
 assert.match(editor,/validateBchVoteEntry\(draft,total,mode\)/);
 assert.match(editor,/vote_mode:mode,entered_votes:checked.entered/);
 assert.match(page,/sortBchBallotsByPercentage\(filtered,total\)/);
 assert.match(page,/BchNewCommitteeLaunch/);
 assert.match(launch,/selectNewBchMembers\(candidates,total,countInput\)/);
 assert.match(launch,/members\.map\(/);
});
