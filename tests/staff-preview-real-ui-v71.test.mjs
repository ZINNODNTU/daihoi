import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const congressId="6eb45d74-eed0-45e5-88b7-af5f4f712d87";
const targetId="413971b7-c72b-4a6a-9e16-94c6ec294f9e";
const adminId="6b2df1bd-bc1d-46ef-8cff-6ccbe74e8bb1";
const jsx=(type,props)=>({type,props:props||{}});
const jsxRuntime={jsx,jsxs:jsx,Fragment:"Fragment"};

function createPreview({actorRole="super_admin",btcActive=true,abilities=[
 "workspace.view","attendance.read","delegates.read","team.manage","settings.manage"
],congressKind="doan"}={}){
 const audit=[];
 const db={
  auth:{admin:{getUserById:async()=>({data:{user:{id:targetId,email:"staff@test.invalid"}},error:null})}},
  from(table){
   const clauses=[];
   const query={
    select(){return this},
    eq(key,value){clauses.push([key,value]);return this},
    is(){return this},
    limit(){if(table==="delegates")return Promise.resolve({data:[],error:null});return Promise.resolve({data:[],error:null})},
    maybeSingle:async()=>{
     if(table==="profiles")return {data:{full_name:"Trưởng BTC",platform_role:"user"},error:null};
     if(table==="congresses")return {data:{id:congressId,name:"Đại hội CNTT",kind:congressKind,status:"live"},error:null};
     if(table==="congress_members")return {data:{role:"admin"},error:null};
     if(table==="btc_accounts")return {data:btcActive?{user_id:targetId}:null,error:null};
     return {data:null,error:null};
    }
   };
   return query;
  }
 };
 const adminDb={
  from(){return {
   select(){return this},
   eq(){return this},
   maybeSingle:async()=>({data:{platform_role:actorRole},error:null})
  };}
 };
 const code=ts.transpileModule(read("src/app/dashboard/access/preview/[userId]/page.tsx"),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
   jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}
 }).outputText;
 const mocks={
  "react/jsx-runtime":jsxRuntime,
  "next/link":{default:"Link"},
  "next/navigation":{redirect:()=>{throw Error("redirect")},notFound:()=>{throw Error("notFound")}},
  "lucide-react":{},
  "@/lib/auth":{
   getAuth:async()=>({supabase:adminDb,user:{id:adminId}}),
   getCongressEffectiveAbilities:async()=>abilities,
   getCongressRole:async()=>"admin"
  },
  "@/lib/supabase/admin":{createAdminClient:()=>db},
  "@/lib/rbac-server":{getPortalAbilities:async()=>[]},
  "@/lib/access-rbac":{RBAC_LABELS:{admin:"Trưởng Ban Tổ chức"}},
  "@/lib/system-log":{writeSystemLog:async value=>{audit.push(value)}},
  "@/lib/portal-preview-context":{setVerifiedPortalPreview:()=>{}},
  "@/lib/active-congress":{getPortalCongressContext:async()=>({options:[]})},
  "@/components/delegate-shell":{DelegateShell:"DelegateShell"},
  "@/components/portal-preview-navigation":{PortalPreviewNavigation:"PortalPreviewNavigation"},
  "@/components/app-shell":{AppShell:"AppShell"},
  "@/components/congress-overview":{CongressOverviewForUser:"CongressOverviewForUser"},
  "@/components/staff-preview-navigation":{StaffPreviewNavigation:"StaffPreviewNavigation"},
  "@/app/my-card/page":{default:"MyCardPage"},
  "@/app/my-card/checkin/page":{default:"CheckinPage"},
  "@/app/my-card/seats/page":{default:"SeatsPage"},
  "@/app/my-card/documents/page":{default:"DocumentsPage"},
  "@/app/my-card/bch/page":{default:"BchPage"},
  "@/app/my-card/history/page":{default:"HistoryPage"}
 };
 const cjs={exports:{}};
 new Function("require","module","exports",code)(
  name=>name in mocks?mocks[name]:(()=>{throw Error("Missing mock: "+name)})(),
  cjs,cjs.exports);
 return {
  audit,
  render:(view="overview")=>cjs.exports.default({
   params:Promise.resolve({userId:targetId}),
   searchParams:Promise.resolve({congressId,view})
  })
 };
}
function find(node,type,result=[]){
 if(!node||typeof node!=="object")return result;
 if(Array.isArray(node)){node.forEach(item=>find(item,type,result));return result;}
 if(node.type===type)result.push(node);
 Object.values(node.props||{}).forEach(child=>find(child,type,result));
 return result;
}

