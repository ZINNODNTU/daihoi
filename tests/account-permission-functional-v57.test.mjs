import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {
 canCongress,canCustomizeCongressAbility,isAccountPermissionAbility
} from "../src/lib/congress-permissions.ts";

const source=readFileSync(new URL("../src/app/api/congress-members/permissions/route.ts",import.meta.url),"utf8");
const js=ts.transpileModule(source,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
}}).outputText;
const congress="aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const target="bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const actor="cccccccc-cccc-4ccc-cccc-cccccccccccc";
const state={role:"admin",actor,authorized:true,enabled:true,member:true,primary:false,actorPlatformRole:"user",
 overrides:[],calls:[],logs:[],error:null};
function chain(table){
 const q={
  select(){return q;},eq(){return q;},is(){return q;},
  in(){return q;},order(){return q;},limit(){return q;},
  async maybeSingle(){
   if(table==="btc_accounts")return {data:state.enabled?{user_id:target,is_primary:state.primary}:null,error:state.error};
   if(table==="profiles")return {data:{platform_role:state.actorPlatformRole},error:state.error};
   if(table==="congress_members")return {data:state.member?{role:state.role}:null,error:state.error};
   throw Error("Unexpected table "+table);
  },
  then(ok,fail){return Promise.resolve({
   data:table==="btc_account_capability_restrictions"?state.overrides:[],error:state.error
  }).then(ok,fail);}
 };
 return q;
}
const admin={
 from(table){return chain(table);},
 async rpc(name,args){
  state.calls.push({name,args});
  if(state.error)return {data:null,error:{code:state.error}};
  return {data:{updated:args.p_changes.length,changes:args.p_changes},error:null};
 }
};
const mocks={
 "next/server":{NextResponse:{json:(body,options={})=>new Response(JSON.stringify(body),{
  status:options.status??200,headers:{"Content-Type":"application/json",...options.headers}
 })}},
 "@/lib/auth":{getAuth:async()=>({supabase:{},user:state.actor?{id:state.actor}:null}),
  hasCongressAbility:async()=>state.authorized},
 "@/lib/supabase/admin":{createAdminClient:()=>admin},
 "@/lib/congress-permissions":{canCongress,canCustomizeCongressAbility,isAccountPermissionAbility},
 "@/lib/system-log":{writeSystemLog:async item=>{state.logs.push(item);}}
};
const m={exports:{}};
new Function("require","module","exports",js)(name=>{
 if(name in mocks)return mocks[name];
 throw Error("Unexpected dependency "+name);
},m,m.exports);
const {GET,PATCH,PUT}=m.exports;
const reset=()=>Object.assign(state,{role:"admin",actor,authorized:true,
 enabled:true,member:true,primary:false,actorPlatformRole:"user",overrides:[],calls:[],logs:[],error:null});
const patch=(payload={},origin="https://test.local")=>PATCH(new Request(
 "https://test.local/api/congress-members/permissions",{
  method:"PATCH",headers:{"Content-Type":"application/json",host:"test.local",origin},
  body:JSON.stringify({congressId:congress,userId:target,...payload})
 }));
