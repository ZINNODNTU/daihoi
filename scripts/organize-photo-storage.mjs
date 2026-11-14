#!/usr/bin/env node
/**
 * Safe copy-first private portrait Storage organizer.
 *
 * dry run (default): node scripts/organize-photo-storage.mjs
 * stage copies:        node scripts/organize-photo-storage.mjs --apply
 * purge old duplicates AFTER deploying the new reader:
 *                      node scripts/organize-photo-storage.mjs --apply --cleanup-legacy
 *
 * Does not change DB photo_path, grants, bucket policies, account identities,
 * or filenames referenced by the database. Only verified identical copies
 * may allow a legacy object to be removed. Never deletes unknown/orphan files.
 */
import nextEnv from "@next/env";
import {createClient} from "@supabase/supabase-js";
import {createHash} from "node:crypto";
import {isCanonicalPortraitKey,portraitStoragePath} from "../src/lib/portrait-policy.ts";

nextEnv.loadEnvConfig(process.cwd());
const EXPECTED="https://pnxdxdagpeyqarucdphk.supabase.co";
if(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()!==EXPECTED)
 throw new Error("Refusing unapproved Supabase project.");
const key=(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
if(key.length<30)throw new Error("Server-only Supabase key missing");
const apply=process.argv.includes("--apply"),cleanup=process.argv.includes("--cleanup-legacy");
if(cleanup&&!apply)throw new Error("--cleanup-legacy requires --apply");
const client=createClient(EXPECTED,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:bucket,error:bucketError}=await client.storage.getBucket("delegate-photos");
if(bucketError||!bucket||bucket.public)throw new Error("Private bucket missing or public; refusing migration");
const storage=client.storage.from("delegate-photos");
async function refs(table){
 const all=[];
 for(let offset=0;offset<100000;offset+=1000){
  const {data,error}=await client.from(table).select("photo_path")
   .not("photo_path","is",null).range(offset,offset+999);
  if(error)throw new Error("Cannot enumerate photo references in "+table);
  for(const row of data||[])if(row.photo_path)all.push(row.photo_path);
  if((data||[]).length<1000)break;
 }
 return all;
}
const [delegates,bch]=await Promise.all([refs("delegates"),refs("bch_candidates")]);
const unique=[...new Set([...delegates,...bch])];
const count={references:delegates.length+bch.length,unique:unique.length,
 legacy:0,alreadyOrganized:0,copied:0,deletedLegacy:0,
 missingBoth:0,conflicts:0,errors:0,invalidLogicalKeys:0};
const SHA=bytes=>createHash("sha256").update(bytes).digest("hex");
function missing(error){
 const e=error||{};
 return String(e.statusCode)==="404"||e.status===404||e.error==="NoSuchKey"||
  e.message==="Object not found"||e.name==="NotFound"||
  e.message==="The resource was not found";
}
async function get(path){
 const {data,error}=await storage.download(path);
 if(error){
  if(missing(error))return null;
  throw new Error("Storage download failed: "+(error.name||"unknown"));
 }
 return data?Buffer.from(await data.arrayBuffer()):null;
}
for(const logical of unique){
 if(!isCanonicalPortraitKey(logical)){
  count.invalidLogicalKeys++;continue;
 }
 const physical=portraitStoragePath(logical);
 try{
  const [newBytes,legacyBytes]=await Promise.all([get(physical),get(logical)]);
  if(!legacyBytes&&!newBytes){count.missingBoth++;continue;}
  if(legacyBytes)count.legacy++;
  if(newBytes&&legacyBytes&&SHA(newBytes)!==SHA(legacyBytes)){
   count.conflicts++;continue; // never overwrite either original
  }
  if(newBytes&&!legacyBytes){count.alreadyOrganized++;continue;}
  if(!newBytes&&legacyBytes){
   if(!apply)continue;
   const {error:copyError}=await storage.copy(logical,physical);
   if(copyError){count.errors++;continue;}
   const verified=await get(physical);
   if(!verified||SHA(verified)!==SHA(legacyBytes)){
    count.errors++;continue;
   }
   count.copied++;
  }else if(newBytes)count.alreadyOrganized++;
  if(cleanup&&legacyBytes){
   // Source is removed ONLY if the replacement has been downloaded and
   // proven byte-identical. A concurrent edit causes safe refusal.
   const latest=await get(physical);
   const sourceLatest=await get(logical);
   if(!latest||!sourceLatest||SHA(latest)!==SHA(sourceLatest)){
    count.conflicts++;continue;
   }
   const {error:removed}=await storage.remove([logical]);
   if(removed){count.errors++;continue;}
   count.deletedLegacy++;
  }
 }catch{
  count.errors++; // No private paths, UUIDs or image bytes in logs.
 }
}
console.log(JSON.stringify({mode:cleanup?"copy-verify-cleanup":apply?"copy-verify":"dry-run",...count},null,2));
if(count.errors||count.conflicts||count.invalidLogicalKeys||count.missingBoth)process.exitCode=1;
