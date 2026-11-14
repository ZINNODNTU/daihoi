#!/usr/bin/env node
/**
 * READ-ONLY photo storage audit. Safe for Production:
 *   node scripts/audit-photo-storage.mjs
 * Does not download portraits or print personal filenames / account IDs.
 *
 * Optional after the optimized one-file renderer is deployed:
 *   node scripts/audit-photo-storage.mjs --remove-derived
 * Removes only generated -96/-160.jpg derivatives when their original exists.
 * NEVER removes a primary photo or changes a database row.
 */
import nextEnv from "@next/env";
import {createClient} from "@supabase/supabase-js";
import {isCanonicalPortraitKey,isPhysicalPortraitPath,portraitStoragePath} from "../src/lib/portrait-policy.ts";
nextEnv.loadEnvConfig(process.cwd());
const URL="https://pnxdxdagpeyqarucdphk.supabase.co";
if(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()!==URL)
 throw new Error("Wrong Supabase project; refusing access.");
const key=(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||"").trim();
if(!key)throw new Error("Missing server-only Supabase key");
const db=createClient(URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
const bucket=db.storage.from("delegate-photos");
const {data:info,error:bucketError}=await db.storage.getBucket("delegate-photos");
if(bucketError||!info||info.public)throw new Error("Private bucket not accessible");
const records=[],dirs=[""];
const seenDirs=new Set();
const PAGE=100;
while(dirs.length){
 const prefix=dirs.shift();
 if(seenDirs.has(prefix))continue;
 seenDirs.add(prefix);
 for(let offset=0;offset<100000;offset+=PAGE){
  const {data,error}=await bucket.list(prefix,{limit:PAGE,offset,sortBy:{column:"name",order:"asc"}});
  if(error)throw new Error("Cannot list private bucket: "+(error.code||error.message));
  for(const row of data||[]){
   const path=prefix?prefix+"/"+row.name:row.name;
   if(!row.id||!row.metadata){dirs.push(path);continue;}
   records.push({path,size:Number(row.metadata.size||0),
    updatedAt:row.updated_at||row.created_at||null});
  }
  if((data||[]).length<PAGE)break;
 }
}
const allPaths=new Set(records.map(r=>r.path));
const isDerived=path=>/-(96|160)\.jpg$/i.test(path);
const master=path=>path.replace(/-(96|160)\.jpg$/i,".jpg");
const knownMaster=path=>isCanonicalPortraitKey(path)||isPhysicalPortraitPath(path);
const derived=records.filter(r=>isDerived(r.path));
const safeDerived=derived.filter(r=>knownMaster(master(r.path))&&allPaths.has(master(r.path)));
const unknownDerived=derived.filter(r=>!safeDerived.some(s=>s.path===r.path));
async function references(table){
 const paths=new Set();
 for(let offset=0;offset<100000;offset+=1000){
  const {data,error}=await db.from(table).select("photo_path")
   .not("photo_path","is",null).range(offset,offset+999);
  if(error)throw new Error("Could not audit photo references from "+table);
  for(const row of data||[])if(row.photo_path)paths.add(row.photo_path);
  if((data||[]).length<1000)break;
 }
 return paths;
}
const [delegateRefs,bchRefs]=await Promise.all([references("delegates"),references("bch_candidates")]);
const referenced=new Set([...delegateRefs,...bchRefs]);
const physicalRefs=new Set([...referenced].filter(isCanonicalPortraitKey).map(portraitStoragePath));
const inUse=path=>referenced.has(path)||physicalRefs.has(path);
const unreferencedPrimary=records.filter(r=>!isDerived(r.path)&&knownMaster(r.path)&&!inUse(r.path));
const missingMasters=[...referenced].filter(path=>!allPaths.has(path)&&
 (!isCanonicalPortraitKey(path)||!allPaths.has(portraitStoragePath(path))));
const archivedUnlinkedPhotos=records.filter(row=>row.path.startsWith("media/archive/unlinked/")&&
 isCanonicalPortraitKey(row.path.slice("media/archive/unlinked/".length)));
const archivedPaths=new Set(archivedUnlinkedPhotos.map(item=>item.path));
const unknownStorageKeys=records.filter(row=>!knownMaster(row.path)&&!isDerived(row.path)&&
 !archivedPaths.has(row.path));
const OLD_MS=30*24*60*60*1000;
const agedOrphans=unreferencedPrimary.filter(row=>{
 const lastChanged=Date.parse(row.updatedAt||"");
 return Number.isFinite(lastChanged)&&Date.now()-lastChanged>=OLD_MS;
});
const bytes=rows=>rows.reduce((total,item)=>total+item.size,0);
const mb=value=>+(value/(1024*1024)).toFixed(3);
const report={
 files:records.length,megabytes:mb(bytes(records)),
 primaryPhotos:records.length-derived.length,
 generatedThumbnails:derived.length,thumbnailMegabytes:mb(bytes(derived)),
 safeRedundantThumbnails:safeDerived.length,reclaimableMegabytes:mb(bytes(safeDerived)),
 suspectDerivativesWithoutOriginal:unknownDerived.length,
 unreferencedPrimaryCandidates:unreferencedPrimary.length,
 unreferencedPrimaryMegabytes:mb(bytes(unreferencedPrimary)),
 oldUnreferencedPrimaryCandidates:agedOrphans.length,
 oldUnreferencedPrimaryMegabytes:mb(bytes(agedOrphans)),
 referencedButMissingPrimary:missingMasters.length,
 archivedUnlinkedPhotos:archivedUnlinkedPhotos.length,
 archivedUnlinkedMegabytes:mb(bytes(archivedUnlinkedPhotos)),
 unexpectedStorageKeys:unknownStorageKeys.length,
 referencedPhotoPaths:referenced.size,
 cleanupRequested:process.argv.includes("--remove-derived")
};
console.log(JSON.stringify(report,null,2));
if(process.argv.includes("--remove-derived")){
 if(!safeDerived.length){console.log("No redundant variants to remove.");process.exit(0);}
 // Strictly the generated derivatives. The primary images and unreferenced
 // photos are deliberately untouched: they may be needed for historic records.
 let deleted=0,failed=0;
 for(let i=0;i<safeDerived.length;i+=100){
  const batch=safeDerived.slice(i,i+100).map(row=>row.path);
  const {error}=await bucket.remove(batch);
  if(error){failed+=batch.length;console.error("Thumbnail batch removal failed",error.name);}
  else deleted+=batch.length;
 }
 console.log(JSON.stringify({removedGeneratedThumbnails:deleted,failed,approxReclaimedMB:mb(
   bytes(safeDerived.slice(0,deleted)))}));
 if(failed)process.exitCode=1;
}
