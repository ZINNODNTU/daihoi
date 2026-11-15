import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const load=(path,mocks)=>{
 const js=ts.transpileModule(read(path),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true
 }}).outputText;
 const output={exports:{}};
 new Function("require","module","exports",js)(key=>{
  if(key in mocks)return mocks[key];
  throw Error("Unmocked dependency: "+key);
 },output,output.exports);
 return output.exports;
};
const A="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const D="11111111-1111-4111-8111-111111111111";
const U="22222222-2222-4222-8222-222222222222";
const ADMIN="33333333-3333-4333-8333-333333333333";
const picture=A+"/"+D+".jpg";
const reply={json:(body,config={})=>new Response(JSON.stringify(body),{
 status:config.status||200,headers:{"Content-Type":"application/json",...config.headers}
})};
function mock(){
 const state={admin:ADMIN,allowed:true,delegate:{
  id:D,congress_id:A,code:"DB-000075",full_name:"Nguyễn Thị Liệu",
  is_active:true,auth_user_id:U,photo_path:picture
 },checkins:0,votes:0,links:0,otherProfiles:0,otherMemberships:0,
  memberRole:"guest",staffRoles:false,btc:false,profileRole:"user",
  authAllowed:true,authDeletes:0,photosCleaned:[],updates:[],events:[],
  accountRemoved:false,recordRemoved:false};
 const db={from(table){
  const query={table,filters:[],patch:null,remove:false,
   select(){return this;},
   eq(field,value){this.filters.push(["eq",field,value]);return this;},
   neq(field,value){this.filters.push(["neq",field,value]);return this;},
   in(field,values){this.filters.push(["in",field,values]);return this;},
   is(field,value){this.filters.push(["is",field,value]);return this;},
   update(value){this.patch=value;return this;},
   delete(){this.remove=true;return this;},
   async maybeSingle(){
    const current=state.delegate;
    if(table==="delegates"){
     if(this.remove){state.recordRemoved=true;return {data:{id:D},error:null};}
     if(this.patch){Object.assign(current,this.patch);
      state.updates.push(this.patch);return {data:{id:D},error:null};}
     return {data:state.recordRemoved?null:{...current},error:null};
    }
    if(table==="profiles")return {data:{platform_role:state.profileRole},error:null};
    if(table==="congress_members")return {data:state.memberRole?{role:state.memberRole}:null,error:null};
    throw Error("Unexpected maybeSingle "+table);
   },
   async limit(){
    if(table==="congress_members")
     return {data:state.staffRoles?[{role:"admin",congress_id:B}]:
      state.memberRole?[{role:state.memberRole,congress_id:A}]:[],error:null};
    if(table==="btc_accounts")return {data:state.btc?[{user_id:U}]:[],error:null};
    return {data:[],error:null};
   },
   then(resolve,reject){
    let data=null,count=null;
    if(table==="checkins")count=state.checkins;
    else if(table==="votes")count=state.votes;
    else if(table==="delegates"&&this.filters.some(([method,field])=>method==="neq"&&field==="id"))
     count=state.links;
    else if(table==="delegates")count=state.otherProfiles;
    if(this.remove&&table==="congress_members"){
     state.accountRemoved=true;data={};
    }
    return Promise.resolve({data,error:null,count}).then(resolve,reject);
   }
  };
  return query;
 },auth:{admin:{
  deleteUser:async()=>{state.authDeletes++;return {error:null};}
 }}};
 const auth={
  getAuth:async()=>({supabase:{},user:state.admin?{id:state.admin}:null}),
  hasCongressAbility:async(_c,_actor,congress,ability)=>state.allowed&&congress===A&&ability==="delegates.write"
 };
 const mocks={
  "next/server":{NextResponse:reply},
  "@/lib/auth":auth,
  "@/lib/supabase/admin":{createAdminClient:()=>db},
  "@/lib/portrait-policy":{
   delegatePortraitKey:(congress,id)=>congress+"/"+id+".jpg",
   sharedPortraitKey:(id)=>"people/"+id+".jpg"
  },
  "@/lib/portrait-storage":{removeUnreferencedPortrait:async(key)=>state.photosCleaned.push(key)},
  "@/lib/system-log":{writeSystemLog:async event=>state.events.push(event)},
  "@/lib/delegate-auth-cleanup":{canDeleteOrphanDelegateAuth:async()=>({
   allowed:state.authAllowed,reason:state.authAllowed?"":"Protected other congress data"
  })}
 };
 const records=load("src/app/api/delegates/remove/route.ts",mocks);
 const accounts=load("src/app/api/delegates/accounts/remove/route.ts",mocks);
 const remove=()=>records.POST(new Request("https://test.local/api/delegates/remove",{
  method:"POST",headers:{"Host":"test.local","Origin":"https://test.local","Content-Type":"application/json"},
  body:JSON.stringify({congressId:A,delegateId:D,confirmCode:"DB-000075"})
 }));
 const unlink=(deleteOrphanAuth=true)=>accounts.POST(new Request("https://test.local/api/delegates/accounts/remove",{
  method:"POST",headers:{"Host":"test.local","Origin":"https://test.local","Content-Type":"application/json"},
  body:JSON.stringify({congressId:A,delegateId:D,confirmCode:"DB-000075",deleteOrphanAuth})
 }));
 return {state,remove,unlink};
}

