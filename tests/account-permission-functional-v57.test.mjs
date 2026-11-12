import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {canCongress,isAccountPermissionAbility} from "../src/lib/congress-permissions.ts";

const path="../src/app/api/congress-members/permissions/route.ts";
const source=readFileSync(new URL(path,import.meta.url),"utf8");
const js=ts.transpileModule(source,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
}}).outputText;
const congress="aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const target="bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const actor="cccccccc-cccc-4ccc-cccc-cccccccccccc";
const state={role:"admin",actor:actor,authorized:true,enabled:true,member:true,
 rows:[],logs:[],error:null};
function chain(table){
 const filters={};
 const q={
  select(){return q;},
  eq(k,v){filters[k]=v;return q;},
  is(k,v){filters[k]=v;return q;},
  async maybeSingle(){
   if(table==="btc_accounts")return {data:state.enabled?{user_id:target}:null,error:state.error};
   if(table==="congress_members")return {data:state.member?{role:state.role}:null,error:state.error};
   throw Error("unexpected select "+table);
  },
  delete(){return q;},
  async upsert(record){state.rows.push({kind:"upsert",record});return {error:state.error};},
  then(resolve,reject){state.rows.push({kind:"delete",filters});return Promise.resolve({error:state.error}).then(resolve,reject);}
 };
 return q;
}
const admin={from(table){return chain(table);}};
const mocks={
 "next/server":{NextResponse:{json:(body,options={})=>new Response(JSON.stringify(body),{
  status:options.status??200,headers:{"Content-Type":"application/json",...options.headers}
 })}},
 "@/lib/auth":{getAuth:async()=>({supabase:{},user:state.actor?{id:state.actor}:null}),
  hasCongressAbility:async()=>state.authorized},
 "@/lib/supabase/admin":{createAdminClient:()=>admin},
 "@/lib/congress-permissions":{canCongress,isAccountPermissionAbility},
 "@/lib/system-log":{writeSystemLog:async data=>{state.logs.push(data);}}
};
const m={exports:{}};
new Function("require","module","exports",js)(name=>{
 if(name in mocks)return mocks[name];
 throw Error("Unexpected module "+name);
},m,m.exports);
const {PATCH}=m.exports;
const reset=()=>Object.assign(state,{role:"admin",actor:actor,authorized:true,
 enabled:true,member:true,rows:[],logs:[],error:null});
const submit=(payload,origin="https://test.local")=>PATCH(new Request("https://test.local/api/congress-members/permissions",{
 method:"PATCH",
 headers:{"Content-Type":"application/json",host:"test.local",origin},
 body:JSON.stringify({congressId:congress,userId:target,...payload})
}));
test("admin can deny and restore an eligible feature only on one BTC account",async()=>{
 reset();
 assert.equal((await submit({ability:"bch.write",allowed:false})).status,200);
 assert.equal(state.rows[0].kind,"upsert");
 assert.equal(state.rows[0].record.user_id,target);
 assert.equal(state.rows[0].record.congress_id,congress);
 assert.equal(state.rows[0].record.ability,"bch.write");
 assert.equal(state.rows[0].record.allowed,false);
 assert.equal(state.logs[0].event,"btc.account_permission_updated");
 assert.equal((await submit({ability:"bch.write",allowed:true})).status,200);
 assert.equal(state.rows[1].kind,"delete");
 assert.equal(state.rows[1].filters.user_id,target);
});
test("account permission endpoint rejects anonymous, unauthorized, self-change and foreign origin",async()=>{
 reset();state.actor=null;
 assert.equal((await submit({ability:"bch.write",allowed:false})).status,401);
 state.actor=actor;state.authorized=false;
 assert.equal((await submit({ability:"bch.write",allowed:false})).status,403);
 state.authorized=true;state.actor=target;
 assert.equal((await submit({ability:"bch.write",allowed:false})).status,409);
 state.actor=actor;
 assert.equal((await submit({ability:"bch.write",allowed:false},"https://external.example")).status,403);
 assert.equal(state.rows.length,0);
});
test("neither platform privilege management nor abilities outside role can be granted",async()=>{
 reset();
 for(const ability of ["team.manage","settings.manage","system.logs"]){
  assert.equal((await submit({ability,allowed:true})).status,400);
 }
 state.role="secretary";
 assert.equal((await submit({ability:"bch.write",allowed:true})).status,409);
 assert.equal(state.rows.length,0);
});
test("only enabled BTC account scoped to current congress can be changed",async()=>{
 reset();state.enabled=false;
 assert.equal((await submit({ability:"bch.write",allowed:false})).status,404);
 state.enabled=true;state.member=false;
 assert.equal((await submit({ability:"bch.write",allowed:false})).status,404);
 assert.equal(state.rows.length,0);
});
