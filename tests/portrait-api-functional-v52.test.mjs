import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const file=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
function load(path,imports){
 const code=ts.transpileModule(file(path),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true
 }}).outputText;
 const box={exports:{}};
 new Function("require","module","exports",code)(name=>{
  if(name in imports)return imports[name];
  throw new Error("Unexpected dependency "+name);
 },box,box.exports);
 return box.exports;
}
const congress="79e7f633-e824-4a9d-ba25-d0fa59349a26";
const candidate="b3333333-3333-4333-8333-333333333333";
const delegate="a2222222-2222-4222-8222-222222222222";
const user="123e4567-e89b-42d3-a456-426614174000";
const policy=load("src/lib/portrait-policy.ts",{});
const requests=[];
const state={viewer:user,manager:true,staff:false,role:"guest",delegateMember:true};
const userAuth=async()=>({supabase:{from:table=>{
 if(table==="bch_candidates")return db.from(table);
 if(table!=="congress_members")throw new Error("Unexpected table");
 return {select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:{role:state.role},error:null})})})})};
 }},user:state.viewer?{id:state.viewer}:null});
const candidateRow={
 id:candidate,congress_id:congress,photo_path:policy.bchPortraitKey(congress,candidate),
 updated_at:"2026-11-01T00:00:00Z"
};
const delegateRow={
 id:delegate,congress_id:congress,photo_path:policy.delegatePortraitKey(congress,delegate),
 auth_user_id:user,is_active:true
};
let reading=async()=>Buffer.from([255,216,255,217]);
const db={
 from(table){
  if(table==="bch_candidates")return{
   select:()=>({eq:()=>({maybeSingle:async()=>({data:candidateRow,error:null})})}),
   update:()=>({eq:()=>({eq:()=>({select:()=>({maybeSingle:async()=>({
    data:{photo_path:candidateRow.photo_path,updated_at:candidateRow.updated_at},error:null
   })})})})})
  };
  if(table==="delegates")return{
   select:()=>({eq:()=>({maybeSingle:async()=>({data:delegateRow,error:null}),
    eq:()=>({eq:()=>({limit:async()=>({data:state.delegateMember?[{id:delegate}]:[],error:null})})})})})
  };
  throw new Error("Unexpected table "+table);
 }
};
const next={NextResponse:{json:(body,config={})=>new Response(JSON.stringify(body),{
 status:config.status??200,headers:{"Content-Type":"application/json",...config.headers}
})}};
const common={
 "next/server":next,
 "@/lib/auth":{
  getAuth:userAuth,getPortalViewerAuth:userAuth,
  hasCongressAbility:async(_db,_uid,_cid,ability)=>ability.endsWith(".write")?state.manager:state.staff
 },
 "@/lib/supabase/admin":{createAdminClient:()=>db},
  "@/lib/rbac-server":{hasPortalAbility:async(_uid,_cid,ability)=>ability==="portal.bch"&&state.delegateMember&&state.role==="guest"},
  "@/lib/public-congress-access":{hasPublicCongressAccess:async()=>false},
 "@/lib/portrait-storage":{readPortrait:async(path,width)=>{requests.push({path,width});return reading(path,width);},
  getPortraitWidth:value=>value==="96"?96:value==="160"?160:600
 },
 "@/lib/portrait-policy":policy,
 "@/lib/portrait-upload":{preparePortrait:async()=>({bytes:Buffer.from([255,216,255,217]),digest:"digest"}),
  savePortraitObject:async({commit})=>{await commit(true);return {changed:true,size:4};},
  PortraitError:class PortraitError extends Error{constructor(message,status){super(message);this.status=status;}}
 }
};
const bch=load("src/app/api/bch-candidates/[id]/photo/route.ts",common);
const delegates=load("src/app/api/delegates/[id]/photo/route.ts",common);
const GET=(route,id,width="160")=>route.GET(new Request("https://test.local/photo?w="+width),{params:Promise.resolve({id})});
test("valid five-section BCH UUID serves a private JPEG instead of HTTP 400",async()=>{
 state.viewer=user;state.manager=true;
 const response=await GET(bch,candidate);
 assert.equal(response.status,200);
 assert.equal(response.headers.get("content-type"),"image/jpeg");
 assert.equal(response.headers.get("cache-control"),"private, no-store");
 assert.equal(response.headers.get("cross-origin-resource-policy"),"same-origin");
 assert.equal(requests.at(-1).path,policy.bchPortraitKey(congress,candidate));
 assert.equal(requests.at(-1).width,160);
});
test("valid delegate photo uses own identifier and serves correctly",async()=>{
 state.viewer=user;state.manager=false;
 const response=await GET(delegates,delegate,"96");
 assert.equal(response.status,200);
 assert.equal(requests.at(-1).path,policy.delegatePortraitKey(congress,delegate));
 assert.equal(requests.at(-1).width,96);
});
test("both routes reject invalid IDs and unauthenticated access",async()=>{
 state.viewer=user;
 for(const route of [bch,delegates]){
  assert.equal((await GET(route,"invalid-id")).status,400);
  state.viewer=null;
  assert.equal((await GET(route,route===bch?candidate:delegate)).status,401);
  state.viewer=user;
 }
});
test("BCH keeps non-admin delegates isolated from unrelated congress",async()=>{
 state.viewer=user;state.manager=false;state.staff=false;state.role="none";state.delegateMember=false;
 const response=await GET(bch,candidate);
 assert.equal(response.status,403);
 state.manager=true;state.delegateMember=true;
});
test("BCH upload accepts correct UUID and persists canonical storage path",async()=>{
 state.viewer=user;state.manager=true;
 const form=new FormData();
 form.append("photo",new File([new Uint8Array([255,216,255,217])],"portrait.jpg",{type:"image/jpeg"}));
 const response=await bch.PUT(new Request("https://test.local/photo",{method:"PUT",body:form}),{
  params:Promise.resolve({id:candidate})
 });
 assert.equal(response.status,200);
 assert.equal((await response.json()).photo_path,policy.bchPortraitKey(congress,candidate));
});
