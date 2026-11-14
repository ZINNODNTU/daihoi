import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
import sharp from "sharp";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const JPEG=await sharp({create:{
 width:600,height:800,channels:3,background:{r:236,g:236,b:236}
}}).jpeg({quality:80}).toBuffer();
const store=new Map();
const counts={download:0,remove:0};
const references={delegates:0,bch_candidates:0};
function admin(){
 return {
  storage:{from(name){
   assert.equal(name,"delegate-photos");
   return {
    async download(path){
     counts.download++;
     const buf=store.get(path);
     return buf?{data:{arrayBuffer:async()=>Uint8Array.from(buf).buffer},error:null}
      :{data:null,error:{name:"NotFound"}};
    },
    async remove(paths){
     counts.remove++;
     for(const path of paths)store.delete(path);
     return {error:null};
    }
   };
  }},
  from(name){
   return {
    select(){
     return {eq:async()=>({count:references[name],error:null})};
    }
   };
  }
 };
}
const source=read("src/lib/portrait-storage.ts");
const policySource=read("src/lib/portrait-policy.ts");
const policyJs=ts.transpileModule(policySource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const policyModule={exports:{}};
new Function("require","module","exports",policyJs)(()=>{throw Error("Unexpected policy dependency");},policyModule,policyModule.exports);
const policy=policyModule.exports;
const js=ts.transpileModule(source,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true
}}).outputText;
const moduleBox={exports:{}};
new Function("require","module","exports",js)(name=>{
 if(name==="server-only")return {};
 if(name==="sharp")return sharp;
 if(name==="@/lib/supabase/admin")return {createAdminClient:admin};
 if(name==="@/lib/portrait-policy")return policy;
 throw Error("unexpected import "+name);
},moduleBox,moduleBox.exports);
const portraits=moduleBox.exports;
const base="a1111111-aaaa-4111-8111-111111111111/d1111111-dddd-4111-8111-111111111111.jpg";

test("One private original powers all three image sizes with a single Storage download",async()=>{
 store.set(policy.portraitStoragePath(base),JPEG);
 const images=await Promise.all([96,160,600,96].map(w=>portraits.readPortrait(base,w)));
 assert.equal(counts.download,1,"reuse base from singleflight cache");
 assert.deepEqual(await Promise.all(images.slice(0,3).map(v=>sharp(v).metadata().then(m=>[m.width,m.height]))),
  [[96,128],[160,213],[600,800]]);
 assert.ok(images[0].length<JPEG.length);
 assert.equal((await portraits.readPortrait(base,96)).equals(images[0]),true);
 assert.equal(counts.download,1);
 portraits.invalidatePortrait(base);
 assert.ok(await portraits.readPortrait(base,96));
 assert.equal(counts.download,2,"invalidation fetches updated master once");
});

test("Generated thumbnails can be deleted without touching the master",async()=>{
 store.set(base,JPEG);
 const variants=portraits.derivedPortraitPaths(base);
 for(const p of variants)store.set(p,JPEG);
 await portraits.removeDerivedPortraits(base);
 assert.equal(store.has(base),true);
 assert.ok(variants.every(p=>!store.has(p)));
 assert.ok(counts.remove>=1);
});

test("Old original only removed if it has no live delegate or BCH references",async()=>{
 const old="b1111111-bbbb-4111-8111-111111111111/d2222222-dddd-4222-8111-222222222222.jpg";
 store.set(old,JPEG);
 const countBefore=counts.remove;
 references.delegates=1;
 await portraits.removeUnreferencedPortrait(old,base);
 assert.equal(store.has(old),true);
 assert.equal(counts.remove,countBefore);
 references.delegates=0;
 references.bch_candidates=1;
 await portraits.removeUnreferencedPortrait(old,base);
 assert.equal(store.has(old),true);
 references.bch_candidates=0;
 await portraits.removeUnreferencedPortrait(old,base);
 assert.equal(store.has(old),false);
 const next=counts.remove;
 await portraits.removeUnreferencedPortrait("random/non-standard.jpg",base);
 assert.equal(counts.remove,next);
});

test("Photo endpoints never create extra 96/160 uploads and check authorization before reading private master",()=>{
 for(const p of ["src/app/api/delegates/[id]/photo/route.ts",
  "src/app/api/bch-candidates/[id]/photo/route.ts"]){
  const route=read(p);
  assert.match(route,/await readPortrait\(/);
  assert.match(route,/await savePortraitObject\(/);
  assert.match(read("src/lib/portrait-upload.ts"),/\.jpeg\(\{quality:78,mozjpeg:true/);
  assert.doesNotMatch(route,/upload\(path\.replace/);
  assert.doesNotMatch(route,/\[96,160\]\.map\(async/);
  assert.match(route,/authorize\(id,(?:"viewer"|false)\)/);
 }
 const audit=read("scripts/audit-photo-storage.mjs");
 assert.match(audit,/--remove-derived/);
 assert.match(audit,/!safeDerived\.length/);
 assert.match(audit,/allPaths\.has\(master\(r\.path\)\)/);
});
