import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {validateManualBchBallots} from "../src/lib/bch-candidates.ts";
import {canCongress} from "../src/lib/congress-permissions.ts";

const file=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const code=ts.transpileModule(file("src/app/api/bch-candidates/ballots/route.ts"),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
}).outputText;
const congress="79e7f633-e824-4a9d-ba25-d0fa59349a26";
const candidate="b3333333-3333-4333-8333-333333333333";
const user="123e4567-e89b-42d3-a456-426614174000";
const state={loggedIn:true,role:"admin",kind:"doan",timestamp:"2026-11-12T08:10:00.000Z",
 votes:null,total:null,updates:[],logs:[],error:null};
const db={
 from(table){
  if(table==="congresses")return {select:()=>({eq:(_,id)=>({
   maybeSingle:async()=>({data:id===congress?{kind:state.kind}:null,error:null})
  })})};
  if(table==="bch_candidates")return {update:values=>({
   eq:(_key,scope)=>({
    eq:(_key2,id)=>({
     eq:(_key3,timestamp)=>({
      select:()=>({
       maybeSingle:async()=>{
        if(state.error)return {data:null,error:{code:state.error}};
        if(scope!==congress||id!==candidate||timestamp!==state.timestamp)
         return {data:null,error:null};
        state.updates.push(values);
        state.votes=values.votes_received;
        state.total=values.total_ballots;
        state.timestamp=values.updated_at;
        return {data:{id:candidate,congress_id:congress,
         votes_received:state.votes,total_ballots:state.total,
         updated_at:state.timestamp},error:null};
       }
      })
     })
    })
   })
  })};
  throw Error("Unexpected DB table "+table);
 }
};
const mocks={
 "next/server":{NextResponse:{json:(body,config={})=>new Response(JSON.stringify(body),{
  status:config.status??200,headers:{"Content-Type":"application/json",...config.headers}
 })}},
 "@/lib/auth":{getAuth:async()=>({supabase:db,user:state.loggedIn?{id:user}:null}),
  getCongressRole:async()=>state.role},
 "@/lib/congress-permissions":{canCongress},
 "@/lib/bch-candidates":{validateManualBchBallots},
 "@/lib/system-log":{writeSystemLog:async log=>{state.logs.push(log);}}
};
const box={exports:{}};
new Function("require","module","exports",code)(name=>{
 if(name in mocks)return mocks[name];
 throw Error("Unexpected import "+name);
},box,box.exports);
const {PATCH}=box.exports;
const reset=()=>{
 state.loggedIn=true;state.role="admin";state.kind="doan";state.timestamp="2026-11-12T08:10:00.000Z";
 state.votes=null;state.total=null;state.updates=[];state.logs=[];state.error=null;
};
const submit=(body={},origin="https://test.local")=>PATCH(new Request(
 "https://test.local/api/bch-candidates/ballots",{
 method:"PATCH",headers:{"content-type":"application/json","host":"test.local","origin":origin},
 body:JSON.stringify({congressId:congress,id:candidate,expectedUpdatedAt:state.timestamp,...body})
}));
test("backend PATCH persists exactly two tally fields and timestamp, not BCH biography",async()=>{
 reset();
 const response=await submit({votes_received:175,total_ballots:190});
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.candidate.votes_received,175);
 assert.equal(body.candidate.total_ballots,190);
 assert.deepEqual(Object.keys(state.updates[0]).sort(),["total_ballots","updated_at","votes_received"]);
 assert.equal(state.logs.length,1);
 assert.equal(state.logs[0].event,"bch.ballot_updated");
 assert.equal(response.headers.get("Cache-Control"),"private, no-store");
});

test("rejects anonymous/secretary/checkin/foreign-origin and unrelated congress without writes",async()=>{
 reset();state.loggedIn=false;
 assert.equal((await submit({votes_received:50,total_ballots:60})).status,401);
 state.loggedIn=true;state.role="secretary";
 assert.equal((await submit({votes_received:50,total_ballots:60})).status,403);
 state.role="checkin";
 assert.equal((await submit({votes_received:50,total_ballots:60})).status,403);
 state.role="admin";
 assert.equal((await submit({votes_received:50,total_ballots:60},"https://evil.local")).status,403);
 state.kind="hoi_sinh_vien";
 assert.equal((await submit({votes_received:50,total_ballots:60})).status,400);
 assert.equal(state.updates.length,0);
});

test("rejects invalid values and stale updates; never silently overwrites existing results",async()=>{
 reset();
 assert.equal((await submit({votes_received:90,total_ballots:80})).status,400);
 assert.equal((await submit({votes_received:90,total_ballots:""})).status,400);
 const oldTimestamp=state.timestamp;
 assert.equal((await submit({votes_received:50,total_ballots:100})).status,200);
 const stale=await submit({votes_received:99,total_ballots:100,expectedUpdatedAt:oldTimestamp});
 assert.equal(stale.status,409);
 assert.equal(state.updates.length,1);
 assert.equal(state.votes,50);
});

test("clearing both counts writes null values without deleting BCH profile",async()=>{
 reset();
 assert.equal((await submit({votes_received:175,total_ballots:190})).status,200);
 assert.equal((await submit({votes_received:null,total_ballots:null})).status,200);
 assert.equal(state.votes,null);
 assert.equal(state.total,null);
 assert.equal(state.updates.length,2);
});
