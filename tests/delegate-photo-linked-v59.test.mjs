import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const file=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
function load(path,imports){
 const js=ts.transpileModule(file(path),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true
 }}).outputText;
 const box={exports:{}};
 new Function("require","module","exports",js)(name=>{
  if(name in imports)return imports[name];
  throw Error("Unexpected module "+name);
 },box,box.exports);
 return box.exports;
}
const policy=load("src/lib/portrait-policy.ts",{});
const A="79e7f633-e824-4a9d-ba25-d0fa59349a26";
const B="e84231e2-6320-4a2a-ad81-ee5c16511b3d";
const UID="118d40e8-08e6-47d8-9961-a08d45148a9d";
const OTHER="2d4cbb23-1e77-4f11-a156-fd445c56f0d4";
const SOURCE="3d8301cc-84a3-4aba-ae64-5ce3199267db";
const TARGET="40aca00f-8031-4321-ab53-6fa5799380dd";
const legacy=policy.delegatePortraitKey(A,SOURCE);
const people=[{id:SOURCE,congress_id:A,auth_user_id:UID,photo_path:legacy,is_active:true},
 {id:TARGET,congress_id:B,auth_user_id:UID,photo_path:legacy,is_active:true}];
const state={viewer:UID,staff:false,photos:people,files:[],cleanups:[],updates:[]};
function database(){
 return {
  from(table){
   if(table!=="delegates")throw Error("Unexpected table "+table);
   const filters={};let updating=null;
   const q={
    select(){return q;},
    eq(key,value){filters[key]=value;return q;},
    async maybeSingle(){return {data:state.photos.find(row=>
     Object.entries(filters).every(([key,value])=>row[key]===value))||null,error:null};},
    async limit(){return {data:state.photos.filter(row=>
     Object.entries(filters).every(([key,value])=>row[key]===value)),error:null};},
    update(value){updating=value;return q;},
    then(resolve,reject){
     const matches=state.photos.filter(row=>
      Object.entries(filters).every(([key,value])=>row[key]===value));
     for(const row of matches)Object.assign(row,updating);
     state.updates.push({filters,updated:matches.length,values:updating});
     return Promise.resolve({data:matches.map(row=>({id:row.id})),error:null}).then(resolve,reject);
    }
   };
   return q;
  }
 };
}
const mockDb=database();
const mocks={
 "next/server":{NextResponse:{json:(body,options={})=>new Response(JSON.stringify(body),{
  status:options.status||200,headers:{"Content-Type":"application/json",...options.headers}
 })}},
 "@/lib/auth":{getPortalViewerAuth:async()=>({supabase:{},user:state.viewer?{id:state.viewer}:null}),
  getAuth:async()=>({supabase:{},user:state.viewer?{id:state.viewer}:null}),
  hasCongressAbility:async()=>state.staff},
 "@/lib/supabase/admin":{createAdminClient:()=>mockDb},
 "@/lib/portrait-policy":policy,
 "@/lib/portrait-storage":{
  readPortrait:async(path,width)=>{state.files.push({path,width});return Buffer.from([255,216,255,217]);},
  getPortraitWidth:w=>w==="96"?96:w==="160"?160:600,
  removeUnreferencedPortrait:async(oldPath,newPath)=>{state.cleanups.push({oldPath,newPath});}
 },
 "@/lib/portrait-upload":{
  PortraitError:class PortraitError extends Error{constructor(message,status){super(message);this.status=status;}},
  preparePortrait:async()=>({bytes:Buffer.from([255,216,255,217]),digest:"digest"}),
  savePortraitObject:async({commit})=>{await commit(true);return {changed:true,size:4};}
 }
};
const route=load("src/app/api/delegates/[id]/photo/route.ts",mocks);
const read=id=>route.GET(new Request("https://test.local/api/delegates/"+id+"/photo?w=160"),
 {params:Promise.resolve({id})});
function reset(){
 state.viewer=UID;state.staff=false;state.files=[];state.cleanups=[];state.updates=[];
 state.photos=[{id:SOURCE,congress_id:A,auth_user_id:UID,photo_path:legacy,is_active:true},
  {id:TARGET,congress_id:B,auth_user_id:UID,photo_path:legacy,is_active:true}];
}
test("a second congress can display the first congress photo for the same Auth identity",async()=>{
 reset();
 const response=await read(TARGET);
 assert.equal(response.status,200);
 assert.equal(response.headers.get("content-type"),"image/jpeg");
 assert.equal(state.files.at(-1).path,legacy);
 assert.equal(state.files.at(-1).width,160);
});
test("legacy portrait links must resolve to an active canonical source with same Auth owner",async()=>{
 reset();
 state.photos[0].auth_user_id=OTHER;
 assert.equal((await read(TARGET)).status,404);
 reset();
 state.photos[0].is_active=false;
 assert.equal((await read(TARGET)).status,404);
 reset();
 state.photos[0].photo_path=policy.delegatePortraitKey(A,TARGET);
 assert.equal((await read(TARGET)).status,404);
 reset();
 state.photos[1].photo_path=policy.delegatePortraitKey(A,"11111111-1111-4111-8111-111111111111");
 assert.equal((await read(TARGET)).status,404);
});
test("anonymous and unrelated users cannot read private portraits",async()=>{
 reset();
 state.viewer=null;
 assert.equal((await read(TARGET)).status,401);
 state.viewer=OTHER;
 assert.equal((await read(TARGET)).status,403);
});
test("delegate-owned upload links all congress profiles to one shared master",async()=>{
 reset();
 state.staff=false;state.viewer=UID;
 const form=new FormData();
 form.append("photo",new File([new Uint8Array([255,216,255,217])],"photo.jpg",{type:"image/jpeg"}));
 const response=await route.PUT(new Request("https://test.local/api/delegates/"+TARGET+"/photo",{
  method:"PUT",body:form
 }),{params:Promise.resolve({id:TARGET})});
 assert.equal(response.status,200);
 const body=await response.json();
 assert.equal(body.shared,true);
 const key=policy.sharedPortraitKey(UID);
 assert.equal(body.path,key);
 assert.equal(state.photos[0].photo_path,key);
 assert.equal(state.photos[1].photo_path,key);
 assert.equal(state.updates[0].updated,2);
 assert.deepEqual(state.cleanups,[{oldPath:legacy,newPath:key}]);
 state.viewer=UID;state.staff=false;
 assert.equal((await read(TARGET)).status,200);
});
test("BTC upload edits only their congress, never silently changes other congress photos",async()=>{
 reset();
 state.staff=true;state.viewer=OTHER;
 const form=new FormData();
 form.append("photo",new File([new Uint8Array([255,216,255,217])],"photo.jpg",{type:"image/jpeg"}));
 const response=await route.PUT(new Request("https://test.local/api/delegates/"+TARGET+"/photo",{
  method:"PUT",body:form
 }),{params:Promise.resolve({id:TARGET})});
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.shared,false);
 assert.equal(result.path,policy.delegatePortraitKey(B,TARGET));
 assert.equal(state.photos[0].photo_path,legacy);
 assert.equal(state.photos[1].photo_path,result.path);
 assert.equal(state.updates[0].updated,1);
 assert.deepEqual(state.cleanups,[]);
});
