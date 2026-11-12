import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {PGlite} from "@electric-sql/pglite";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const congress="bb4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const other="cc4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const superadmin="aa4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const delegate="dd4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const staff="ee4c23d0-b7a1-4ee7-9bf4-2a0c924aff06";

test("V45 migration cleans accidental delegate/BTC roles and super-admin memberships without deleting accounts",async t=>{
 const db=new PGlite();
 t.after(()=>db.close());
 await db.exec(`CREATE ROLE authenticated;CREATE ROLE anon;CREATE ROLE service_role;
 CREATE SCHEMA auth;CREATE SCHEMA private;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT null::uuid $$;
 CREATE FUNCTION private.is_super_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
 CREATE TABLE public.profiles(id uuid PRIMARY KEY,platform_role text NOT NULL DEFAULT 'user');
 CREATE TABLE public.congresses(id uuid PRIMARY KEY);
 CREATE TABLE public.congress_members(congress_id uuid NOT NULL,user_id uuid NOT NULL,role text NOT NULL,
 PRIMARY KEY(congress_id,user_id));
 CREATE TABLE public.delegates(id uuid PRIMARY KEY,congress_id uuid NOT NULL,auth_user_id uuid,
 delegate_type text NOT NULL DEFAULT 'official');
 INSERT INTO auth.users VALUES ('${superadmin}'),('${delegate}'),('${staff}');
 INSERT INTO public.profiles VALUES ('${superadmin}','super_admin'),('${delegate}','user'),('${staff}','user');
 INSERT INTO public.congresses VALUES ('${congress}'),('${other}');
 INSERT INTO public.congress_members VALUES
 ('${congress}','${superadmin}','admin'),
 ('${other}','${superadmin}','admin'),
 ('${congress}','${delegate}','admin');
 INSERT INTO public.delegates VALUES ('ef4c23d0-b7a1-4ee7-9bf4-2a0c924aff06','${congress}','${delegate}','official');`);
 const sql=read("supabase/upgrade-btc-independent-accounts-v45.sql");
 await db.exec(sql);
 assert.equal((await db.query("select count(*)::int as count from public.congress_members where user_id=$1",[superadmin])).rows[0].count,0);
 assert.equal((await db.query("select role from public.congress_members where user_id=$1",[delegate])).rows[0].role,"delegate");
 assert.equal((await db.query("select count(*)::int as count from auth.users")).rows[0].count,3);
 await db.exec(`INSERT INTO public.btc_accounts(user_id,congress_id,login_email,full_name)
 VALUES ('${staff}','${congress}','btc-unique@staff.daihoi.invalid','Independent Staff');
 INSERT INTO public.congress_members VALUES('${congress}','${staff}','admin');`);
 await assert.rejects(()=>db.exec(`INSERT INTO public.congress_members VALUES('${other}','${staff}','admin');`));
 await assert.rejects(()=>db.exec(`UPDATE public.congress_members SET role='admin'
 WHERE user_id='${delegate}'`));
 await assert.rejects(()=>db.exec(`INSERT INTO public.delegates VALUES
 ('ff4c23d0-b7a1-4ee7-9bf4-2a0c924aff06','${congress}','${staff}','official');`));
 await assert.rejects(()=>db.exec(`INSERT INTO public.congress_members VALUES
 ('${other}','${superadmin}','admin');`));
 assert.equal((await db.query("select count(*)::int as count from auth.users")).rows[0].count,3);
 assert.equal((await db.query("select count(*)::int as count from public.btc_accounts")).rows[0].count,1);
});

function compile(path,mocks){
 const js=ts.transpileModule(read(path),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const testModule={exports:{}};
 new Function("require","module","exports",js)(name=>{
  if(name==="next/server")return {NextResponse:{json:(data,options={})=>
   new Response(JSON.stringify(data),{status:options.status||200,headers:options.headers})}};
  if(name==="node:crypto")return {randomBytes:(bytes)=>({toString:()=>bytes===7?"d".repeat(14):"S".repeat(28)})};
  if(name in mocks)return mocks[name];
  throw Error("Unexpected import "+name);
 },testModule,testModule.exports);
 return testModule.exports;
}
function request(method,body,endpoint="/api/congress-members"){
 return new Request("https://daihoi.example"+endpoint,{method,
  headers:{"Content-Type":"application/json",host:"daihoi.example",origin:"https://daihoi.example"},
  body:JSON.stringify(body)});
}

test("BTC API creates fresh Auth identity instead of reusing existing delegate or other congress account",async()=>{
 const ops=[],logs=[];
 const db={
  auth:{admin:{
   createUser:async options=>{ops.push(["createUser",options]);return {data:{user:{id:staff}},error:null};},
   deleteUser:async()=>({error:null})
  }},
  from:table=>({
   insert(input){ops.push([table,"insert",input]);return Promise.resolve({error:null});},
   delete(){return this;},eq(){return this;}
  })
 };
 const route=compile("src/app/api/congress-members/route.ts",{
  "@/lib/auth":{getAuth:async()=>({user:{id:superadmin},supabase:{}}),hasCongressAbility:async()=>true},
  "@/lib/supabase/admin":{createAdminClient:()=>db},
  "@/lib/system-log":{writeSystemLog:async data=>{logs.push(data);return "req";}}
 }).POST;
 const response=await route(request("POST",{congressId:congress,fullName:"Nguyễn Văn A",role:"admin"}));
 assert.equal(response.status,201);
 const body=await response.json();
 assert.equal(body.account.email,"btc-"+congress.slice(0,8)+"-"+"d".repeat(14)+"@staff.daihoi.invalid");
 assert.ok(body.initialPassword.endsWith("!A7"));
 const created=ops.find(x=>x[0]==="createUser")[1];
 assert.equal(created.app_metadata.account_kind,"btc");
 assert.equal(created.app_metadata.btc_congress_id,congress);
 assert.equal(created.email_confirm,true);
 assert.ok(!ops.some(x=>x[0]==="delegates"));
 assert.ok(ops.some(x=>x[0]==="btc_accounts"));
 assert.ok(ops.some(x=>x[0]==="congress_members"));
 assert.equal(logs[0].event,"btc.account_created");
});

test("No BTC creation by delegate, no unconstrained user/email reuse or client-supplied password",async()=>{
 let attempted=false;
 const deny=compile("src/app/api/congress-members/route.ts",{
  "@/lib/auth":{getAuth:async()=>({user:{id:delegate},supabase:{}}),hasCongressAbility:async()=>false},
  "@/lib/supabase/admin":{createAdminClient:()=>{attempted=true;throw Error("should not reach")}},
  "@/lib/system-log":{writeSystemLog:async()=>""}
 }).POST;
 assert.equal((await deny(request("POST",{congressId:congress,fullName:"Delegate",role:"admin"}))).status,403);
 assert.equal((await deny(request("POST",{congressId:congress,fullName:"Operator",role:"guest"}))).status,400);
 assert.equal(attempted,false);
 const ui=read("src/components/congress-team-client.tsx");
 const route=read("src/app/api/congress-members/route.ts");
 assert.doesNotMatch(route,/inviteUserByEmail|findUserByEmail/);
 assert.match(ui,/Tạo tài khoản BTC/);
 assert.match(ui,/Cấp lại/);
 assert.match(ui,/Thu hồi/);
 assert.match(ui,/Sao chép/);
 assert.match(read("src/lib/auth.ts"),/btc_accounts/);
 assert.match(read("src/lib/system-log-access.ts"),/btc_accounts/);
 assert.match(read("src/app/api/auth/login/route.ts"),/isStaffUser/);
});