test("deleting delegate affects only chosen congress and does not delete Supabase Auth",async()=>{
 const {state,remove}=mock();
 const response=await remove();
 assert.equal(response.status,200);
 assert.equal((await response.json()).authPreserved,true);
 assert.equal(state.recordRemoved,true);
 assert.equal(state.authDeletes,0);
 assert.deepEqual(state.photosCleaned,[picture]);
 assert.equal(state.events[0].event,"delegate.deleted");
});

test("deleting an attendee or voter, or a portrait used in another congress, fails closed",async()=>{
 for(const [key,value] of [["checkins",1],["votes",1],["links",1]]){
  const {state,remove}=mock();state[key]=value;
  const response=await remove();
  assert.equal(response.status,409,key);
  assert.equal(state.recordRemoved,false);
  assert.equal(state.authDeletes,0);
 }
});

test("delegate deletion rejects unauthorized BTC and deleting own record",async()=>{
 const {state,remove}=mock();state.allowed=false;
 assert.equal((await remove()).status,403);
 assert.equal(state.recordRemoved,false);
 state.allowed=true;state.admin=U;
 assert.equal((await remove()).status,403);
});

test("account removal detaches only that congress; preserves Auth still in use",async()=>{
 const {state,unlink}=mock();
 state.otherProfiles=1;
 const response=await unlink();
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.unlinked,true);
 assert.equal(body.authDeleted,false);
 assert.equal(state.delegate.auth_user_id,null);
 assert.equal(state.authDeletes,0);
 assert.equal(state.events[0].event,"delegate.account_revoked");
});

test("only fully orphaned system accounts can be deleted from Supabase Auth",async()=>{
 const {state,unlink}=mock();
 state.otherProfiles=0;state.authAllowed=true;
 const response=await unlink(true);
 assert.equal(response.status,200);
 assert.equal((await response.json()).authDeleted,true);
 assert.equal(state.authDeletes,1);
 assert.equal(state.accountRemoved,true);
});

test("account removal rejects staff roles, self action and cross-congress writes",async()=>{
 const env=mock();env.state.staffRoles=true;
 assert.equal((await env.unlink()).status,403);
 const self=mock();self.state.admin=U;
 assert.equal((await self.unlink()).status,403);
 const notAllowed=mock();notAllowed.state.allowed=false;
 assert.equal((await notAllowed.unlink()).status,403);
 assert.equal(notAllowed.state.delegate.auth_user_id,U);
});

test("delete buttons require typed code; account removal is distinct from deleting delegate",()=>{
 const list=read("src/components/delegates-client.tsx");
 const accounts=read("src/components/delegate-accounts-client.tsx");
 const endpoint=read("src/app/api/delegates/remove/route.ts");
 const remove=read("src/app/api/delegates/accounts/remove/route.ts");
 assert.match(list,/Xóa hồ sơ đại biểu/);
 assert.match(list,/deleteCode!==deleteTarget.code/);
 assert.match(list,/\/api\/delegates\/remove/);
 assert.match(accounts,/Xóa tài khoản/);
 assert.match(accounts,/removeCode!==removeTarget.code/);
 assert.match(accounts,/\/api\/delegates\/accounts\/remove/);
 assert.match(remove,/canDeleteOrphanDelegateAuth/);
 assert.match(remove,/\.update\(\{auth_user_id:null/);
 assert.match(endpoint,/\.eq\("delegate_id",delegateId\)/);
 assert.match(endpoint,/delegatePortraitKey\(congressId,delegateId\)/);
});

test("photo link action appears only with a verified candidate from another congress, with portrait and identity details",()=>{
 const page=read("src/app/congresses/[id]/delegates/page.tsx");
 const ui=read("src/components/delegates-client.tsx");
 const api=read("src/app/api/delegates/photo-links/route.ts");
 const preview=read("src/app/api/delegates/photo-links/preview/route.ts");
 assert.match(page,/availableDelegatePortraitLinks\(/);
 assert.match(page,/linkableIds=\{linkableIds\}/);
 assert.match(ui,/linkable.has\(d.id\)/);
 assert.match(ui,/source.fullName/);
 assert.match(ui,/source.congressName/);
 assert.match(ui,/source.studentId/);
 assert.match(ui,/photo-links\/preview/);
 assert.match(api,/fullName:source.full_name/);
 assert.match(preview,/hasCongressAbility\(supabase,user.id,congressId,"delegates.write"\)/);
 assert.match(preview,/canReuseDelegatePortrait\(target,source\)/);
 assert.match(preview,/hasCongressAbility\(supabase,user.id,source.congress_id,"delegates.read"\)/);
});
