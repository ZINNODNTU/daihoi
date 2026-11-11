import {NextResponse} from "next/server";
import sharp from "sharp";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {
 readPortrait,getPortraitWidth,invalidatePortrait,
 removeDerivedPortraits,removeUnreferencedPortrait
} from "@/lib/portrait-storage";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const bucket="delegate-photos";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(message:string,status:number)=>NextResponse.json({error:message},{
 status,headers:{"Cache-Control":"private, no-store"}
});

async function authorize(delegateId:string,level:"viewer"|"admin"){
 if(!uuid.test(delegateId))return {error:fail("Mã đại biểu không hợp lệ.",400)} as const;
 const {supabase,user}=await getAuth();
 if(!user)return {error:fail("Cần đăng nhập.",401)} as const;
 const {data:delegate,error}=await createAdminClient().from("delegates")
  .select("id,congress_id,photo_path,auth_user_id,is_active").eq("id",delegateId).maybeSingle();
 if(error||!delegate)return {error:fail("Không tìm thấy đại biểu.",404)} as const;
 if(!(delegate.auth_user_id===user.id&&delegate.is_active)&&
  !(await hasRole(supabase,user.id,delegate.congress_id,level)))
  return {error:fail("Bạn không có quyền truy cập ảnh này.",403)} as const;
 return {delegate,user} as const;
}

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  const checked=await authorize(id,"viewer");
  if("error" in checked)return checked.error;
  const path=checked.delegate.photo_path;
  if(!path)return fail("Đại biểu chưa có ảnh.",404);
  // Supabase Free does not provide server-side image transformations.
  // Serve small portraits lazily from ONE optimized original, not 3 objects.
  const width=getPortraitWidth(new URL(request.url).searchParams.get("w"));
  const body=await readPortrait(path,width);
  if(!body)return fail("Không tải được ảnh đại biểu.",404);
  return new Response(new Uint8Array(body),{
   headers:{"Content-Type":"image/jpeg",
    "Cache-Control":"private, max-age=45","Vary":"Cookie",
    "X-Content-Type-Options":"nosniff","Content-Disposition":"inline",
    "Cross-Origin-Resource-Policy":"same-origin"}
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
  if(!(file instanceof File)||file.type!=="image/jpeg"||
   file.size<1000||file.size>2*1024*1024)
   return fail("Ảnh đã xử lý phải là JPEG, từ 1 KB đến 2 MB.",400);
  const raw=Buffer.from(await file.arrayBuffer());
  const meta=await sharp(raw,{limitInputPixels:5_000_000}).metadata();
  if(meta.format!=="jpeg"||meta.width!==600||meta.height!==800)
   return fail("Ảnh phải có kích thước 600 × 800 px (tỷ lệ 3:4).",400);
  // Re-encode server-side: strip metadata, optimize for portrait delivery.
  const output=await sharp(raw,{limitInputPixels:5_000_000})
   .flatten({background:"#ffffff"}).jpeg({quality:78,mozjpeg:true}).toBuffer();
  const sharedPortrait=checked.delegate.auth_user_id===checked.user.id&&checked.delegate.is_active;
  const path=sharedPortrait?"people/"+checked.user.id+".jpg":checked.delegate.congress_id+"/"+id+".jpg";
  const admin=createAdminClient();
  const oldPaths=new Set<string>([checked.delegate.photo_path].filter((value):value is string=>Boolean(value)));
  if(sharedPortrait){
   const old=await admin.from("delegates").select("photo_path").eq("auth_user_id",checked.user.id).limit(1000);
   if(!old.error)for(const row of old.data||[])if(row.photo_path)oldPaths.add(row.photo_path);
  }
  const {error:uploadError}=await admin.storage.from(bucket).upload(path,output,{
   contentType:"image/jpeg",cacheControl:"60",upsert:true
  });
  if(uploadError)return fail("Không tải ảnh lên được kho lưu trữ. Kiểm tra bucket delegate-photos.",502);
  const update=admin.from("delegates").update({photo_path:path});
  const {error:dbError}=await (sharedPortrait?
   update.eq("auth_user_id",checked.user.id):
   update.eq("id",id).eq("congress_id",checked.delegate.congress_id));
  if(dbError)return fail("Ảnh đã tải lên nhưng chưa liên kết với hồ sơ.",500);
  invalidatePortrait(path);
  // Legacy -96/-160 assets are generated, not user originals; new GET serves
  // these sizes from the master with short-lived bounded server memory cache.
  await removeDerivedPortraits(path);
  for(const previous of oldPaths){
   try{await removeUnreferencedPortrait(previous,path);}
   catch(error){console.warn("old delegate portrait cleanup",error instanceof Error?error.name:"unknown");}
  }
  return NextResponse.json({ok:true,path,shared:sharedPortrait},{
   headers:{"Cache-Control":"private, no-store"}
  });
 }catch{return fail("Ảnh không hợp lệ hoặc máy chủ không xử lý được.",400);}
}
