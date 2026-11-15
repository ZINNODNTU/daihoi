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
  throw Error("Missing mock "+name);
 },box,box.exports);
 return box.exports;
}

const policy=load("src/lib/portrait-policy.ts",{});
const identity=load("src/lib/delegate-identity.ts",{});
const reuse=load("src/lib/delegate-photo-reuse.ts",{
 "@/lib/portrait-policy":policy,"@/lib/delegate-identity":identity
});
const a="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const b="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const author="cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const different="dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const src="11111111-1111-4111-8111-111111111111";
const dst="22222222-2222-4222-8222-222222222222";
const path=policy.delegatePortraitKey(a,src);
const source=()=>({id:src,congress_id:a,student_id:"NGUYENTHILIEU",
 full_name:"Nguyễn Thị Liệu",birth_date:null,auth_user_id:null,photo_path:path,is_active:true});
const target=()=>({id:dst,congress_id:b,student_id:"NGUYENTHILIEU",
 full_name:"Nguyễn Thị Liệu",birth_date:null,auth_user_id:author,photo_path:null,is_active:true});

test("same MSSV and full name: explicit link from unprovisioned Đoàn to provisioned HSV",()=>{
 assert.equal(reuse.canReuseDelegatePortrait(target(),source()),true);
 assert.equal(reuse.normalizePortraitStudentId(" nguyenThilieu "),"NGUYENTHILIEU");
 const s=source();s.full_name="Nguyen Thi Lieu";
 assert.equal(reuse.canReuseDelegatePortrait(target(),s),true);
 const linked={...target(),photo_path:path};
 assert.equal(reuse.isVerifiedReusedDelegatePortrait(linked,[s]),true);
});

test("reject cross-congress identity collisions, invalid keys, inactive source and date conflicts",()=>{
 for(const patch of [
  {student_id:"NGUYENTHIL1EU"},
  {full_name:"Nguyễn Thị Mai"},
  {birth_date:"2004-01-12"},
  {is_active:false},
  {photo_path:"media/people/other.jpg"},
  {photo_path:policy.delegatePortraitKey(a,dst)},
  {congress_id:b},{auth_user_id:different}
 ]){
  const t=target();t.birth_date="2004-04-21";
  assert.equal(reuse.canReuseDelegatePortrait(t,{...source(),...patch}),false,JSON.stringify(patch));
 }
 assert.equal(reuse.canReuseDelegatePortrait({...target(),is_active:false},source()),false);
 assert.equal(reuse.canReuseDelegatePortrait({...target(),student_id:null},source()),false);
 const copied={...source(),photo_path:policy.sharedPortraitKey(author),auth_user_id:author};
 assert.equal(reuse.canReuseDelegatePortrait(target(),copied),true);
 assert.equal(reuse.canReuseDelegatePortrait({...target(),auth_user_id:null},copied),false,
  "a private Auth master cannot be shared to an unverified account");
 assert.equal(reuse.isVerifiedReusedDelegatePortrait({...target(),photo_path:path},[{...source(),is_active:false}]),false);
});

