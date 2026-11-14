import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import ts from "typescript";

const require=createRequire(import.meta.url);
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
function loadModule(path,mocks={}){
 const code=ts.transpileModule(read(path),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
  jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true
 }}).outputText;
 const cjs={exports:{}};
 new Function("require","module","exports",code)(name=>{
  if(name==="server-only")return {};
  if(name in mocks)return mocks[name];
  return require(name);
 },cjs,cjs.exports);
 return cjs.exports;
}
function fakeJar(){
 const map=new Map();
 return {
  get:name=>map.get(name),
  set(name,value,opts){
   if(typeof name==="object"){const c=name;map.set(c.name,{...c});return this;}
   map.set(name,{name,value,...opts});return this;
  },
  delete(name){map.delete(name);return this;},
  getAll:()=>[...map.values()],
  map
 };
}
const adminId="23ce4540-e460-44d4-989e-660df2f6faaa";
const targetId="bb089d90-9b9a-4b25-a829-cfbdc88b47f0";
const congressId="b2a80e0c-8aa1-4b0f-984b-938a3566b557";
const secret="test-only-ephemeral-key-value-not-used-in-production-aaaaaaaaaaaa";
const old=process.env.IMPERSONATION_ENCRYPTION_KEY;
process.env.IMPERSONATION_ENCRYPTION_KEY=secret;
const crypt=loadModule("src/lib/impersonation.ts");
if(old===undefined)delete process.env.IMPERSONATION_ENCRYPTION_KEY;
else process.env.IMPERSONATION_ENCRYPTION_KEY=old;
function withSecret(fn){
 const before=process.env.IMPERSONATION_ENCRYPTION_KEY;
 process.env.IMPERSONATION_ENCRYPTION_KEY=secret;
 try{return fn();}finally{
  if(before===undefined)delete process.env.IMPERSONATION_ENCRYPTION_KEY;
  else process.env.IMPERSONATION_ENCRYPTION_KEY=before;
 }
}
function session(){
 const now=Math.floor(Date.now()/1000);
 return {version:1,adminId,targetId,congressId,targetName:"Trưởng BTC",
  createdAt:now,expiresAt:now+1800,adminAccessToken:"admin.jwt.token",
  adminRefreshToken:"admin-refresh-secret"};
}

test("Impersonation encrypted backup: reversible only with server key, cookie stays HttpOnly and chunked",()=>{
 withSecret(()=>{
  const data=session();
  const encoded=crypt.encryptActingSession(data);
  assert.ok(!encoded.includes("admin-refresh-secret"));
  assert.deepEqual(crypt.decryptActingSession(encoded),data);
  const jar=fakeJar();
  crypt.setActingCookies(jar,encoded,true);
  assert.equal(jar.get("daihoi_actor_v1_0").httpOnly,true);
  assert.equal(jar.get("daihoi_actor_v1_0").secure,true);
  assert.equal(jar.get("daihoi_actor_trace_v1").httpOnly,true);
  assert.deepEqual(crypt.readActingSession(jar),data);
  assert.equal(jar.get("daihoi_actor_v1_n").value,"1");
  crypt.clearActingCookies(jar);
  assert.equal(crypt.readActingSession(jar),null);
  assert.equal(jar.get("daihoi_actor_trace_v1"),undefined);
 });
});
test("Impersonation AES GCM rejects tampering, expired backup and wrong encryption key",()=>{
 withSecret(()=>{
  const sealed=crypt.encryptActingSession(session());
  const last=sealed.slice(-1)==="A"?"B":"A";
  assert.equal(crypt.decryptActingSession(sealed.slice(0,-1)+last),null);
  const wrong=session();wrong.adminId=targetId;
  assert.equal(crypt.decryptActingSession(crypt.encryptActingSession(wrong)),null);
  const stale=session();stale.createdAt-=40000;stale.expiresAt-=40000;
  assert.equal(crypt.decryptActingSession(crypt.encryptActingSession(stale)),null);
  process.env.IMPERSONATION_ENCRYPTION_KEY="another-test-key-bbbbbbbbbbbbbbbbbbbbbbbbbb";
  assert.equal(crypt.decryptActingSession(sealed),null);
 });
});
test("HTTP origin validation rejects CSRF, cross-scheme, and cross-host requests",()=>{
 const req=(origin,scheme="https:",host="daihoi.vercel.app",site="same-origin")=>({
  headers:new Headers({"origin":origin,"host":host,"sec-fetch-site":site}),
  nextUrl:new URL(scheme+"//"+host+"/api/admin/impersonation/start")
 });
 assert.equal(crypt.validateSameOrigin(req("https://daihoi.vercel.app")),true);
 assert.equal(crypt.validateSameOrigin(req("https://attacker.invalid")),false);
 assert.equal(crypt.validateSameOrigin(req("http://daihoi.vercel.app")),false);
 assert.equal(crypt.validateSameOrigin(req("https://daihoi.vercel.app","https:","daihoi.vercel.app","cross-site")),false);
});