test("Super Admin preview renders real BTC AppShell and exactly shared CongressOverviewForUser",async()=>{
 const preview=createPreview();
 const tree=await preview.render();
 const shells=find(tree,"AppShell"),overview=find(tree,"CongressOverviewForUser");
 assert.equal(shells.length,1);
 assert.equal(overview.length,1);
 assert.equal(shells[0].props.name,"Trưởng BTC");
 assert.equal(shells[0].props.congressId,congressId);
 assert.equal(shells[0].props.congressName,"Đại hội CNTT");
 assert.equal(shells[0].props.accessRole,"admin");
 assert.equal(shells[0].props.previewMode,true);
 assert.equal(shells[0].props.canViewSystemLogs,undefined);
 assert.ok(shells[0].props.effectiveAbilities.includes("team.manage"));
 assert.equal(overview[0].props.previewBasePath,"/dashboard/access/preview/"+targetId);
 assert.equal(find(tree,"StaffPreviewNavigation").length,1);
 assert.equal(find(tree,"DelegateShell").length,0);
 assert.match(read("src/app/dashboard/access/preview/[userId]/page.tsx"),/href=\{"\/dashboard\/access\?congressId="\+congressId\}/);
 assert.equal(preview.audit.length,1);
 assert.equal(preview.audit[0].actorId,adminId);
 assert.equal(preview.audit[0].context.targetId,targetId);
});

test("Preview refuses an unauthorized actor and disabled BTC account",async()=>{
 await assert.rejects(createPreview({actorRole:"user"}).render(),/redirect/);
 await assert.rejects(createPreview({btcActive:false}).render(),/notFound/);
 await assert.rejects(createPreview({abilities:["delegates.read"]}).render(),/notFound/);
});

test("Preview cannot escalate ungranted sections by editing ?view or seeing unrelated links",async()=>{
 const preview=createPreview({abilities:["workspace.view","attendance.read"]});
 const tree=await preview.render("team");
 assert.equal(find(tree,"CongressOverviewForUser").length,1,"unknown section falls back to overview");
 const shell=find(tree,"AppShell")[0];
 assert.deepEqual(shell.props.effectiveAbilities,["workspace.view","attendance.read"]);
 assert.equal(shell.props.previewRoute,"/congresses/"+congressId);
 const nav=read("src/components/staff-preview-navigation.tsx");
 assert.match(nav,/onClickCapture=\{intercept\}/);
 assert.match(nav,/onSubmitCapture=\{blockForm\}/);
 assert.match(nav,/event.preventDefault\(\)/);
 assert.match(nav,/target.origin!==currentOrigin/);
 assert.doesNotMatch(nav,/signInWithPassword|setSession|auth\.admin\.generateLink/);
 const shellSource=read("src/components/app-shell.tsx");
 assert.match(shellSource,/previewMode\?\:boolean/);
 assert.match(shellSource,/previewRoute\|\|path/);
 assert.match(shellSource,/disabled=\{previewMode\}/);
 assert.match(shellSource,/canViewSystemLogs&&!previewMode/);
});

test("Actual BTC dashboard and preview share the same congress overview data display",()=>{
 const actual=read("src/app/congresses/[id]/page.tsx");
 const shared=read("src/components/congress-overview.tsx");
 const preview=read("src/app/dashboard/access/preview/[userId]/page.tsx");
 assert.match(actual,/<CongressOverviewForUser/);
 assert.match(preview,/<CongressOverviewForUser/);
 assert.match(shared,/command-hero/);
 assert.match(shared,/metric-card/);
 assert.match(shared,/previewBasePath/);
 assert.match(shared,/route\("attendance"\)/);
 assert.doesNotMatch(preview,/Điều hướng được cấp quyền|GIAO DIỆN ĐIỀU HÀNH.*PREVIEW/);
});