function mockEnvironment(){
 const state={viewer:author,permitted:true,sourcePermission:true,people:[source(),target()],
  imageAvailable:true,imagesRead:[],updates:[],events:[],cleanups:[],storageUploads:0};
 const matching=(rows,filters)=>rows.filter(row=>filters.every(f=>{
  if(f.method==="eq"||f.method==="is")return row[f.field]===f.value;
  if(f.method==="neq")return row[f.field]!==f.value;
  if(f.method==="not")return row[f.field]!==f.value;
  throw Error("Unknown filter "+f.method);
 }));
 const db={from(table){
  let filters=[],updating=null;
  const rows=()=>table==="delegates"?state.people:
   table==="congresses"?[
    {id:a,name:"Đại hội Đoàn khoa Công nghệ thông tin"},
    {id:b,name:"Đại hội Hội Sinh viên khoa Công nghệ thông tin"}
   ]:assert.fail("Unexpected table "+table);
  const q={
   select(){return q;},
   eq(field,value){filters.push({method:"eq",field,value});return q;},
   neq(field,value){filters.push({method:"neq",field,value});return q;},
   is(field,value){filters.push({method:"is",field,value});return q;},
   not(field,_op,value){filters.push({method:"not",field,value});return q;},
   in(field,values){filters.push({method:"eq",field,value:undefined});
    filters.pop();filters.push({method:"set",field,values});return q;},
   update(values){updating=values;return q;},
   async maybeSingle(){
    const found=matching(rows(),filters)[0];
    if(updating&&found){Object.assign(found,updating);state.updates.push({id:found.id,values:updating});}
    return {data:found||null,error:null};
   },
   async limit(n){return {data:matching(rows(),filters).slice(0,n),error:null};},
   then(resolve,reject){
    const selected=rows().filter(row=>filters.every(f=>f.method==="set"?
      f.values.includes(row[f.field]):matching([row],[f]).length>0));
    return Promise.resolve({data:selected,error:null}).then(resolve,reject);
   }
  };
  return q;
 }};
 const mocks={
  "next/server":{NextResponse:{json:(body,options={})=>
   new Response(JSON.stringify(body),{status:options.status||200,headers:{
    "Content-Type":"application/json",...options.headers
   }})}},
  "@/lib/auth":{getAuth:async()=>({supabase:{},user:state.viewer?{id:state.viewer}:null}),
   getPortalViewerAuth:async()=>({supabase:{},user:state.viewer?{id:state.viewer}:null}),
   hasCongressAbility:async(_client,_user,congress,ability)=>
    state.permitted&&((congress===b&&["delegates.write","delegates.read"].includes(ability))||
     (congress===a&&state.sourcePermission&&ability==="delegates.read"))},
  "@/lib/supabase/admin":{createAdminClient:()=>db},
  "@/lib/delegate-photo-reuse":reuse,
  "@/lib/portrait-storage":{readPortrait:async(p,w)=>{
   state.imagesRead.push({path:p,width:w});return state.imageAvailable?Buffer.from([255,216,255,217]):null;
  },getPortraitWidth:w=>w==="96"?96:w==="160"?160:600,
   removeUnreferencedPortrait:async(oldPath,newPath)=>state.cleanups.push({oldPath,newPath})},
  "@/lib/system-log":{writeSystemLog:async item=>{state.events.push(item);}},
  "@/lib/portrait-policy":policy,
  "@/lib/portrait-upload":{preparePortrait:async()=>{throw Error("Unexpected upload");},
   savePortraitObject:async()=>{state.storageUploads++;throw Error("Unexpected storage write");},
   PortraitError:class PortraitError extends Error{}}
 };
 const photoLinks=load("src/app/api/delegates/photo-links/route.ts",mocks);
 const photo=load("src/app/api/delegates/[id]/photo/route.ts",mocks);
 const list=()=>photoLinks.GET(new Request(
  "https://test.local/api/delegates/photo-links?congressId="+b+"&delegateId="+dst));
 const link=(sourceId=src)=>photoLinks.POST(new Request("https://test.local/api/delegates/photo-links",{
  method:"POST",headers:{"Content-Type":"application/json","Origin":"https://test.local","Host":"test.local"},
  body:JSON.stringify({congressId:b,delegateId:dst,sourceId})
 }));
 const portrait=()=>photo.GET(new Request("https://test.local/api/delegates/"+dst+"/photo?w=160"),
  {params:Promise.resolve({id:dst})});
 return {state,list,link,portrait};
}