test("Real acting flow uses magic-link Auth verification, target session and audited Super Admin authorization",()=>{
 const start=read("src/app/api/admin/impersonation/start/route.ts");
 const stop=read("src/app/api/admin/impersonation/stop/route.ts");
 const middleware=read("src/proxy.ts");
 const dashboard=read("src/components/access-control-client.tsx");
 const client=read("src/components/impersonate-account-button.tsx");
 assert.match(start,/profile\?\.platform_role!=="super_admin"/);
 assert.match(start,/if\(actor.id===targetId\)/);
 assert.match(start,/targetProfile\?\.platform_role==="super_admin"/);
 assert.match(start,/generateLink\(\{/);
 assert.match(start,/type:"magiclink"/);
 assert.match(start,/verifyOtp\(\{/);
 assert.match(start,/link.user.id!==targetId/);
 assert.match(start,/verified.user.id!==targetId/);
 assert.match(start,/adminDb.from\("system_logs"\).insert/);
 assert.match(start,/if\(auditError\)\{/);
 assert.match(start,/exchange.auth.setSession\(\{/);
 assert.match(start,/setActingCookies\(response.cookies,encrypted,secure\)/);
 assert.match(stop,/restored.user.id!==acting.adminId/);
 assert.match(stop,/clearActingCookies\(response.cookies\)/);
 assert.match(middleware,/acting.expiresAt<=Math.floor\(Date.now\(\)\/1000\)/);
 assert.match(middleware,/path.startsWith\("\/api\/"\)/);
 assert.match(client,/method:"POST",credentials:"same-origin"/);
 assert.match(client,/location.assign\(body.destination\)/);
 assert.match(dashboard,/ImpersonateAccountButton/);
 assert.doesNotMatch(dashboard,/<Eye[^>]*> Xem giao diện tài khoản/);
});
test("Other users keep same Admin/BTC UI; acting user sees persistent, reversible banner",()=>{
 const notice=read("src/components/acting-session-notice.tsx");
 const app=read("src/app/congresses/[id]/layout.tsx");
 const dashboard=read("src/app/dashboard/page.tsx");
 const portal=read("src/app/my-card/layout.tsx");
 const banner=read("src/components/acting-banner.tsx");
 assert.match(notice,/readActingSession\(await cookies\(\)\)/);
 for(const s of [app,dashboard,portal])assert.match(s,/ActingSessionNotice/);
 assert.match(banner,/X-Daihoi-Acting":"stop"/);
 assert.match(banner,/location.replace\(data.destination/);
 assert.match(read("src/app/api/auth/logout/route.ts"),/clearActingCookies/);
 assert.match(read("src/app/api/auth/login/route.ts"),/clearActingCookies/);
 assert.match(read("src/lib/system-log.ts"),/context.actingAdminId=acting.adminId/);
});

test("Live start endpoint swaps to target Supabase Auth session only after RBAC + durable audit",async()=>{
 const actions=[];
 let auditFail=false,actorRole="super_admin",targetRole="admin";
 const response=body=>({body,status:200,headers:new Headers(),cookies:fakeJar()});
 const mockResponse={NextResponse:{json:(body,opts)=>{
  const result=response(body);result.status=opts?.status??200;
  if(opts?.headers)result.headers=new Headers(opts.headers);
  return result;
 }}};
 const adminDb={
  auth:{admin:{
   getUserById:async()=>({data:{user:{id:targetId,email:"staff@example.invalid"}},error:null}),
   generateLink:async()=>{actions.push("generate");return {data:{
    user:{id:targetId},properties:{hashed_token:"otp-hash"}
   },error:null};}
  }},
  from(table){
   let userId="";
   const q={
    select(){return this},
    eq(key,val){if(key==="id")userId=val;return this;},
    is(){return this},
    maybeSingle:async()=>{
     if(table==="profiles")return {data:userId===adminId?
      {platform_role:actorRole}:{platform_role:"user",full_name:"Trưởng BTC"},error:null};
     if(table==="congress_members")return {data:{role:targetRole},error:null};
     if(table==="congresses")return {data:{id:congressId,name:"Đại hội thử"},error:null};
     return {data:null,error:null};
    },
    insert:async payload=>{actions.push("audit:"+(payload.event||payload.action));return {error:auditFail?{code:"500"}:null};}
   };
   return q;
  }
 };
 const mockAuth={
  auth:{
   getUser:async()=>({data:{user:{id:adminId}},error:null}),
   getSession:async()=>({data:{session:{user:{id:adminId},
    access_token:"orig-admin-access",refresh_token:"orig-admin-refresh"}},error:null}),
   setSession:async session=>{actions.push("swap:"+session.access_token);
    activeResponse.cookies.set("sb-auth","target-session",{path:"/",httpOnly:false});
    return {data:{user:{id:targetId}},error:null};}
  }
 };
 let activeResponse;
 const imp={
  readActingSession:()=>null,
  encryptActingSession:()=> "encrypted-recovery",
  setActingCookies:(jar)=>{jar.set("daihoi_actor_v1_n","1",{httpOnly:true});},
  validateSameOrigin:()=>true,
  IMPERSONATION_SECONDS:1800
 };
 process.env.NEXT_PUBLIC_SUPABASE_URL||="https://unit-test.supabase.co";
 process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||="unit-test-key";
 const router=loadModule("src/app/api/admin/impersonation/start/route.ts",{
  "next/server":mockResponse,
  "@/lib/supabase/admin":{createAdminClient:()=>adminDb},
  "@/lib/impersonation-auth":{createExchangeClient:(_request,res)=>{activeResponse=res;return mockAuth;}},
  "@/lib/auth":{getCongressRole:async()=>targetRole},
  "@/lib/impersonation":imp,
  "@supabase/supabase-js":{createClient:()=>({
   auth:{
    verifyOtp:async()=>{actions.push("verify");return {data:{
     user:{id:targetId},session:{access_token:"target-access",refresh_token:"target-refresh"}
    },error:null};},
    signOut:async()=>{actions.push("cleanup");return {error:null};}
   }
  })}
 });
 const request={
  headers:new Headers({"x-daihoi-acting":"start"}),
  nextUrl:new URL("https://example.org/api/admin/impersonation/start"),
  cookies:fakeJar(),
  json:async()=>({userId:targetId,congressId})
 };
 let result=await router.POST(request);
 assert.equal(result.status,200);
 assert.equal(result.body.destination,"/congresses/"+congressId);
 assert.equal(result.cookies.get("sb-auth").value,"target-session");
 assert.equal(result.cookies.get("daihoi_actor_v1_n").httpOnly,true);
 assert.deepEqual(actions,["generate","verify","audit:auth.impersonation_started","audit:auth.impersonation_started","swap:target-access"]);
 auditFail=true;actions.length=0;result=await router.POST(request);
 assert.equal(result.status,503);
 assert.equal(actions.includes("swap:target-access"),false);
 actorRole="user";actions.length=0;result=await router.POST(request);
 assert.equal(result.status,403);
 assert.equal(actions.includes("generate"),false);
});
test("Stop endpoint restores verified Admin refresh tokens and never returns them in body",async()=>{
 const calls=[];
 const db={from:()=>({
  insert:async()=>({error:null})
 })};
 const mockResponse={NextResponse:{json:(body,options)=>({
  body,status:options?.status??200,cookies:fakeJar(),headers:new Headers()
 })}};
 const acting={...session(),adminAccessToken:"recovery-admin-token",
  adminRefreshToken:"recovery-admin-refresh"};
 const route=loadModule("src/app/api/admin/impersonation/stop/route.ts",{
  "next/server":mockResponse,
  "@/lib/supabase/admin":{createAdminClient:()=>db},
  "@/lib/impersonation":{readActingSession:()=>acting,validateSameOrigin:()=>true,
   clearActingCookies:jar=>{calls.push("cleared");jar.delete("daihoi_actor_v1_n");}},
  "@/lib/impersonation-auth":{createExchangeClient:(_req,res)=>({
   auth:{
    getUser:async()=>({data:{user:{id:targetId}},error:null}),
    setSession:async auth=>{
     calls.push("restore:"+auth.refresh_token);
     res.cookies.set("sb-auth","admin-session",{path:"/"});
     return {data:{user:{id:adminId}},error:null};
    }
   }
  })}
 });
 const request={headers:new Headers({"x-daihoi-acting":"stop"}),
  nextUrl:new URL("https://example.org/api/admin/impersonation/stop"),cookies:fakeJar()};
 const result=await route.POST(request);
 assert.equal(result.status,200);
 assert.equal(result.body.destination,"/dashboard/access?congressId="+congressId);
 assert.deepEqual(calls,["restore:recovery-admin-refresh","cleared"]);
 assert.equal(result.cookies.get("sb-auth").value,"admin-session");
 assert.ok(!JSON.stringify(result.body).includes("recovery-admin-refresh"));
});
