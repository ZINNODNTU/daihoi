import "server-only";
import {createHash} from "node:crypto";
import sharp from "sharp";
import {createAdminClient} from "@/lib/supabase/admin";
import {
 PORTRAIT_BUCKET,invalidatePortrait,removeDerivedPortraits,
 removeUnreferencedPortrait
} from "@/lib/portrait-storage";
import {isCanonicalPortraitKey} from "@/lib/portrait-policy";

const MAX_UPLOAD=2*1024*1024;
const MAX_PIXELS=5_000_000;
const locks=new Map<string,Promise<void>>();

export class PortraitError extends Error{
 constructor(message:string,public readonly status:number=500){
  super(message);
  this.name="PortraitError";
 }
}
/** Serializes uploads by path within a server instance. Cross-instance writes
 * remain last-writer-wins: immutable keys would require a schema migration. */
async function locked<T>(path:string,action:()=>Promise<T>):Promise<T>{
 const previous=locks.get(path);
 let release!:()=>void;
 const next=new Promise<void>(resolve=>{release=resolve;});
 locks.set(path,next);
 if(previous)await previous;
 try{return await action();}
 finally{release();if(locks.get(path)===next)locks.delete(path);}
}

export async function preparePortrait(file:File){
 if(file.type!=="image/jpeg"||file.size<1000||file.size>MAX_UPLOAD)
  throw new PortraitError("Ảnh tải lên phải là JPEG từ 1 KB đến 2 MB.",400);
 const raw=Buffer.from(await file.arrayBuffer());
 try{
  const metadata=await sharp(raw,{limitInputPixels:MAX_PIXELS}).metadata();
  if(metadata.format!=="jpeg"||metadata.width!==600||metadata.height!==800)
   throw new PortraitError("Ảnh phải là JPEG 600 × 800 px.",400);
  // A single deterministic encoding: no EXIF/GPS, white background, 4:3 crop.
  const output=await sharp(raw,{limitInputPixels:MAX_PIXELS})
   .flatten({background:"#ffffff"})
   .jpeg({quality:78,mozjpeg:true,chromaSubsampling:"4:2:0"})
   .toBuffer();
  if(output.length>MAX_UPLOAD)throw new PortraitError("Ảnh vượt dung lượng cho phép.",400);
  return {bytes:output,digest:createHash("sha256").update(output).digest("hex"),inputBytes:raw.length};
 }catch(error){
  if(error instanceof PortraitError)throw error;
  throw new PortraitError("Ảnh JPEG không hợp lệ hoặc bị hỏng.",400);
 }
}
function notFound(error:unknown){
 const e=error as {status?:number;statusCode?:string;error?:string;message?:string};
 return e&&(
  e.status===404||e.statusCode==="404"||e.error==="NoSuchKey"||
  e.error==="not_found"||e.message==="Object not found"
 );
}
export type PortraitSaveResult={
 changed:boolean;sha256:string;size:number;
};
/** Only writes the canonical key. A byte-identical reupload is a no-op.
 * Linking happens AFTER a successful Storage write; an unreferenced newly
 * created object is removed if the database update fails.
 */
export async function savePortraitObject(options:{
 path:string;
 bytes:Buffer;
 digest:string;
 commit:(changed:boolean)=>Promise<void>;
}):Promise<PortraitSaveResult>{
 const {path,bytes,digest,commit}=options;
 if(!isCanonicalPortraitKey(path))
  throw new PortraitError("Đường dẫn ảnh không hợp lệ.",400);
 if(bytes.length===0||bytes.length>MAX_UPLOAD)
  throw new PortraitError("Dung lượng ảnh không hợp lệ.",400);
 return locked(path,async()=>{
  const storage=createAdminClient().storage.from(PORTRAIT_BUCKET);
  const existing=await storage.download(path);
  if(existing.error&&!notFound(existing.error))
   throw new PortraitError("Không kiểm tra được ảnh trong Storage.",502);
  const old=existing.data?Buffer.from(await existing.data.arrayBuffer()):null;
  const changed=!old||!old.equals(bytes);
  if(changed){
   const upload=await storage.upload(path,bytes,{
    contentType:"image/jpeg",cacheControl:"0",upsert:true
   });
   if(upload.error){
    console.error("portrait storage upload",upload.error.name);
    throw new PortraitError("Không thể lưu ảnh lên Supabase Storage.",502);
   }
  }
  try{await commit(changed);}
  catch(error){
   // If the master did not exist prior to this request, it cannot safely be
   // referenced by this failed operation. Confirm DB references before removal.
   if(!old){
    try{await removeUnreferencedPortrait(path,"");}
    catch(cleanupError){console.error("portrait recovery",cleanupError instanceof Error?cleanupError.name:"unknown");}
   }
   throw error;
  }
  if(changed){
   invalidatePortrait(path);
   await removeDerivedPortraits(path);
  }
  return {changed,sha256:digest,size:bytes.length};
 });
}