test("authenticated BTC can browse options and explicitly link without copying any Storage blob",async()=>{
 const {state,list,link,portrait}=mockEnvironment();
 const options=await list();
 assert.equal(options.status,200);
 const data=await options.json();
 assert.equal(data.options.length,1);
 assert.equal(data.options[0].id,src);
 assert.ok(data.options[0].congressName.includes("Đoàn"));
 const linked=await link();
 assert.equal(linked.status,200);
 assert.equal((await linked.json()).photo_path,path);
 assert.equal(state.people[1].photo_path,path);
 assert.equal(state.updates.length,1);
 assert.equal(state.updates[0].id,dst,"only selected target row is modified");
 assert.equal(state.storageUploads,0);
 assert.equal(state.events[0].event,"delegate.photo_reused");
 const shown=await portrait();
 assert.equal(shown.status,200,"linked target can read the original photo without privileged access to source congress");
 assert.equal(state.imagesRead.at(-1).path,path);
});

test("unrelated person, unknown source, missing bytes, revoked role and repeated link cannot proceed",async()=>{
 let env=mockEnvironment();
 env.state.permitted=false;
 assert.equal((await env.list()).status,403);
 assert.equal((await env.link()).status,403);
 env=mockEnvironment();
 env.state.sourcePermission=false;
 assert.deepEqual((await (await env.list()).json()).options,[]);
 assert.equal((await env.link()).status,403);
 env=mockEnvironment();
 env.state.people[0].full_name="Nguyễn Thị Khác";
 assert.deepEqual((await (await env.list()).json()).options,[]);
 assert.equal((await env.link()).status,409);
 assert.equal(env.state.updates.length,0);
 env=mockEnvironment();
 env.state.imageAvailable=false;
 assert.equal((await env.link()).status,409);
 assert.equal(env.state.updates.length,0);
 env=mockEnvironment();
 assert.equal((await env.link(different)).status,409);
 assert.equal((await env.link()).status,200);
 const again=await env.link();
 assert.equal(again.status,200,"reselecting the same link must be idempotent");
 assert.equal((await again.json()).unchanged,true);
 assert.equal(env.state.updates.length,1);
});

test("BTC can replace a stale/existing target photo with source image without Storage duplication",async()=>{
 const env=mockEnvironment();
 const oldPath=policy.delegatePortraitKey(b,dst);
 env.state.people[1].photo_path=oldPath;
 assert.equal((await (await env.list()).json()).options.length,1);
 const response=await env.link();
 assert.equal(response.status,200);
 assert.equal(env.state.people[1].photo_path,path);
 assert.deepEqual(env.state.cleanups,[{oldPath,newPath:path}]);
 assert.equal(env.state.storageUploads,0);
 assert.equal((await env.portrait()).status,200);
});

test("UI offers explicit linking also for broken/existing portraits on desktop/mobile and retains upload",()=>{
 const ui=file("src/components/delegates-client.tsx");
 assert.match(ui,/Liên kết ảnh cũ/);
 assert.equal((ui.match(/Liên kết ảnh cũ/g)||[]).length,2);
 assert.match(ui,/canManage&&d.student_id/);
 assert.match(ui,/setPhotoLink\(\{delegate,options:\[\],selected:"",loading:true,error:""\}\)/);
 assert.match(ui,/fetch\("\/api\/delegates\/photo-links"/);
 assert.match(ui,/Xác nhận dùng lại ảnh/);
 assert.match(ui,/onClick=\{\(\)=>setPhotoTarget\(\{kind:"existing",delegate:d\}\)\}/);
 const handler=file("src/app/api/delegates/photo-links/route.ts");
 assert.match(handler,/hasCongressAbility\(supabase,user.id,congressId,"delegates.write"\)/);
 assert.match(handler,/\.is\("photo_path",null\)/);
 assert.doesNotMatch(handler,/storage\.upload\(|savePortraitObject\(|\.copy\(/);
 const reader=file("src/app/api/delegates/[id]/photo/route.ts");
 assert.match(reader,/isVerifiedReusedDelegatePortrait\(photo,sources\)/);
});
