import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import sharp from "sharp";
import ts from "typescript";

const source=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
function evaluate(path,deps={}){
 const js=ts.transpileModule(source(path),{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true
 }}).outputText;
 const box={exports:{}};
 new Function("require","module","exports",js)(name=>{
  if(name==="server-only")return {};
  if(name in deps)return deps[name];
  throw new Error("Unexpected test import "+name);
 },box,box.exports);
 return box.exports;
}
const policy=evaluate("src/lib/portrait-policy.ts");
const congress="79e7f633-e824-4a9d-ba25-d0fa59349a26";
const user="123e4567-e89b-42d3-a456-426614174000";
const delegate="a2222222-2222-4222-8222-222222222222";
const candidate="b3333333-3333-4333-8333-333333333333";
const path=policy.delegatePortraitKey(congress,delegate);
const store=new Map();
const telemetry={downloads:0,uploads:0,cleanup:0,invalidations:0,derived:0};
let failRead=false,failUpload=false;
function storage(){
 return{
  async download(key){
   telemetry.downloads++;
   if(failRead)return {data:null,error:{status:503,name:"ServiceUnavailable"}};
   const bytes=store.get(key);
   if(!bytes)return {data:null,error:{statusCode:"404",name:"NotFound"}};
   return {data:{arrayBuffer:async()=>Uint8Array.from(bytes).buffer},error:null};
  },
  async upload(key,data,opts){
   telemetry.uploads++;
   assert.equal(opts.contentType,"image/jpeg");
   assert.equal(opts.cacheControl,"0","Mutable private portrait keys must not linger at CDN edge");
   assert.equal(opts.upsert,true);
   if(failUpload)return {error:{name:"UploadError"}};
   store.set(key,Buffer.from(data));return {error:null};
  }
 };
}
const uploading=evaluate("src/lib/portrait-upload.ts",{
 "sharp":sharp,"node:crypto":{createHash},
 "@/lib/supabase/admin":{createAdminClient:()=>({storage:{from:()=>storage()}})},
 "@/lib/portrait-policy":policy,
 "@/lib/portrait-storage":{
  PORTRAIT_BUCKET:"delegate-photos",
  invalidatePortrait:()=>{telemetry.invalidations++;},
  removeDerivedPortraits:async()=>{telemetry.derived++;},
  removeUnreferencedPortrait:async key=>{store.delete(key);telemetry.cleanup++;}
 }
});
const pixels=Buffer.alloc(600*800*3);
for(let i=0;i<pixels.length;i++)pixels[i]=(i*17+(i>>>11))%256;
const jpeg=await sharp(pixels,{raw:{width:600,height:800,channels:3}})
 .jpeg({quality:86}).toBuffer();
const digest=data=>createHash("sha256").update(data).digest("hex");

test("Canonical portrait paths remain stable and congress-scoped (migration-free)",()=>{
 assert.equal(path,congress+"/"+delegate+".jpg");
 assert.equal(policy.sharedPortraitKey(user),"people/"+user+".jpg");
 assert.equal(policy.bchPortraitKey(congress,candidate),congress+"/bch/"+candidate+".jpg");
 assert.equal(policy.isAuthorizedDelegatePhotoKey(path,congress,delegate,user),true);
 assert.equal(policy.isAuthorizedDelegatePhotoKey("people/"+user+".jpg",congress,delegate,user),true);
 assert.equal(policy.isAuthorizedDelegatePhotoKey("people/"+delegate+".jpg",congress,delegate,user),false);
 assert.equal(policy.isAuthorizedDelegatePhotoKey(
  congress+"/"+candidate+".jpg",congress,delegate,null),false);
 assert.equal(policy.isAuthorizedBchPhotoKey(policy.bchPortraitKey(congress,candidate),congress,candidate),true);
 assert.equal(policy.isCanonicalPortraitKey("people/../../secrets.jpg"),false);
 assert.throws(()=>policy.sharedPortraitKey("../secret"));
});

