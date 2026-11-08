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

async function authorize(delegateId:string,level:"viewer"|"admin"){
 if(!uuid.test(delegateId))return {error:fail("Mã đại biểu không hợp lệ.",400)} as const;
 const {supabase,user}=await getAuth();
 if(!user)return {error:fail("Cần đăng nhập.",401)} as const;
 const {data:delegate,error}=await supabase.from("delegates")
  .select("id,congress_id,photo_path").eq("id",delegateId).maybeSingle();
 if(error||!delegate)return {error:fail("Không tìm thấy đại biểu.",404)} as const;
 if(!(await hasRole(supabase,user.id,delegate.congress_id,level)))
  return {error:fail("Bạn không có quyền truy cập ảnh này.",403)} as const;
 return {delegate} as const;
}
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  const checked=await authorize(id,"viewer");
  if("error" in checked)return checked.error;
  if(!checked.delegate.photo_path)return fail("Đại biểu chưa có ảnh.",404);
  const admin=createAdminClient();
  const {data,error}=await admin.storage.from(bucket).download(checked.delegate.photo_path);
  if(error||!data)return fail("Không tải được ảnh đại biểu.",404);
  return new Response(await data.arrayBuffer(),{
   headers:{"Content-Type":"image/jpeg","Cache-Control":"private, no-store",
    "X-Content-Type-Options":"nosniff","Content-Disposition":"inline"}
  });
 }catch{return fail("Không thể truy cập ảnh.",500);}
}
export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
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
  const path=checked.delegate.congress_id+"/"+id+".jpg";
  const admin=createAdminClient();
  const {error:uploadError}=await admin.storage.from(bucket).upload(path,output,{
   contentType:"image/jpeg",cacheControl:"0",upsert:true
  });
  if(uploadError)return fail("Không tải ảnh lên được kho lưu trữ. Kiểm tra bucket delegate-photos.",502);
  const {error:dbError}=await admin.from("delegates").update({photo_path:path}).eq("id",id)
   .eq("congress_id",checked.delegate.congress_id);
  if(dbError)return fail("Ảnh đã tải lên nhưng chưa liên kết với hồ sơ.",500);
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }catch{return fail("Ảnh không hợp lệ hoặc máy chủ không xử lý được.",400);}
}
