import {NextResponse} from "next/server";
import sharp from "sharp";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const bucket="delegate-photos";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(message:string,status:number)=>NextResponse.json(
 {error:message},{status,headers:{"Cache-Control":"no-store"}}
);
// Cache thumbnail ngắn hạn ở node process; luôn xác minh quyền trước khi sử dụng.
const cached=new Map<string,{body:Buffer;expires:number}>();
function invalidate(path:string){
 for(const key of cached.keys())if(key.startsWith(path+"@"))cached.delete(key);
}
async function thumbnail(path:string,width:number){
 const key=path+"@"+width;
 const existing=cached.get(key);
 if(existing&&existing.expires>Date.now())return existing.body;
 const storage=createAdminClient().storage.from(bucket);
 const sizePath=width===600?path:path.replace(/\.jpg$/i,"-"+width+".jpg");
 const optimized=width===600?null:await storage.download(sizePath);
 let body:Buffer;
 if(optimized?.data){
  body=Buffer.from(await optimized.data.arrayBuffer());
 }else{
  // Older portraits still work even before thumbnails have been generated.
  const {data,error}=await storage.download(path);
  if(error||!data)return null;
  const original=Buffer.from(await data.arrayBuffer());
  body=width===600?original:await sharp(original,{limitInputPixels:5_000_000})
   .resize(width,Math.round(width*4/3),{fit:"cover"})
   .jpeg({quality:78,mozjpeg:true}).toBuffer();
 } cached.delete(key);
 cached.set(key,{body,expires:Date.now()+5*60_000});
 if(cached.size>256)cached.delete(cached.keys().next().value!);
 return body;
}
async function authorize(delegateId:string,level:"viewer"|"admin"){
 if(!uuid.test(delegateId))return {error:fail("Mã đại biểu không hợp lệ.",400)} as const;
 const {supabase,user}=await getAuth();
 if(!user)return {error:fail("Cần đăng nhập.",401)} as const;
 const {data:delegate,error}=await createAdminClient().from("delegates")
  .select("id,congress_id,photo_path,auth_user_id,is_active").eq("id",delegateId).maybeSingle();
 if(error||!delegate)return {error:fail("Không tìm thấy đại biểu.",404)} as const;
 if(!((delegate.auth_user_id===user.id&&delegate.is_active))&&
  !(await hasRole(supabase,user.id,delegate.congress_id,level)))
  return {error:fail("Bạn không có quyền truy cập ảnh này.",403)} as const;
 return {delegate,user} as const;
}
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  const checked=await authorize(id,"viewer");
  if("error" in checked)return checked.error;
  if(!checked.delegate.photo_path)return fail("Đại biểu chưa có ảnh.",404);
  const requested=new URL(request.url).searchParams.get("w");
  const width=requested==="96"?96:requested==="160"?160:600;
  const body=await thumbnail(checked.delegate.photo_path,width);
  if(!body)return fail("Không tải được ảnh đại biểu.",404);
  return new Response(new Uint8Array(body),{
   headers:{"Content-Type":"image/jpeg","Cache-Control":"private, max-age=180, stale-while-revalidate=30",
    "Vary":"Cookie","X-Content-Type-Options":"nosniff","Content-Disposition":"inline"}
  });
 }catch{return fail("Không thể truy cập ảnh.",500);}
}
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  const origin=request.headers.get("origin");
   if(origin&&new URL(origin).host!==request.headers.get("host"))
    return fail("Nguồn tải ảnh không hợp lệ.",403);
   const checked=await authorize(id,"admin");
  if("error" in checked)return checked.error;
  const data=await request.formData();
  const file=data.get("photo");
  if(!(file instanceof File)||file.type!=="image/jpeg"||file.size<1000||file.size>2*1024*1024)
   return fail("Ảnh đã xử lý phải là JPEG, từ 1 KB đến 2 MB.",400);
  const raw=Buffer.from(await file.arrayBuffer());
  const meta=await sharp(raw,{limitInputPixels:5000000}).metadata();
  if(meta.format!=="jpeg"||meta.width!==600||meta.height!==800)
   return fail("Ảnh phải có kích thước 600 × 800 px (tỷ lệ 3:4).",400);
  const output=await sharp(raw,{limitInputPixels:5000000})
   .flatten({background:"#ffffff"}).jpeg({quality:85,mozjpeg:true}).toBuffer();
  const sharedPortrait=checked.delegate.auth_user_id===checked.user.id&&checked.delegate.is_active;
   const path=sharedPortrait?"people/"+checked.user.id+".jpg":checked.delegate.congress_id+"/"+id+".jpg";
  const admin=createAdminClient();
  const {error:uploadError}=await admin.storage.from(bucket).upload(path,output,{
   contentType:"image/jpeg",cacheControl:"0",upsert:true
  });
  if(uploadError)return fail("Không tải ảnh lên được kho lưu trữ. Kiểm tra bucket delegate-photos.",502);
   const update=admin.from("delegates").update({photo_path:path});
   const {error:dbError}=await (sharedPortrait?
    update.eq("auth_user_id",checked.user.id):
    update.eq("id",id).eq("congress_id",checked.delegate.congress_id));
  if(dbError)return fail("Ảnh đã tải lên nhưng chưa liên kết với hồ sơ.",500);
  // Precompute tiny private variants when BTC uploads, not for every viewer.
  const variants=await Promise.allSettled([96,160].map(async width=>{
   const resized=await sharp(output,{limitInputPixels:5_000_000})
    .resize(width,Math.round(width*4/3),{fit:"cover"})
    .jpeg({quality:78,mozjpeg:true}).toBuffer();
   return admin.storage.from(bucket).upload(path.replace(/\.jpg$/i,"-"+width+".jpg"),resized,{
    contentType:"image/jpeg",cacheControl:"180",upsert:true
   });
  }));
  if(variants.some(result=>result.status==="rejected"||(result.status==="fulfilled"&&Boolean(result.value.error))))
   console.warn("delegate thumbnail fallback required");
  invalidate(path);
  return NextResponse.json({ok:true,path,shared:sharedPortrait},{headers:{"Cache-Control":"no-store"}});
 }catch{return fail("Ảnh không hợp lệ hoặc máy chủ không xử lý được.",400);}
}