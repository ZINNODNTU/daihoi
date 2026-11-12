import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {isSameDelegateIdentity} from "../src/lib/delegate-identity.ts";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const congress="79e7f633-e824-4a9d-ba25-d0fa59349a26";
const otherCongress="8fee0096-d9db-4602-a54d-a791b5820100";
const person="e909030b-c3e4-4bc8-a0e8-fdef81b1e91d";

const routeSource=read("../src/app/api/my-card/congress/route.ts");
const compiled=ts.transpileModule(routeSource,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true
}}).outputText;
function post({user={id:person},allowed=[congress]}={}){
 const exported={exports:{}};
 const cookies=[];
 const fakeRequire=specifier=>{
  if(specifier==="next/server")return {NextResponse:{
   json:(value,{status=200}={})=>({status,value,cookies:{set:(...args)=>cookies.push(args)}})
  }};
  if(specifier==="@/lib/auth")return {getAuth:async()=>({user})};
  if(specifier==="@/lib/portal-congress-access")return {
   getPortalCongressAccess:async()=>({congressIds:allowed})
  };
  if(specifier==="@/lib/active-congress")return {ACTIVE_CONGRESS_COOKIE:"daihoi_active_congress"};
  throw new Error("Unexpected module "+specifier);
 };
 new Function("require","module","exports",compiled)(fakeRequire,exported,exported.exports);
 return {POST:exported.exports.POST,cookies};
}
function request(congressId,origin="http://localhost:3000"){
 return new Request("http://localhost:3000/api/my-card/congress",{
  method:"POST",headers:{"Content-Type":"application/json","origin":origin,"host":"localhost:3000"},
  body:JSON.stringify({congressId})
 });
}

test("First-use congress selector rejects wrong person and does not create an active cookie",async()=>{
 const h=post({allowed:[congress]});
 const result=await h.POST(request(otherCongress));
 assert.equal(result.status,403);
 assert.equal(h.cookies.length,0);
 const noLogin=post({user:null});
 assert.equal((await noLogin.POST(request(congress))).status,401);
 assert.equal(noLogin.cookies.length,0);
 const invalid=post();
 assert.equal((await invalid.POST(request("../other"))).status,400);
 assert.equal(invalid.cookies.length,0);
});

test("Selecting an authorized congress persists a secure, HttpOnly same-site selection",async()=>{
 const h=post();
 const result=await h.POST(request(congress));
 assert.equal(result.status,200);
 assert.deepEqual(result.value,{ok:true,congressId:congress});
 assert.equal(h.cookies.length,1);
 const [name,id,options]=h.cookies[0];
 assert.equal(name,"daihoi_active_congress");
 assert.equal(id,congress);
 assert.equal(options.httpOnly,true);
 assert.equal(options.sameSite,"lax");
 assert.equal(options.path,"/");
 assert.ok(options.maxAge>=86400);
});

test("Direct cross-origin selection requests are denied",async()=>{
 const h=post();
 const result=await h.POST(request(congress,"https://attacker.example"));
 assert.equal(result.status,403);
 assert.equal(h.cookies.length,0);
});

test("Every selected congress is verified against authenticated membership before use",()=>{
 const context=read("../src/lib/active-congress.ts");
 assert.match(context,/\.get\(ACTIVE_CONGRESS_COOKIE\)/);
 assert.match(context,/getPortalCongressAccess\(userId\)/);
 assert.match(context,/options\.some\(c=>c\.id===value\)\?value:null/);
 const portal=read("../src/app/my-card/page.tsx");
 assert.match(portal,/if\(!context\.activeCongressId\)return <PortalCongressPicker variant="welcome"/);
 const shell=read("../src/components/delegate-shell.tsx");
 assert.match(shell,/<PortalCongressPicker options=\{congresses\} activeId=\{activeCongressId\}/);
 const logout=read("../src/app/api/auth/logout/route.ts");
 assert.match(logout,/response\.cookies\.delete\("daihoi_active_congress"\)/);
});

test("Card, seat map, documents and BCH stay in selected congress; check-in remains global",()=>{
 const card=read("../src/app/my-card/page.tsx");
 const seat=read("../src/app/my-card/seats/page.tsx");
 const docs=read("../src/app/my-card/documents/page.tsx");
 const bch=read("../src/app/my-card/bch/page.tsx");
 const scanner=read("../src/app/my-card/checkin/page.tsx");
 assert.match(card,/item\.congressId===selected\.id/);
 assert.match(seat,/item\.congressId===congressId/);
 assert.match(docs,/\.eq\("congress_id",congressId\)/);
 assert.match(docs,/\.eq\("delegate_visible",true\)/);
 assert.match(bch,/\.eq\("congress_id",congressId\)/);
 assert.match(scanner,/items\.flatMap\(d=>d\.sessions/);
 assert.doesNotMatch(scanner,/getSelectedCongressId/);
});

test("History includes inactive historical delegates and paginates all checkins independent of selection",()=>{
 const page=read("../src/app/my-card/history/page.tsx");
 const loader=read("../src/lib/delegate-history.ts");
 assert.match(page,/loadDelegateHistory\(user\.id\)/);
 assert.doesNotMatch(page,/getSelectedCongressId|getPortalCongressContext/);
 assert.match(loader,/\.eq\("auth_user_id",userId\)/);
 assert.doesNotMatch(loader,/\.eq\("is_active",true\)/);
 assert.match(loader,/\.range\(from,from\+pageSize-1\)/);
 assert.match(loader,/for\(let from=0;from<20000;from\+=pageSize\)/);
});

test("One shared identity updates all linked delegate profiles and portrait, without modifying seats or QR",()=>{
 const profile=read("../src/app/api/my-card/profile/route.ts");
 const photo=read("../src/app/api/delegates/[id]/photo/route.ts");
 const account=read("../src/app/account/page.tsx");
 assert.match(profile,/\.update\(changes\)\s*\.eq\("auth_user_id",user\.id\)/);
 assert.match(profile,/\.from\("profiles"\)\.upsert/);
 assert.doesNotMatch(profile,/\.update\(changes\)\s*\.eq\("congress_id"/);
 assert.match(photo,/sharedPortraitKey\(delegate\.auth_user_id!\)/);
 assert.match(photo,/\.eq\("auth_user_id",delegate\.auth_user_id!\)/);
 assert.match(account,/const personal:EditableDelegate\[\]=first\?/);
 assert.match(account,/DelegateProfileEditor initial=\{personal\}/);
});

test("Linking another congress to an account checks identity, preserves existing password and reuses shared profile",()=>{
 const api=read("../src/app/api/delegates/accounts/route.ts");
 assert.match(api,/findExisting\(authEmail\)/);
 assert.match(api,/isSameDelegateIdentity/);
 assert.match(api,/previous\.some/);
 assert.match(api,/photo_path:previous\[0\]\.photo_path/);
 assert.match(api,/\.update\(\{auth_user_id:targetId/);
 assert.equal(isSameDelegateIdentity("Nguyễn Thành Nhân","nguyen thanh  nhan"),true);
 assert.equal(isSameDelegateIdentity("Nguyễn Thành Nhân","Trần Thành Nhân"),false);
});
