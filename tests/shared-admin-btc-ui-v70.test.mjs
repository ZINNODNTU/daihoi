import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const jsx=(type,props)=>({type,props:props||{}});
const jsxRuntime={jsx,jsxs:jsx,Fragment:"Fragment"};

function loadDashboard({admin=false,rights=["workspace.view"],btcEnabled=true}={}){
 process.env.NEXT_PUBLIC_SUPABASE_URL||="https://unit-test.supabase.co";
 process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||="test-key";
 const id="b6f44e38-e927-44d9-9024-40adca26e8d1";
 const own="008960cf-ce01-4f4c-b0e8-3dc566a407d8";
 const other="1158f98b-3b8e-4252-b2f2-270e49ba0379";
 const congresses=[
  {id:own,name:"Owned Congress",kind:"doan",term:"2026–2031",status:"live",slug:"owned",venue:"Room 1"},
  {id:other,name:"Other Congress",kind:"hoi_sinh_vien",term:"2026–2029",status:"preparing",slug:"other",venue:"Room 2"}
 ];
 const observed=[];
 const supabase={
  auth:{getUser:async()=>({data:{user:{id,email:"btc@invalid.local"}}})},
  from(table){
   observed.push(["from",table]);
   const q={
    select(){return this},
    is(key,value){observed.push(["is",table,key,value]);return this},
    eq(key,value){
     observed.push(["eq",table,key,value]);
     if(table==="congresses")return Promise.resolve({
      data:congresses.filter(c=>c[key]===value),error:null
     });
     return this;
    },
    maybeSingle:async()=>{
     if(table==="profiles")return {data:{platform_role:admin?"super_admin":"user",full_name:"Tester"},error:null};
     if(table==="btc_accounts")return {data:btcEnabled?{congress_id:own}:null,error:null};
     throw Error("Unexpected maybeSingle "+table);
    },
    order:async()=>({data:congresses,error:null})
   };
   return q;
  }
 };
 const js=ts.transpileModule(read("src/app/dashboard/page.tsx"),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,
  esModuleInterop:true
 }}).outputText;
 const mocks={
  "react/jsx-runtime":jsxRuntime,
  "next/navigation":{redirect:url=>{throw Error("redirect "+url)}},
  "next/link":{default:"Link"},
  "lucide-react":{},
  "@/lib/supabase/server":{createClient:async()=>supabase},
  "@/lib/auth":{
   isStaffUser:async()=>true,
   getCongressRole:async()=>{observed.push(["getRole"]);return "checkin";},
   getCongressEffectiveAbilities:async()=>{observed.push(["getAbilities"]);return rights;}
  },
  "@/components/app-shell":{AppShell:"AppShell"},
  "@/components/acting-session-notice":{ActingSessionNotice:"ActingSessionNotice"},
  "@/components/create-congress":{CreateCongress:"CreateCongress"},
  "@/components/congress-directory":{CongressDirectory:"CongressDirectory"}
 };
 const cjs={exports:{}};
 new Function("require","module","exports",js)(name=>{
  if(name in mocks)return mocks[name];
  throw Error("Unexpected require: "+name);
 },cjs,cjs.exports);
 return {Dashboard:cjs.exports.default,observed,congresses};
}
function find(node,type,result=[]){
 if(Array.isArray(node)){for(const value of node)find(value,type,result);return result;}
 if(!node||typeof node!=="object")return result;
 if(node.type===type)result.push(node);
 for(const child of Object.values(node.props||{}))find(child,type,result);
 return result;
}

test("BTC and Super Admin render exactly the same AppShell and dashboard components",async()=>{
 const admin=loadDashboard({admin:true}),staff=loadDashboard({rights:["workspace.view","attendance.read"]});
 const [adminUI,staffUI]=await Promise.all([admin.Dashboard(),staff.Dashboard()]);
 const adminShell=find(adminUI,"AppShell")[0],staffShell=find(staffUI,"AppShell")[0];
 assert.ok(adminShell);
 assert.ok(staffShell);
 assert.equal(adminShell.props.canViewSystemLogs,true);
 assert.equal(staffShell.props.canViewSystemLogs,false);
 assert.equal(adminShell.props.accessRole,"super_admin");
 assert.equal(staffShell.props.accessRole,"checkin");
 assert.equal(find(adminUI,"CongressDirectory").length,1);
 assert.equal(find(staffUI,"CongressDirectory").length,1);
 assert.equal(find(adminUI,"CreateCongress").length,1);
 assert.equal(find(staffUI,"CreateCongress").length,0);
 assert.deepEqual(find(adminUI,"CongressDirectory")[0].props.items.map(c=>c.id),
  admin.congresses.map(c=>c.id));
 assert.deepEqual(find(staffUI,"CongressDirectory")[0].props.items.map(c=>c.id),
  [staff.congresses[0].id]);
 assert.equal(admin.observed.some(row=>row[1]==="btc_accounts"),false);
 assert.ok(staff.observed.some(row=>row[0]==="is"&&row[1]==="btc_accounts"));
 assert.ok(staff.observed.some(row=>row[0]==="eq"&&row[1]==="congresses"&&
  row[2]==="id"&&row[3]===staff.congresses[0].id));
});

test("Revoking BTC workspace.view removes the congress but keeps the same UI shell",async()=>{
 const staff=loadDashboard({admin:false,rights:[]});
 const ui=await staff.Dashboard();
 assert.equal(find(ui,"AppShell").length,1);
 assert.deepEqual(find(ui,"CongressDirectory")[0].props.items,[]);
 assert.equal(staff.observed.some(row=>row[1]==="congresses"),false);
});

test("Congress dashboard uses the common admin layout and honors per-module permissions",()=>{
 const layout=read("src/app/congresses/[id]/layout.tsx");
 const page=read("src/components/congress-overview.tsx");
 const shell=read("src/components/app-shell.tsx");
 const login=read("src/app/api/auth/login/route.ts");
 assert.match(layout,/<AppShell/);
 assert.match(layout,/effectiveAbilities=\{\[\.\.\.effectiveAbilities\]\}/);
 assert.match(page,/canReadDelegates\?/);
 assert.match(page,/canReadAttendance\?/);
 assert.match(page,/!accessibleAreas.length/);
 assert.match(page,/area.href!=="ballots"\|\|congress.kind==="doan"/);
 assert.match(shell,/effectiveAbilities\?effectiveAbilities.includes\(ability\)/);
 assert.match(login,/destination=staff\?"\/dashboard":"\/my-card"/);
 assert.doesNotMatch(login,/destination=staff\?"\/staff"/);
});