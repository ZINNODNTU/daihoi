import {NextResponse} from "next/server";
import sharp from "sharp";
import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const BUCKET="delegate-photos";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(error:string,status:number)=>NextResponse.json({error},{
 status,headers:{"Cache-Control":"private, no-store"}
});

async function authorize(id:string,write:boolean){
 if(!uuid.test(id))return {error:fail("Mã nhân sự BCH không hợp lệ.",400)} as const;
 const {supabase,user}=await getAuth();
 if(!user)return {error:fail("Vui lòng đăng nhập.",401)} as const;
 const db=createAdminClient();
 const {data:candidate,error}=await db.from("bch_candidates")
  .select("id,congress_id,photo_path").eq("id",id).maybeSingle();
 if(error||!candidate)return {error:fail("Không tìm thấy nhân sự BCH.",404)} as const;
 const admin=await hasRole(supabase,user.id,candidate.congress_id,"admin");
 if(write&&!admin)return {error:fail("Chỉ quản trị Đại hội được thay ảnh nhân sự BCH.",403)} as const;
 if(!write&&!admin){
  const [member,delegate]=await Promise.all([
   supabase.from("congress_members").select("role").eq("congress_id",candidate.congress_id)
    .eq("user_id",user.id).maybeSingle(),
   db.from("delegates").select("id").eq("congress_id",candidate.congress_id)
    .eq("auth_user_id",user.id).eq("is_active",true).limit(1)
  ]);
  if(member.error||delegate.error||
   !["secretary","delegate","guest"].includes(member.data?.role||"")&&!delegate.data?.length)
   return {error:fail("Bạn không có quyền xem ảnh nhân sự BCH.",403)} as const;
 }
 return {candidate,supabase} as const;
}
function expectedPath(congressId:string,candidateId:string){
 return congressId+"/bch/"+candidateId+".jpg";
}

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  const auth=await authorize(id,false);
  if("error" in auth)return auth.error;
  const expected=expectedPath(auth.candidate.congress_id,id);
  // Never trust client-writable photo_path to load an arbitrary private file.
  if(auth.candidate.photo_path!==expected)return fail("Nhân sự chưa có ảnh chân dung.",404);
  const size=new URL(request.url).searchParams.get("w");
  const width=size==="96"?96:size==="160"?160:600;
  const storage=createAdminClient().storage.from(BUCKET);
  const variant=width===600?expected:expected.replace(/\.jpg$/i,"-"+width+".jpg");
  const saved=await storage.download(variant);
  let bytes:Uint8Array;
  if(saved.data)bytes=new Uint8Array(await saved.data.arrayBuffer());
  else{
   // Fallback for BCH portraits uploaded before the precomputed thumbnails.
   const {data,error}=await storage.download(expected);
   if(error||!data)return fail("Không tải được ảnh nhân sự.",404);
   const original=Buffer.from(await data.arrayBuffer());
   bytes=width===600?new Uint8Array(original):
    new Uint8Array(await sharp(original,{limitInputPixels:5_000_000})
     .resize(width,Math.round(width*4/3),{fit:"cover"})
     .jpeg({quality:78,mozjpeg:true}).toBuffer());
  }
  return new Response(new Uint8Array(bytes),{
   headers:{
    "Content-Type":"image/jpeg","Cache-Control":"private, no-store",
    "X-Content-Type-Options":"nosniff","Content-Disposition":"inline",
    "Cross-Origin-Resource-Policy":"same-origin"
   }
  });
 }catch{return fail("Không thể truy cập ảnh BCH.",500);}
}

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  const auth=await authorize(id,true);
  if("error" in auth)return auth.error;
  const form=await request.formData();
  const file=form.get("photo");
  if(!(file instanceof File)||file.type!=="image/jpeg"||file.size<1000||file.size>2*1024*1024)
   return fail("Ảnh đã xử lý phải là JPEG từ 1 KB đến 2 MB.",400);
  const raw=Buffer.from(await file.arrayBuffer());
  const metadata=await sharp(raw,{limitInputPixels:5_000_000}).metadata();
  if(metadata.format!=="jpeg"||metadata.width!==600||metadata.height!==800)
   return fail("Ảnh phải có kích thước 600 × 800 px (tỷ lệ 3:4).",400);
  const encoded=await sharp(raw,{limitInputPixels:5_000_000})
   .flatten({background:"#ffffff"}).jpeg({quality:85,mozjpeg:true}).toBuffer();
  const path=expectedPath(auth.candidate.congress_id,id);
  const {error:uploadError}=await createAdminClient().storage.from(BUCKET).upload(
   path,encoded,{contentType:"image/jpeg",cacheControl:"0",upsert:true}
  );
  if(uploadError){
   console.error("bch photo upload failed",uploadError.name);
   return fail("Không tải ảnh BCH lên kho lưu trữ. Vui lòng thử lại.",502);
  }
  const {data:updated,error:updateError}=await auth.supabase.from("bch_candidates")
   .update({photo_path:path,updated_at:new Date().toISOString()})
   .eq("id",id).eq("congress_id",auth.candidate.congress_id)
   .select("photo_path,updated_at").maybeSingle();
  if(updateError||!updated)return fail("Ảnh đã tải lên nhưng chưa liên kết được với hồ sơ BCH.",500);
  const thumbs=await Promise.allSettled([96,160].map(async width=>{
   const thumbnail=await sharp(encoded,{limitInputPixels:5_000_000})
    .resize(width,Math.round(width*4/3),{fit:"cover"})
    .jpeg({quality:78,mozjpeg:true}).toBuffer();
   return createAdminClient().storage.from(BUCKET)
    .upload(path.replace(/\.jpg$/i,"-"+width+".jpg"),thumbnail,{
     contentType:"image/jpeg",cacheControl:"0",upsert:true
    });
  }));
  if(thumbs.some(item=>item.status==="rejected"||
   (item.status==="fulfilled"&&Boolean(item.value.error))))console.warn("bch thumbnail fallback required");
  return NextResponse.json({ok:true,photo_path:updated.photo_path,updated_at:updated.updated_at},{
   headers:{"Cache-Control":"private, no-store"}
  });
 }catch{return fail("Ảnh không hợp lệ hoặc máy chủ không xử lý được.",400);}
}