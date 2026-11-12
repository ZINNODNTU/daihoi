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
const state={loggedIn:true,allowed:true,kind:"doan",total:190,
 timestamp:"2026-11-12T08:10:00.000Z",votes:null,updates:[],logs:[],error:null};
const db={from(table){
 if(table==="congresses")return {select:()=>({eq:(_,id)=>({
  maybeSingle:async()=>({data:id===congress?{kind:state.kind,bch_total_ballots:state.total}:null,error:null})
 })})};
 if(table==="bch_candidates")return {update:values=>({
  eq:(_key,scope)=>({eq:(_key2,id)=>({eq:(_key3,timestamp)=>({
   select:()=>({maybeSingle:async()=>{
    if(state.error)return {data:null,error:{code:state.error}};
    if(scope!==congress||id!==candidate||timestamp!==state.timestamp)return {data:null,error:null};
    state.updates.push(values);
    state.votes=values.votes_received;
    state.timestamp=values.updated_at;
    return {data:{id:candidate,congress_id:congress,
     votes_received:values.votes_received,total_ballots:values.total_ballots,
     updated_at:state.timestamp},error:null};
   }})
  })})})
 })};
 throw Error("Unexpected DB table "+table);
}};
const mocks={
 "next/server":{NextResponse:{json:(body,options={})=>new Response(JSON.stringify(body),{
  status:options.status??200,headers:{"Content-Type":"application/json",...options.headers}
 })}},
 "@/lib/auth":{getAuth:async()=>({supabase:db,user:state.loggedIn?{id:user}:null}),
  hasCongressAbility:async()=>state.allowed},
 "@/lib/bch-candidates":{validateBchVotes},
 "@/lib/system-log":{writeSystemLog:async log=>{state.logs.push(log);}}
};
const moduleBox={exports:{}};
new Function("require","module","exports",js)(name=>{
 if(name in mocks)return mocks[name];
 throw Error("Unexpected module "+name);
},moduleBox,moduleBox.exports);
const {PATCH}=moduleBox.exports;
function reset(){
 Object.assign(state,{loggedIn:true,allowed:true,kind:"doan",total:190,
  timestamp:"2026-11-12T08:10:00.000Z",votes:null,updates:[],logs:[],error:null});
}
const submit=(payload={},origin="https://test.local")=>PATCH(new Request(
 "https://test.local/api/bch-candidates/ballots",{
  method:"PATCH",headers:{"content-type":"application/json","host":"test.local",origin},
  body:JSON.stringify({congressId:congress,id:candidate,expectedUpdatedAt:state.timestamp,...payload})
 }));
test("candidate tally updates only one votes count and denormalizes the shared total",async()=>{
 reset();
 const response=await submit({votes_received:175});
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.candidate.votes_received,175);
 assert.equal(body.candidate.total_ballots,190);
 assert.deepEqual(Object.keys(state.updates[0]).sort(),["total_ballots","updated_at","votes_received"]);
 assert.equal(state.logs[0].event,"bch.ballot_updated");
 assert.equal(response.headers.get("Cache-Control"),"private, no-store");
});
test("nonstaff, denied, other origins and non-Đoàn congress cannot mutate counts",async()=>{
 reset();state.loggedIn=false;
 assert.equal((await submit({votes_received:50})).status,401);
 state.loggedIn=true;state.allowed=false;
 assert.equal((await submit({votes_received:50})).status,403);
 state.allowed=true;
 assert.equal((await submit({votes_received:50},"https://evil.local")).status,403);
 state.kind="hoi_sinh_vien";
 assert.equal((await submit({votes_received:50})).status,400);
 assert.equal(state.updates.length,0);
});
test("invalid candidate votes and stale updates are rejected",async()=>{
 reset();
 assert.equal((await submit({votes_received:191})).status,400);
 assert.equal((await submit({votes_received:-1})).status,400);
 const old=state.timestamp;
 assert.equal((await submit({votes_received:50})).status,200);
 assert.equal((await submit({votes_received:99,expectedUpdatedAt:old})).status,409);
 assert.equal(state.updates.length,1);
 assert.equal(state.votes,50);
});
test("clearing one candidate votes leaves its personnel profile intact",async()=>{
 reset();
 assert.equal((await submit({votes_received:175})).status,200);
 assert.equal((await submit({votes_received:null})).status,200);
 assert.equal(state.votes,null);
 assert.equal(state.updates[1].total_ballots,null);
 assert.equal(state.updates.length,2);
});
