import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateBchInput,bchWriteData,ballotPercentage,formatBallotPercentage} from "../src/lib/bch-candidates.ts";
const valid={
 full_name:"Trần Thị Mai",birth_year:2001,hometown:"Đồng Nai",ethnicity:"Kinh",
 education_level:"Đại học",union_join_year:2018,
 current_position:"Bí thư chi đoàn",display_order:1
};
const read=(p)=>readFileSync(new URL(p,import.meta.url),"utf8");
test("manual vote tallies are optional, paired, and do not change personnel validation",()=>{
 assert.equal(validateBchInput(valid,2026).data?.votes_received,null);
 assert.equal(validateBchInput({...valid,votes_received:"",total_ballots:""},2026).error,null);
 assert.equal(validateBchInput({...valid,votes_received:"175"},2026).data,null);
 assert.equal(validateBchInput({...valid,votes_received:"175",total_ballots:"190"},2026).data?.votes_received,175);
 assert.equal(validateBchInput({...valid,votes_received:"0",total_ballots:"190"},2026).error,null);
});
test("reject invalid denominators and counts without coercion",()=>{
 for(const pair of [["190","0"],["191","190"],["-1","190"],["1.5","190"],
  ["1e2","190"],["1","-2"],["1","1000001"],["1",""],["","190"],[" ","190"]]){
  assert.notEqual(validateBchInput({...valid,votes_received:pair[0],total_ballots:pair[1]},2026).error,null,pair.join("/"));
 }
});
test("legacy updates preserve personnel and never force the new tally columns",()=>{
 const data=validateBchInput({...valid,votes_received:"40",total_ballots:"50"},2026).data;
 assert.ok(data);
 assert.equal(bchWriteData(data,false).full_name,"Trần Thị Mai");
 assert.equal("votes_received" in bchWriteData(data,false),false);
 assert.equal(bchWriteData(data,true).total_ballots,50);
});
test("percent is correct, locale formatted, and stays undefined until tally",()=>{
 assert.equal(ballotPercentage(175,190),175/190*100);
 assert.equal(formatBallotPercentage(175,190),"92,11%");
 assert.equal(formatBallotPercentage(0,190),"0,00%");
 assert.equal(ballotPercentage(0,0),null);
 assert.equal(ballotPercentage(190,175),null);
 assert.equal(formatBallotPercentage(null,null),"—");
});
test("BCH ballot migration preserves RLS and checks counts in the database",()=>{
 const sql=read("../supabase/upgrade-bch-ballot-results-v47.sql");
 assert.match(sql,/ADD COLUMN IF NOT EXISTS votes_received integer/i);
 assert.match(sql,/ADD COLUMN IF NOT EXISTS total_ballots integer/i);
 assert.match(sql,/votes_received<=total_ballots/);
 assert.match(sql,/votes_received IS NULL AND total_ballots IS NULL/);
 assert.doesNotMatch(sql,/GRANT\s+.*\b(?:anon|PUBLIC)\b/i);
});
test("Tally is strictly separate from personnel, delegates only receive introductory fields",()=>{
 const page=read("../src/app/congresses/[id]/bch-candidates/page.tsx");
 const api=read("../src/app/api/bch-candidates/route.ts");
 const delegate=read("../src/app/my-card/bch/page.tsx");
 const admin=read("../src/components/bch-candidates-client.tsx");
 const ballot=read("../src/app/congresses/[id]/ballots/page.tsx");
 const ballotApi=read("../src/app/api/bch-candidates/ballots/route.ts");
 assert.match(page,/congressKind=/);
 assert.doesNotMatch(page,/BALLOT_FIELDS|ballotReady=|votes_received/);
 assert.match(api,/PUBLIC_BCH_FIELDS/);
 assert.doesNotMatch(api,/\.select\(\)/);
 assert.doesNotMatch(delegate,/votes_received|total_ballots/);
 assert.doesNotMatch(admin,/formatBallotPercentage|BchBallotEditor/);
 assert.match(ballot,/ballots\.read/);
 assert.match(ballotApi,/votes_received,total_ballots/);
 assert.match(ballotApi,/hasCongressAbility\(supabase,user\.id,congressId,"ballots\.read"\)/);
});
