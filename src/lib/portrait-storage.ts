import "server-only";
import sharp from "sharp";
import {createAdminClient} from "@/lib/supabase/admin";
import {isCanonicalPortraitKey,portraitStoragePath} from "@/lib/portrait-policy";

export const PORTRAIT_BUCKET="delegate-photos";
export type PortraitWidth=96|160|600;
export const getPortraitWidth=(value:string|null):PortraitWidth=>
 value==="96"?96:value==="160"?160:600;
export const derivedPortraitPaths=(path:string)=>
 [96,160].map(width=>path.replace(/\.jpg$/i,"-"+width+".jpg"));

/** The original JPEG is the ONLY retained Storage object per portrait.
 * Resize lazily with Sharp. Cached bytes are private to the Node process and
 * this function MUST only be called after checking congress-scoped photo access.
 */
// Short server cache: photo keys are stable and Vercel instances cannot broadcast invalidations.
const EXPIRE_MS=10_000;
const MAX_BYTES=16*1024*1024;
const MAX_ENTRIES=160;
const cache=new Map<string,{bytes:Buffer;expires:number}>();
const inflight=new Map<string,Promise<Buffer|null>>();
let cachedBytes=0;
const revisions=new Map<string,number>();
function isMissingObject(error:{status?:number;statusCode?:string;error?:string;message?:string;name?:string}):boolean{
 if(error.name==="NotFound")return true;
 return error.status===404||error.statusCode==="404"||error.error==="NoSuchKey"||
  error.error==="not_found"||error.message==="Object not found"||
  error.message==="The resource was not found";
}

export function invalidatePortrait(path:string){
 revisions.set(path,(revisions.get(path)||0)+1);
 for(const [key,value] of cache){
  if(key.startsWith(path+"@")){cachedBytes-=value.bytes.length;cache.delete(key);}
 }
 for(const key of inflight.keys())if(key.startsWith(path+"@"))inflight.delete(key);
}

function cachePortrait(key:string,bytes:Buffer){
 if(bytes.length>MAX_BYTES)return;
 const old=cache.get(key);
 if(old){cachedBytes-=old.bytes.length;cache.delete(key);}
 cache.set(key,{bytes,expires:Date.now()+EXPIRE_MS});
 cachedBytes+=bytes.length;
 while(cache.size>MAX_ENTRIES||cachedBytes>MAX_BYTES){
  const oldest=cache.keys().next().value;
  if(!oldest)break;
  cachedBytes-=cache.get(oldest)!.bytes.length;
  cache.delete(oldest);
 }
}
export async function readPortrait(path:string,width:PortraitWidth):Promise<Buffer|null>{
 const key=path+"@"+width;
 const existing=cache.get(key);
 if(existing){
  if(existing.expires>Date.now()){
   cache.delete(key);cache.set(key,existing); // LRU touch
   return existing.bytes;
  }
  cachedBytes-=existing.bytes.length;cache.delete(key);
 }
 const pending=inflight.get(key);
 if(pending)return pending;
 const revision=revisions.get(path)||0;
 const promise=(async()=>{
  let source:Buffer;
  if(width===600){
   if(!isCanonicalPortraitKey(path))return null;
   const storage=createAdminClient().storage.from(PORTRAIT_BUCKET);
   const physical=portraitStoragePath(path);
   // New assets use one media root; existing photos continue to load until
   // the optional copy-first migration has been verified.
   const result=await storage.download(physical);
   let data=result.data;
   if(!data){
    if(result.error&&!isMissingObject(result.error))return null;
    const legacy=await storage.download(path);
    if(legacy.error||!legacy.data)return null;
    data=legacy.data;
   }
   source=Buffer.from(await data.arrayBuffer());
  }else{
   const original=await readPortrait(path,600);
   if(!original)return null;
   source=original;
  }
  const resized=width===600?source:await sharp(source,{limitInputPixels:5_000_000})
   .resize(width,Math.round(width*4/3),{fit:"cover"})
   .jpeg({quality:75,mozjpeg:true}).toBuffer();
  // A concurrent upload may invalidate this in-flight read. Never re-cache
  // an older image after the mutation commits on this same worker.
  if((revisions.get(path)||0)===revision)cachePortrait(key,resized);
  return resized;
 })();
 inflight.set(key,promise);
 try{return await promise;}finally{
  if(inflight.get(key)===promise)inflight.delete(key);
 }
}

/** Remove only reproducible legacy thumbnails. No primary photo is removed. */
export async function removeDerivedPortraits(path:string){
 if(!isCanonicalPortraitKey(path))return;
 const variants=[...derivedPortraitPaths(path),...derivedPortraitPaths(portraitStoragePath(path))];
 const {error}=await createAdminClient().storage.from(PORTRAIT_BUCKET)
  .remove(variants);
 if(error)console.warn("portrait variant cleanup",error.name);
}

/** Free old master only when no profile or BCH record refers to it.
 * Excludes unknown paths and any path belonging to another identity.
 * Caller MUST have already verified authorization and committed the new path.
 */
export async function removeUnreferencedPortrait(path:string,newPath:string){
 if(!path||path===newPath||!isCanonicalPortraitKey(path))
  return;
 const db=createAdminClient();
 const [delegate,bch]=await Promise.all([
  db.from("delegates").select("id",{head:true,count:"exact"}).eq("photo_path",path),
  db.from("bch_candidates").select("id",{head:true,count:"exact"}).eq("photo_path",path)
 ]);
 if(delegate.error||bch.error||delegate.count!==0||bch.count!==0)return;
 const physical=portraitStoragePath(path);
 const {error}=await db.storage.from(PORTRAIT_BUCKET).remove([
  path,physical,...derivedPortraitPaths(path),...derivedPortraitPaths(physical)
 ]);
 if(error)console.warn("unused portrait cleanup",error.name);
}
