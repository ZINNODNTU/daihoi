#!/usr/bin/env node
/**
 * Move ONLY private legacy masters no longer referenced in either table into
 * media/archive/unlinked/*. No deletion of data and no DB modification.
 * Default is dry-run. Run --apply only after the V73 reader is deployed.
 */
import nextEnv from "@next/env";
import {createClient} from "@supabase/supabase-js";
import {createHash} from "node:crypto";
import {isCanonicalPortraitKey} from "../src/lib/portrait-policy.ts";

nextEnv.loadEnvConfig(process.cwd());
const URL="https://pnxdxdagpeyqarucdphk.supabase.co";
if(process.env.NEXT_PUBLIC_SUPABASE_URL!==URL)throw Error("Unapproved Supabase project.");
const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!key||key.length<30)throw Error("Missing service key.");
const db=createClient(URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
const bucket=db.storage.from("delegate-photos");
const {data:bucketInfo,error:bucketError}=await db.storage.getBucket("delegate-photos");
if(bucketError||bucketInfo?.public)throw Error("Private Storage unavailable.");
const PAGE=100;
const dirs=[""],seen=new Set(),candidates=[];
while(dirs.length){
 const prefix=dirs.shift();
 if(seen.has(prefix))continue;
 seen.add(prefix);
 for(let offset=0;offset<100000;offset+=PAGE){
  const {data,error}=await bucket.list(prefix,{limit:PAGE,offset,sortBy:{column:"name",order:"asc"}});
  if(error)throw Error("Cannot list media files.");
  for(const obj of data||[]){
   const path=prefix?prefix+"/"+obj.name:obj.name;
   if(!obj.id||!obj.metadata){dirs.push(path);continue;}
   if(isCanonicalPortraitKey(path))candidates.push(path);
  }
  if((data||[]).length<PAGE)break;
 }
}
async function isReferenced(path){
 const [a,b]=await Promise.all(["delegates","bch_candidates"].map(table=>
  db.from(table).select("id",{count:"exact",head:true}).eq("photo_path",path)));
 if(a.error||b.error)throw Error("Cannot verify database references.");
 return Boolean(a.count||b.count);
}
const sha=data=>createHash("sha256").update(data).digest("hex");
async function bytes(path){
 const {data,error}=await bucket.download(path);
 if(error||!data)throw Error("Unable to verify storage data.");
 return Buffer.from(await data.arrayBuffer());
}
const apply=process.argv.includes("--apply");
const result={legacyMasters:candidates.length,referenced:0,archivable:0,archived:0,failed:0};
for(const old of candidates){
 let phase="references";
 try{
  if(await isReferenced(old)){result.referenced++;continue;}
  result.archivable++;
  if(!apply)continue;
  const target="media/archive/unlinked/"+old;
  phase="read-original";
  const original=await bytes(old);
  phase="inspect-archive";
  const {data:existing,error:existingError}=await bucket.download(target);
  if(existingError&&!["404","NotFound","StorageUnknownError"].includes(String(existingError.statusCode||existingError.name)))throw Error("Archive inspection unavailable");
  if(existing){
   const b=Buffer.from(await existing.arrayBuffer());
   if(sha(original)!==sha(b)){result.failed++;continue;}
  }else{
   phase="copy";
   const {error:copyError}=await bucket.copy(old,target);
   if(copyError){result.failed++;continue;}
  }
  phase="verify-copy";
  const confirmed=await bytes(target);
  if(sha(original)!==sha(confirmed)||await isReferenced(old)){
   result.failed++;continue;
  }
  phase="remove-original";
  const {error:removeError}=await bucket.remove([old]);
  if(removeError){result.failed++;continue;}
  result.archived++;
 }catch(error){
  result.failed++;
  console.warn("archive_failed",phase,error instanceof Error?error.name:"unknown");
 }
}
console.log(JSON.stringify({mode:apply?"archive-verified":"dry-run",...result},null,2));
if(result.failed)process.exitCode=1;
