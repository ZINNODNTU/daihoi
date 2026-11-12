import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
function compiled(path,mocks={}){
 const js=ts.transpileModule(read(path),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const stubModule={exports:{}};
 new Function("require","module","exports",js)(name=>{
  if(name in mocks)return mocks[name];
  if(name==="server-only")return {};
  throw new Error("Missing test stub "+name);
 },stubModule,stubModule.exports);
 return stubModule.exports;
}
const permissions=compiled("src/lib/congress-permissions.ts");

test("RBAC: Super Admin only global access, congress roles are least privilege",()=>{
 const can=permissions.canCongress;
 const matrix={
  super_admin:["workspace.view","delegates.write","seating.write","bch.write",
   "attendance.sessions","attendance.scan","documents.write","team.manage","settings.manage","system.logs"],
  admin:["workspace.view","delegates.write","seating.write","bch.write",
   "attendance.sessions","attendance.scan","documents.write","team.manage","settings.manage"],
  checkin:["workspace.view","attendance.read","attendance.scan","seating.read","reports.read"],
  secretary:["workspace.view","bch.read","documents.read","reports.read"]
 };
 for(const [role,abilities] of Object.entries(matrix)){
  assert.deepEqual([...permissions.roleAbilities(role)].sort(),[...permissions.roleAbilities(role)].sort());
  for(const ability of abilities)assert.equal(can(role,ability),true,role+" must permit "+ability);
  for(const ability of permissions.roleAbilities(role))assert.equal(can(role,ability),true);
 }
 for(const ability of permissions.roleAbilities("super_admin")){
  assert.equal(can(null,ability),false,"untrusted role is always denied");
 }
 for(const ability of ["delegates.read","delegates.write","seating.write",
  "team.manage","settings.manage","documents.read","bch.read","system.logs"])
  assert.equal(can("checkin",ability),false,"checkin must deny "+ability);
 for(const ability of ["attendance.scan","attendance.sessions","delegates.read",
  "documents.write","bch.write","seating.read","settings.manage","system.logs"])
  assert.equal(can("secretary",ability),false,"secretary must deny "+ability);
 assert.equal(can("admin","system.logs"),false,"BTC admin cannot view global system log tile");
});

const areas={
 delegates:"delegates.read",quality:"quality.read",seating:"seating.read",
 "bch-candidates":"bch.read",attendance:"attendance.read",
 reports:"reports.read",documents:"documents.read",
 team:"team.manage",settings:"settings.manage"
};
test("Every congress page subtree enforces a server-side permission, not just hidden navigation",()=>{
 for(const [section,ability] of Object.entries(areas)){
  const guard=read("src/app/congresses/[id]/"+section+"/layout.tsx");
  assert.match(guard,/requireCongressAbility/);
  assert.ok(guard.includes('requireCongressAbility(id,"'+ability+'")'),
   section+" must guard the matching permission");
 }
 const access=read("src/lib/congress-access.ts");
 assert.match(access,/getAuth/);
 assert.match(access,/hasCongressAbility/);
 assert.match(access,/notFound\(\)/);
 const shell=read("src/components/app-shell.tsx");
 assert.match(shell,/canUse\(/);
 assert.match(shell,/mobileItems\.map/);
 assert.doesNotMatch(shell,/\{\[congressItems\[0\],congressItems\[1\]/);
 const portal=read("src/app/my-card/layout.tsx");
 assert.match(portal,/if\(await isStaffUser\(supabase,user.id\)\)redirect\("\/dashboard"\)/);
 const account=read("src/app/account/page.tsx");
 assert.ok(account.indexOf("if(staff){")<account.indexOf('db.from("delegates")'),
  "staff account must branch before reading delegate identity");
});

test("BTC authorization requires valid enabled same-congress account and verified platform role",async()=>{
 const auth=compiled("src/lib/auth.ts",{
  "@/lib/supabase/server":{createClient:async()=>({})},
  "@/lib/congress-permissions":permissions,
  react:{cache:x=>x},
   "@/lib/rbac-schema":{isRbacMigrationPending:()=>false},
    "@/lib/portal-preview-context":{currentPortalPreview:()=>null}
 });
 const congressA="aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
 const congressB="bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
 const user="cccccccc-cccc-4ccc-cccc-cccccccccccc";
 const row=(data,error=null)=>({data,error});
 function db({role="admin",btc=true,btcCongress=congressA,platform="user",fault=null}={}){
  return {from(table){
   const constraints=[];
   const builder={
    select(){return this;},
    eq(column,value){constraints.push([column,value]);return this;},
    is(column,value){constraints.push([column,value]);return this;},
    limit(){return this;},
    then(ok,err){const error=fault===table?{code:"READ_FAILURE"}:null;return Promise.resolve(row([],error)).then(ok,err);},
    maybeSingle(){
     const error=fault===table?{code:"READ_FAILURE"}:null;
     if(table==="profiles")return Promise.resolve(row({platform_role:platform},error));
      if(table==="rbac_account_assignments")return Promise.resolve(row(null,error));
     if(table==="congress_members")
      return Promise.resolve(row(constraints.some(([k,v])=>k==="congress_id"&&v===congressA)?{role}:null,error));
     if(table==="btc_accounts")
      return Promise.resolve(row(btc&&constraints.some(([k,v])=>k==="congress_id"&&v===btcCongress)
        &&btcCongress===congressA?{congress_id:btcCongress}:null,error));
     throw Error("Unexpected table");
    }
   };
   return builder;
  }};
 }
 assert.equal(await auth.getCongressRole(db({role:"checkin"}),user,congressA),"checkin");
 assert.equal(await auth.hasRole(db({role:"checkin"}),user,congressA,"checkin"),true);
 assert.equal(await auth.hasRole(db({role:"checkin"}),user,congressA,"admin"),false);
 assert.equal(await auth.hasRole(db({role:"secretary"}),user,congressA,"checkin"),false);
 assert.equal(await auth.getCongressRole(db({role:"admin",btc:false}),user,congressA),null);
 assert.equal(await auth.getCongressRole(db({role:"admin",btcCongress:congressB}),user,congressA),null);
 assert.equal(await auth.getCongressRole(db({fault:"btc_accounts"}),user,congressA),null);
 assert.equal(await auth.getCongressRole(db({fault:"profiles"}),user,congressA),null);
 assert.equal(await auth.getCongressRole(db({platform:"super_admin",role:null,btc:false}),user,congressA),"super_admin");
});
