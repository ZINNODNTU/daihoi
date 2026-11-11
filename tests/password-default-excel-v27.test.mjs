import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const source=read("../src/app/api/delegates/accounts/reset/route.ts");
const compile=ts.transpileModule(source,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true
}}).outputText;
const congress="b84c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const delegate="a74c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const owner="c94c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const staffAdmin="d94c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const expected="Abc@123456";
function fixture({userId=staffAdmin,canManage=true,staff=false,delegateExists=true}={}){
 const calls={resets:[],audits:[]};
 const db={
  auth:{admin:{
   async updateUserById(id,data){calls.resets.push({id,data});return {error:null};}
  }},
  from(table){
   const chain={
    select(){return this;},eq(){return this;},in(){return this;},limit(){return this;},
    async maybeSingle(){
     if(table==="delegates")return {data:delegateExists?
      {id:delegate,full_name:"Nguyễn Văn A",login_email:"abc@dntu.edu.vn",
       auth_user_id:owner,is_active:true}:null,error:null};
     if(table==="profiles")return {data:{platform_role:"user"},error:null};
     return {data:null,error:null};
    },
    insert(record){calls.audits.push({table,record});return Promise.resolve({error:null});},
    then(resolve,reject){
     if(table==="congress_members")return Promise.resolve({
      data:staff?[{role:"admin"}]:[],error:null
     }).then(resolve,reject);
     return Promise.resolve({data:[],error:null}).then(resolve,reject);
    }
   };
   return chain;
  }
 };
 const m={exports:{}};
 new Function("require","module","exports",compile)(name=>{
  if(name==="next/server")return {NextResponse:{json:(data,options={})=>
   new Response(JSON.stringify(data),{status:options.status||200,
    headers:{"Content-Type":"application/json",...options.headers}})}};
  if(name==="@/lib/auth")return {getAuth:async()=>({user:userId?{id:userId}:null,supabase:{}}),
   hasRole:async()=>canManage};
  if(name==="@/lib/supabase/admin")return {createAdminClient:()=>db};
  if(name==="@/lib/system-log")return {writeSystemLog:async()=>""};
  if(name==="@/lib/delegate-password-policy")return {DEFAULT_DELEGATE_PASSWORD:expected};
  throw Error("Unexpected import "+name);
 },m,m.exports);
 return {POST:m.exports.POST,calls};
}
function request(rest={},origin="http://localhost:3000"){
 return new Request("http://localhost:3000/api/delegates/accounts/reset",{
  method:"POST",headers:{"Content-Type":"application/json","host":"localhost:3000","origin":origin},
  body:JSON.stringify({congressId:congress,delegateId:delegate,...rest})
 });
}
test("Reset chính xác về Abc@123456, không ghi mật khẩu vào audit log",async()=>{
 const f=fixture();
 const result=await f.POST(request());
 assert.equal(result.status,200);
 const data=await result.json();
 assert.equal(data.password,expected);
 assert.deepEqual(f.calls.resets,[{id:owner,data:{password:expected}}]);
 assert.equal(f.calls.audits.length,1);
 assert.equal(f.calls.audits[0].record.action,"delegate.password_reset");
 assert.ok(!JSON.stringify(f.calls.audits).includes(expected));
 assert.equal(result.headers.get("Cache-Control"),"private, no-store");
});

test("Client không được đặt mật khẩu tùy ý; phiên không đủ quyền không được reset",async()=>{
 const f=fixture();
 assert.equal((await f.POST(request({password:"some_custom_password"}))).status,400);
 const anonymous=fixture({userId:null});
 assert.equal((await anonymous.POST(request())).status,401);
 const noAdmin=fixture({canManage:false});
 assert.equal((await noAdmin.POST(request())).status,403);
 const staff=fixture({staff:true});
 assert.equal((await staff.POST(request())).status,403);
 const foreign=fixture();
 assert.equal((await foreign.POST(request({},"https://attacker.example"))).status,403);
 assert.equal(f.calls.resets.length+anonymous.calls.resets.length+noAdmin.calls.resets.length+
  staff.calls.resets.length+foreign.calls.resets.length,0);
});

test("Excel danh sách hiển thị cột mật khẩu cấp/reset trong phiên; không đoán mật khẩu cũ",()=>{
 const ui=read("../src/components/delegate-accounts-client.tsx");
 assert.match(ui,/Mật khẩu vừa cấp\/reset/);
 assert.match(ui,/const known=new Map\(\(includePasswords\?issued:\[\]\)\.map/);
 assert.match(ui,/known\.get\(d\.id\)\|\|""/);
 assert.match(ui,/Không đọc được mật khẩu hiện tại/);
 assert.match(ui,/const DEFAULT_PASSWORD=DEFAULT_DELEGATE_PASSWORD/);
 assert.equal(read("../src/lib/delegate-password-policy.ts").includes('DEFAULT_DELEGATE_PASSWORD="Abc@123456"'),true);
 assert.doesNotMatch(ui,/localStorage|sessionStorage/);
 assert.match(ui,/Xác nhận|Reset về mặc định/);
 assert.match(ui,/setIssued\(\[\]\)/);
});
