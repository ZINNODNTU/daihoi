import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {validateBchVotes} from "../src/lib/bch-candidates.ts";
const src=readFileSync(new URL("../src/app/api/bch-candidates/ballots/route.ts",import.meta.url),"utf8");
const js=ts.transpileModule(src,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true
}}).outputText;
const congress="79e7f633-e824-4a9d-ba25-d0fa59349a26";
const candidate="b3333333-3333-4333-8333-333333333333";
const user="123e4567-e89b-42d3-a456-426614174000";
const state={loggedIn:true,read:true,write:true,kind:"doan",total:75,
 timestamp:"2026-11-12T08:10:00.000Z",votes:null,calls:[],logs:[],error:null};
const userDb={from(table){
 if(table==="congresses")return {select:()=>({eq:(_,id)=>({
  maybeSingle:async()=>({data:id===congress?{kind:state.kind,bch_total_ballots:state.total}:null,error:null})
 })})};
 throw Error("Unexpected user DB "+table);
}};
const admin={
 from(table){
  if(table!=="bch_candidates")throw Error("Unexpected admin table "+table);
  return {select:()=>({eq:()=>({order:()=>({order:()=>({
   limit:async()=>({data:[{id:candidate,full_name:"Nguyễn Văn A",votes_received:state.votes,total_ballots:state.total,display_order:1,updated_at:state.timestamp}],error:null})
  })})})})};
 },
 async rpc(name,args){
  state.calls.push({name,args});
  if(state.error)return {data:null,error:{code:state.error}};
  if(args.p_expected_updated_at!==state.timestamp)return {data:null,error:{code:"40001"}};
  if(args.p_votes!==null&&(args.p_votes>state.total||args.p_votes<0))
   return {data:null,error:{code:"23514"}};
  state.votes=args.p_votes;
  state.timestamp="2026-11-12T08:11:00.000Z";
  return {data:{id:candidate,congress_id:congress,votes_received:state.votes,
   total_ballots:state.votes===null?null:state.total,updated_at:state.timestamp},error:null};
 }
};
const mocks={
 "next/server":{NextResponse:{json:(body,options={})=>new Response(JSON.stringify(body),{
  status:options.status??200,headers:{"Content-Type":"application/json",...options.headers}
 })}},
 "@/lib/auth":{getAuth:async()=>({supabase:userDb,user:state.loggedIn?{id:user}:null}),
  hasCongressAbility:async(_db,_id,_congress,ability)=>ability==="ballots.read"?state.read:state.write},
 "@/lib/supabase/admin":{createAdminClient:()=>admin},
 "@/lib/bch-candidates":{validateBchVotes},
 "@/lib/system-log":{writeSystemLog:async item=>{state.logs.push(item);}}
};
const m={exports:{}};
new Function("require","module","exports",js)(name=>{
 if(name in mocks)return mocks[name];
 throw Error("Unexpected dependency "+name);
},m,m.exports);
const {GET,PATCH}=m.exports;
function reset(){
 Object.assign(state,{loggedIn:true,read:true,write:true,kind:"doan",total:75,
  timestamp:"2026-11-12T08:10:00.000Z",votes:null,calls:[],logs:[],error:null});
}
const submit=(extra={},origin="https://test.local")=>PATCH(new Request(
 "https://test.local/api/bch-candidates/ballots",{
  method:"PATCH",headers:{"content-type":"application/json","host":"test.local",origin},
  body:JSON.stringify({congressId:congress,id:candidate,
   expectedUpdatedAt:state.timestamp,...extra})
 }));
test("private tally updates via service-only RPC and records an audit log",async()=>{
 reset();
 const response=await submit({votes_received:60});
 assert.equal(response.status,200);
 assert.equal((await response.json()).candidate.votes_received,60);
 assert.equal(state.calls[0].name,"set_bch_candidate_votes_v58");
 assert.equal(state.calls[0].args.p_congress_id,congress);
 assert.equal(state.calls[0].args.p_votes,60);
 assert.equal(state.logs[0].event,"bch.ballot_updated");
 assert.equal(response.headers.get("Cache-Control"),"private, no-store");
});
test("anonymous, denied, foreign-origin and other congress kinds cannot write",async()=>{
 reset();state.loggedIn=false;
 assert.equal((await submit({votes_received:60})).status,401);
 state.loggedIn=true;state.write=false;
 assert.equal((await submit({votes_received:60})).status,403);
 state.write=true;
 assert.equal((await submit({votes_received:60},"https://evil.test")).status,403);
 state.kind="hoi_sinh_vien";
 assert.equal((await submit({votes_received:60})).status,400);
 assert.equal(state.calls.length,0);
});
test("out-of-range votes, stale versions and SQL conflicts are rejected",async()=>{
 reset();
 assert.equal((await submit({votes_received:76})).status,400);
 assert.equal((await submit({votes_received:-1})).status,400);
 const timestamp=state.timestamp;
 assert.equal((await submit({votes_received:50})).status,200);
 assert.equal((await submit({votes_received:65,expectedUpdatedAt:timestamp})).status,409);
 state.error="23514";
 assert.equal((await submit({votes_received:60})).status,409);
});
test("clearing votes only touches the candidate tally and does not delete profiles",async()=>{
 reset();
 assert.equal((await submit({votes_received:60})).status,200);
 assert.equal((await submit({votes_received:null})).status,200);
 assert.equal(state.votes,null);
 assert.equal(state.calls.length,2);
});
test("GET requires ballots.read and returns only scoped private ballot fields",async()=>{
 reset();
 const response=await GET(new Request("https://test.local/api/bch-candidates/ballots?congressId="+congress));
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.total_ballots,75);
 assert.equal(data.candidates.length,1);
 state.read=false;
 assert.equal((await GET(new Request("https://test.local/api/bch-candidates/ballots?congressId="+congress))).status,403);
});
