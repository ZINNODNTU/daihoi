import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const load=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const policy=load("src/lib/delegate-password-policy.ts");
const defaultPassword="Abc@123456";
const congressId="b84c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const delegateId="a74c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const adminId="d94c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const ownerId="c94c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const email="1822040304@dntu.edu.vn";
const authEmail="1822040304@accounts.daihoi.invalid";

function fixture({exists=false,authorized=true}={}){
 const calls={created:[],resets:[],deleted:[],audits:[],logs:[]};
 const delegate={id:delegateId,full_name:"Nguyễn Thành Nhân",student_id:"1822040304",
  login_email:email,auth_user_id:null,delegate_type:"official",birth_date:"2004-02-16"};
 const db={
  auth:{admin:{
   async listUsers(){return {data:{users:exists?[{id:ownerId,email:authEmail}]:[]},error:null};},
   async createUser(data){calls.created.push(data);return {data:{user:{id:ownerId}},error:null};},
   async updateUserById(...args){calls.resets.push(args);return {error:null};},
   async deleteUser(id){calls.deleted.push(id);return {error:null};}
  }},
  from(table){
   const query={
    selectCols:"",isUpdate:false,
    select(cols){this.selectCols=cols;return this;},
    eq(){return this;},in(){return this;},limit(){return this;},is(){return this;},
    update(){this.isUpdate=true;return this;},
    async maybeSingle(){return {data:this.isUpdate?{id:delegateId}:null,error:null};},
    async insert(payload){
     if(table==="audit_logs")calls.audits.push(payload);
     return {error:null};
    },
    then(ok,fail){
     const data=table==="delegates"?
      this.selectCols.includes("auth_user_id,delegate_type")?[delegate]:[]:[];
     return Promise.resolve({data,error:null}).then(ok,fail);
    }
   };
   return query;
  }
 };
 const code=ts.transpileModule(load("src/app/api/delegates/accounts/route.ts"),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
 }).outputText;
 const mod={exports:{}};
 new Function("require","module","exports",code)(name=>{
  if(name==="next/server")return {NextResponse:{json:(data,options={})=>
   new Response(JSON.stringify(data),{status:options.status||200,headers:options.headers})}};
  if(name==="@/lib/delegate-password-policy")return {DEFAULT_DELEGATE_PASSWORD:defaultPassword};
  if(name==="@/lib/delegate-identity")return {isSameDelegateIdentity:()=>true};
  if(name==="@/lib/supabase/admin")return {createAdminClient:()=>db};
  if(name==="@/lib/auth")return {getAuth:async()=>({user:{id:adminId},supabase:{}}),hasCongressAbility:async()=>authorized};
  if(name==="@/lib/login-identity")return {toSupabaseAuthEmail:()=>authEmail};
  if(name==="@/lib/system-log")return {writeSystemLog:async log=>{calls.logs.push(log);return "ok";}};
  throw Error("Unknown module "+name);
 },mod,mod.exports);
 return {POST:mod.exports.POST,calls};
}

function request(body={congressId,delegateIds:[delegateId]}){
 return new Request("http://localhost:3000/api/delegates/accounts",{
  method:"POST",headers:{"Content-Type":"application/json","host":"localhost:3000"},
  body:JSON.stringify(body)
 });
}

test("New delegate Auth user always receives the default password and one-time Excel response",async()=>{
 assert.ok(policy.includes('DEFAULT_DELEGATE_PASSWORD="Abc@123456"'));
 process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||="test-key";
 const f=fixture();
 const response=await f.POST(request({...{congressId,delegateIds:[delegateId]},password:"client-supplied"}));
 assert.equal(response.status,200);
 assert.equal(f.calls.created.length,1);
 assert.equal(f.calls.created[0].password,defaultPassword);
 assert.equal(f.calls.created[0].email,authEmail);
 assert.deepEqual((await response.json()).created.map(item=>item.password),[defaultPassword]);
 assert.equal(f.calls.resets.length,0);
 assert.equal(f.calls.deleted.length,0);
 assert.equal(f.calls.audits.length,1);
 assert.ok(!JSON.stringify(f.calls.audits).includes(defaultPassword));
 assert.ok(!JSON.stringify(f.calls.logs).includes(defaultPassword));
});

test("Linking an existing Auth user to another congress does not overwrite their personal password",async()=>{
 process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||="test-key";
 const f=fixture({exists:true});
 const response=await f.POST(request());
 const body=await response.json();
 assert.equal(response.status,200);
 assert.equal(body.linkedExisting,1);
 assert.deepEqual(body.created,[]);
 assert.equal(f.calls.created.length,0);
 assert.equal(f.calls.resets.length,0);
 assert.equal(f.calls.deleted.length,0);
});

test("Unauthorized admin cannot create accounts with the shared default password",async()=>{
 process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||="test-key";
 const f=fixture({authorized:false});
 const response=await f.POST(request());
 assert.equal(response.status,403);
 assert.equal(f.calls.created.length,0);
 assert.equal(f.calls.resets.length,0);
});