test("Server re-encodes to 600x800, strips metadata, rejects untrusted formats",async()=>{
 const file=new File([jpeg],"photo.jpg",{type:"image/jpeg"});
 const prepared=await uploading.preparePortrait(file);
 assert.equal(prepared.digest,digest(prepared.bytes));
 const meta=await sharp(prepared.bytes).metadata();
 assert.equal(meta.width,600);assert.equal(meta.height,800);
 assert.equal(meta.exif,undefined);
 await assert.rejects(
  uploading.preparePortrait(new File([jpeg],"fake.png",{type:"image/png"})),
  error=>error.status===400
 );
 const small=await sharp(jpeg).resize(300,400).jpeg().toBuffer();
 await assert.rejects(
  uploading.preparePortrait(new File([small],"small.jpg",{type:"image/jpeg"})),
  error=>error.status===400
 );
});

test("Repeated identical uploads do not create new objects, update callback sees unchanged",async()=>{
 store.clear();failRead=false;failUpload=false;
 const seen=[];
 const opts={path,bytes:jpeg,digest:digest(jpeg),commit:async changed=>{seen.push(changed);}};
 const first=await uploading.savePortraitObject(opts);
 assert.equal(first.changed,true);
 const second=await uploading.savePortraitObject(opts);
 assert.equal(second.changed,false);
 assert.deepEqual(seen,[true,false]);
 assert.equal(telemetry.uploads,1);
 assert.equal(store.size,1);
 assert.equal(telemetry.derived,1);
});

test("Concurrent requests to the same photo serialize and deduplicate within an instance",async()=>{
 store.clear();telemetry.uploads=0;
 const upload=()=>uploading.savePortraitObject({
  path,bytes:jpeg,digest:digest(jpeg),commit:async()=>{}
 });
 const results=await Promise.all(Array.from({length:5},upload));
 assert.deepEqual(results.map(x=>x.changed),[true,false,false,false,false]);
 assert.equal(telemetry.uploads,1);
});

test("Storage read failures block writes instead of assuming new photo",async()=>{
 failRead=true;telemetry.uploads=0;
 await assert.rejects(
  uploading.savePortraitObject({path,bytes:jpeg,digest:digest(jpeg),commit:async()=>{}}),
  error=>error.status===502
 );
 assert.equal(telemetry.uploads,0);
 failRead=false;
});

test("New orphan is cleaned on database failure; existing original is preserved",async()=>{
 store.clear();telemetry.cleanup=0;
 const opts={path,bytes:jpeg,digest:digest(jpeg),commit:async()=>{throw new Error("DB failed");}};
 await assert.rejects(uploading.savePortraitObject(opts),/DB failed/);
 assert.equal(store.has(path),false);
 assert.equal(telemetry.cleanup,1);
 store.set(path,jpeg);
 const newer=await sharp(jpeg).tint({r:248,g:90,b:40}).jpeg().toBuffer();
 await assert.rejects(uploading.savePortraitObject({...opts,bytes:newer,digest:digest(newer)}),/DB failed/);
 assert.equal(store.has(path),true,"never erase an old master after a failed DB update");
 assert.equal(telemetry.cleanup,1);
});

test("Upload errors fail closed without modifying existing photos",async()=>{
 store.clear();store.set(path,jpeg);failUpload=true;
 const next=await sharp(jpeg).tint({r:40,g:122,b:92}).jpeg().toBuffer();
 await assert.rejects(uploading.savePortraitObject({
  path,bytes:next,digest:digest(next),commit:async()=>{}
 }),error=>error.status===502);
 assert.deepEqual(store.get(path),jpeg);
 failUpload=false;
});

test("Private photo routes restrict keys and do not expose signed/public storage URLs",()=>{
 const delegateRoute=source("src/app/api/delegates/[id]/photo/route.ts");
 const bchRoute=source("src/app/api/bch-candidates/[id]/photo/route.ts");
 for(const route of [delegateRoute,bchRoute]){
  assert.match(route,/getAuth\(/);
  assert.match(route,/preparePortrait\(file\)/);
  assert.match(route,/savePortraitObject\(/);
  assert.match(route,/Cache-Control":"private, no-store/);
  assert.doesNotMatch(route,/getPublicUrl|createSignedUrl/);
 }
 assert.match(delegateRoute,/isAuthorizedDelegatePhotoKey/);
 assert.match(bchRoute,/isAuthorizedBchPhotoKey/);
 assert.match(bchRoute,/hasCongressAbility\(supabase,user\.id,candidate\.congress_id,"bch.read"\)/);
});