const save=(changes)=>PUT(new Request("https://test.local/api/congress-members/permissions",{
 method:"PUT",headers:{"Content-Type":"application/json",host:"test.local",origin:"https://test.local"},
 body:JSON.stringify({congressId:congress,userId:target,changes})
}));
test("admin can change one permission using service-only audited RPC",async()=>{
 reset();
 const resp=await patch({ability:"bch.write",allowed:false});
 assert.equal(resp.status,200);
 assert.equal(state.calls.length,1);
 assert.equal(state.calls[0].name,"set_btc_account_permissions_v58");
 assert.deepEqual(state.calls[0].args.p_changes,[{ability:"bch.write",allowed:false}]);
 assert.equal(state.calls[0].args.p_user_id,target);
 assert.equal(state.logs[0].event,"btc.permissions_changed");
});
test("anonymous, unauthorized, self-change, foreign origin cannot change permissions",async()=>{
 reset();state.actor=null;
 assert.equal((await patch({ability:"bch.write",allowed:false})).status,401);
 state.actor=actor;state.authorized=false;
 assert.equal((await patch({ability:"bch.write",allowed:false})).status,403);
 state.authorized=true;state.actor=target;
 assert.equal((await patch({ability:"bch.write",allowed:false})).status,409);
 state.actor=actor;
 assert.equal((await patch({ability:"bch.write",allowed:false},"https://other.test")).status,403);
 assert.equal(state.calls.length,0);
});
test("cannot elevate permanent privileges or grant outside role except isolated ballots",async()=>{
 reset();
 for(const ability of ["team.manage","settings.manage","system.logs"])
  assert.equal((await patch({ability,allowed:true})).status,400);
 state.role="secretary";
 assert.equal((await patch({ability:"bch.write",allowed:true})).status,409);
 assert.equal((await save([
  {ability:"ballots.read",allowed:true},{ability:"ballots.write",allowed:true}
 ])).status,200);
 assert.equal(state.calls.length,1);
});
test("candidate ballot write requires the read grant in the final permission set",async()=>{
 reset();state.role="secretary";
 assert.equal((await patch({ability:"ballots.write",allowed:true})).status,409);
 assert.equal((await save([
  {ability:"ballots.read",allowed:true},{ability:"ballots.write",allowed:true}
 ])).status,200);
});
test("only active same-congress BTC accounts can be changed, duplicates rejected",async()=>{
 reset();state.enabled=false;
 assert.equal((await patch({ability:"bch.write",allowed:false})).status,404);
 state.enabled=true;state.member=false;
 assert.equal((await patch({ability:"bch.write",allowed:false})).status,404);
 state.member=true;
 assert.equal((await save([
  {ability:"bch.write",allowed:false},{ability:"bch.write",allowed:true}
 ])).status,400);
 assert.equal(state.calls.length,0);
});
test("audit history is scoped to the selected BTC account and admin access",async()=>{
 reset();
 const res=await GET(new Request("https://test.local/api/congress-members/permissions?"+
  new URLSearchParams({congressId:congress,userId:target})));
 assert.equal(res.status,200);
 assert.deepEqual((await res.json()).history,[]);
});

test("Congress admin can manage other BTC staff; primary BTC still cannot edit their own privileges",async()=>{
 reset();state.role="checkin";state.primary=false;
 assert.equal((await patch({ability:"attendance.scan",allowed:false})).status,200);
 state.role="admin";state.primary=true;state.actor=target;state.actorPlatformRole="super_admin";
 assert.equal((await patch({ability:"bch.write",allowed:false})).status,409);
 assert.equal(state.calls.length,1);
});

test("Only a different Super Admin can edit operational permissions of the primary BTC administrator",async()=>{
 reset();state.primary=true;state.actorPlatformRole="user";
 const forbidden=await patch({ability:"bch.write",allowed:false});
 assert.equal(forbidden.status,403);
 assert.match((await forbidden.json()).error,/Super Admin/);
 assert.equal(state.calls.length,0);
 state.actorPlatformRole="super_admin";
 const updated=await save([{ability:"bch.write",allowed:false},{ability:"attendance.scan",allowed:false}]);
 assert.equal(updated.status,200);
 assert.equal(state.calls.length,1);
 assert.deepEqual(state.calls[0].args.p_changes,[
  {ability:"bch.write",allowed:false},{ability:"attendance.scan",allowed:false}
 ]);
 assert.equal(state.logs.length,1);
 const history=await GET(new Request("https://test.local/api/congress-members/permissions?"+
  new URLSearchParams({congressId:congress,userId:target})));
 assert.equal(history.status,200,"Super Admin can inspect primary BTC account audit log");
});

test("Primary BTC always retains congress entry and high-risk management abilities",async()=>{
 reset();state.primary=true;state.actorPlatformRole="super_admin";
 const locked=await save([{ability:"bch.write",allowed:false},
  {ability:"workspace.view",allowed:false}]);
 assert.equal(locked.status,409);
 assert.equal(state.calls.length,0,"rejected atomically: no partial RPC mutation");
 const reserved=await patch({ability:"team.manage",allowed:false});
 assert.equal(reserved.status,400,"critical team permissions are outside editable matrix");
 assert.equal(state.calls.length,0);
 const permitted=await patch({ability:"reports.read",allowed:false});
 assert.equal(permitted.status,200);
});
