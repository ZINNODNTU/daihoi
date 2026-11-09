import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import {normalizeGender,normalizeBirthDate} from "../src/lib/delegate-demographics.ts";

const source=readFileSync(new URL("../src/app/api/my-card/profile/route.ts",import.meta.url),"utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true
}}).outputText;
const delegateId="a74c23d0-b7a1-4ee7-9bf4-2a0c924aff06";
const congressId="989a191c-4195-4426-ae54-a483a843614b";
const userId="e909030b-c3e4-4bc8-a0e8-fdef81b1e91d";
const own={id:delegateId,congress_id:congressId,auth_user_id:userId,is_active:true};
const fields={full_name:"Nguyễn Thành Nhân",unit:"Đoàn khoa",position:"Bí thư",gender:"male",birth_date:"2004-02-16"};
const payload={delegateId,...fields};

function makeDb({owner=own,owners=[owner],readError=null,updateError=null,emptyUpdate=false,profileError=null}={}){
 const updates=[],readFilters=[],updateFilters=[],profileUpdates=[];
 function chain(kind,changes){
  const filters=new Map();
  function finish(){
   (kind==="read"?readFilters:updateFilters).push(Object.fromEntries(filters));
   if(kind==="read"){
    if(readError)return {data:null,error:{code:readError}};
    return {data:owner&&filters.get("id")===owner.id&&
     filters.get("auth_user_id")===owner.auth_user_id&&
     filters.get("is_active")===true?
      {id:owner.id,congress_id:owner.congress_id}:null,error:null};
   }
   if(updateError)return {data:null,error:{code:updateError}};
   if(emptyUpdate)return {data:[],error:null};
   const matched=filters.get("is_active")===true?
    owners.filter(item=>item&&item.is_active&&item.auth_user_id===filters.get("auth_user_id")):[];
   return {data:matched.map(item=>({id:item.id,congress_id:item.congress_id,...changes})),error:null};
  }
  return {
   select(){return this;},
   eq(key,value){filters.set(key,value);return this;},
   maybeSingle:async()=>finish(),
   then(resolve,reject){return Promise.resolve(finish()).then(resolve,reject);}
  };
 }
 const db={from(table){
  if(table==="profiles")return {upsert:async(record)=>{
   profileUpdates.push(record);return {error:profileError?{code:profileError}:null};
  }};
  assert.equal(table,"delegates");
  return {select:()=>chain("read"),
   update:(changes)=>{updates.push(changes);return chain("write",changes);}};
 }};
 return {db,updates,readFilters,updateFilters,profileUpdates};
}
function handler({user={id:userId},db}){
 const compiledModule={exports:{}};
 const fakeRequire=(specifier)=>{
  if(specifier==="next/server")return {NextResponse:{json:(body,options={})=>new Response(JSON.stringify(body),{
   status:options.status||200,headers:{"Content-Type":"application/json",...options.headers}
  })}};
  if(specifier==="@/lib/auth")return {getAuth:async()=>({user})};
  if(specifier==="@/lib/supabase/admin")return {createAdminClient:()=>db};
  if(specifier==="@/lib/delegate-demographics")return {normalizeGender,normalizeBirthDate};
  throw new Error("Unexpected import "+specifier);
 };
 new Function("require","module","exports",compiled)(fakeRequire,compiledModule,compiledModule.exports);
 return compiledModule.exports.PATCH;
}
function request(data,headers={}){
 return new Request("http://localhost:3000/api/my-card/profile",{method:"PATCH",
  headers:{"Content-Type":"application/json","host":"localhost:3000","origin":"http://localhost:3000",...headers},
  body:typeof data==="string"?data:JSON.stringify(data)});
}

test("API lưu được thông tin từ điện thoại với UUID thật, đúng tài khoản và Đại hội",async()=>{
 const fixture=makeDb();
 const response=await handler(fixture)(request(payload));
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.ok,true);
 assert.equal(result.delegate.birth_date,"2004-02-16");
 assert.equal(result.delegate.gender,"male");
 assert.deepEqual(fixture.updates,[fields]);
 assert.equal(fixture.readFilters[0].auth_user_id,userId);
 assert.deepEqual(fixture.updateFilters[0],{auth_user_id:userId,is_active:true});
 assert.deepEqual(fixture.profileUpdates,[{id:userId,full_name:fields.full_name}]);
 assert.equal(response.headers.get("Cache-Control"),"private, no-store");
});

test("Một lần lưu đồng bộ mọi hồ sơ cùng tài khoản, không chạm hồ sơ người khác",async()=>{
 const second={id:"7df0ce28-2dc4-41b5-8a46-72931f1b79d9",
  congress_id:"8fee0096-d9db-4602-a54d-a791b5820100",auth_user_id:userId,is_active:true};
 const anotherPerson={id:"dc8cbd45-f266-4f0b-b5c1-e15e46fa44d0",
  congress_id:"8fee0096-d9db-4602-a54d-a791b5820100",
  auth_user_id:"dc8093e9-e302-43f0-90dc-28936e0a45e0",is_active:true};
 const fixture=makeDb({owners:[own,second,anotherPerson]});
 const response=await handler(fixture)(request(payload));
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.updatedCongressCount,2);
 assert.equal(fixture.updates.length,1);
 assert.deepEqual(fixture.updateFilters[0],{auth_user_id:userId,is_active:true});
 assert.equal(fixture.profileUpdates.length,1);
});

test("API từ chối hồ sơ người khác dù mã UUID đúng, tuyệt đối không cập nhật",async()=>{
 const fixture=makeDb();
 const result=await handler({user:{id:"a1111111-b222-4333-8444-c55555555555"},db:fixture.db})(request(payload));
 assert.equal(result.status,403);
 assert.equal((await result.json()).code,"not_owner");
 assert.equal(fixture.updates.length,0);
});

test("API từ chối mã UUID thiếu nhóm ký tự từ biểu thức cũ",async()=>{
 const fixture=makeDb();
 const response=await handler(fixture)(request({...payload,
  delegateId:"a74c23d0-b7a1-4ee7-2a0c924aff06"}));
 assert.equal(response.status,400);
 assert.equal((await response.json()).code,"invalid_delegate_id");
 assert.equal(fixture.updates.length,0);
});

test("API xác thực phiên đăng nhập trước khi truy cập dữ liệu",async()=>{
 const fixture=makeDb();
 const response=await handler({user:null,db:fixture.db})(request(payload));
 assert.equal(response.status,401);
 assert.equal((await response.json()).code,"login_required");
 assert.equal(fixture.readFilters.length,0);
});

test("API hiển thị lỗi ngày sinh cụ thể khi ngày không hợp lệ",async()=>{
 const fixture=makeDb();
 const response=await handler(fixture)(request({...payload,birth_date:"31/02/2004"}));
 assert.equal(response.status,400);
 const error=await response.json();
 assert.equal(error.code,"invalid_demographics");
 assert.match(error.error,/Ngày sinh/);
 assert.equal(fixture.readFilters.length,0);
});

test("API từ chối dữ liệu JSON rỗng và request từ origin khác",async()=>{
 const fixture=makeDb();
 const patch=handler(fixture);
 const malformed=await patch(request("{not-valid-json"));
 assert.equal(malformed.status,400);
 assert.equal((await malformed.json()).code,"invalid_json");
 const foreign=await patch(request(payload,{"origin":"https://other.example"}));
 assert.equal(foreign.status,403);
 assert.equal((await foreign.json()).code,"origin_invalid");
 assert.equal(fixture.updates.length,0);
});

test("API phân biệt lỗi database, lỗi hồ sơ biến mất và lỗi migration",async()=>{
 for(const [options,status,code] of [
  [{readError:"PGRST101"},503,"ownership_unavailable"],
  [{updateError:"PGRST116"},503,"database_unavailable"],
  [{updateError:"42703"},503,"schema_outdated"],
  [{emptyUpdate:true},409,"profile_changed"]
 ]){
  const fixture=makeDb(options);
  const result=await handler(fixture)(request(payload));
  assert.equal(result.status,status,code);
  assert.equal((await result.json()).code,code);
 }
});

test("Giao diện xử lý lỗi phiên, mạng, lỗi server không phải JSON và tải lại trang",()=>{
 const ui=readFileSync(new URL("../src/components/delegate-profile-editor.tsx",import.meta.url),"utf8");
 assert.match(ui,/response\.json\(\)\.catch/);
 assert.match(ui,/response\.status===401/);
 assert.match(ui,/e instanceof TypeError/);
 assert.match(ui,/window\.location\.reload\(\)/);
});