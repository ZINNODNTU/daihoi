import {NextResponse} from "next/server";
import {getAuth,getPortalViewerAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {readPortrait,getPortraitWidth} from "@/lib/portrait-storage";
import {
 delegatePortraitKey,sharedPortraitKey,isAuthorizedDelegatePhotoKey
} from "@/lib/portrait-policy";
import {preparePortrait,savePortraitObject,PortraitError} from "@/lib/portrait-upload";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(message:string,status:number)=>NextResponse.json({error:message},{
 status,headers:{"Cache-Control":"private, no-store"}
});

async function authorize(delegateId:string,level:"viewer"|"admin"){
 if(!uuid.test(delegateId))return {error:fail("Mã đại biểu không hợp lệ.",400)} as const;
 const {supabase,user}=level==="viewer"?await getPortalViewerAuth():await getAuth();
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
  const photo=checked.delegate;
  if(!isAuthorizedDelegatePhotoKey(photo.photo_path,photo.congress_id,id,photo.auth_user_id))
   return fail("Đại biểu chưa có ảnh hợp lệ.",404);
  const width=getPortraitWidth(new URL(request.url).searchParams.get("w"));
  const bytes=await readPortrait(photo.photo_path!,width);
  if(!bytes)return fail("Không tải được ảnh đại biểu.",404);
  return new Response(new Uint8Array(bytes),{
   headers:{"Content-Type":"image/jpeg","Cache-Control":"private, no-store",
    "Vary":"Cookie","X-Content-Type-Options":"nosniff",
    "Content-Disposition":"inline","Cross-Origin-Resource-Policy":"same-origin"}
  });
 }catch{return fail("Không thể truy cập ảnh đại biểu.",500);}
}

export async function PUT(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  const origin=request.headers.get("origin");
  if(origin){
   try{if(new URL(origin).host!==request.headers.get("host"))return fail("Nguồn tải ảnh không hợp lệ.",403);}
   catch{return fail("Nguồn tải ảnh không hợp lệ.",403);}
  }
  if(Number(request.headers.get("content-length")||0)>3*1024*1024)
   return fail("Ảnh gửi lên vượt giới hạn.",413);
  const checked=await authorize(id,"admin");
  if("error" in checked)return checked.error;
  const data=await request.formData();
  const file=data.get("photo");
  if(!(file instanceof File))return fail("Vui lòng chọn ảnh JPEG.",400);
  const prepared=await preparePortrait(file);
  const delegate=checked.delegate;
  const shared=delegate.auth_user_id===checked.user.id&&delegate.is_active;
  const path=shared?sharedPortraitKey(checked.user.id):delegatePortraitKey(delegate.congress_id,id);
  const admin=createAdminClient();
  let needsLink=delegate.photo_path!==path;
  if(shared){
   // All congress profiles for one identity must use the same stable key.
   const all=await admin.from("delegates").select("photo_path")
    .eq("auth_user_id",checked.user.id).limit(1001);
   if(all.error||!all.data||all.data.length>1000)
    return fail("Không thể kiểm tra liên kết ảnh giữa các Đại hội.",503);
   needsLink=all.data.some(item=>item.photo_path!==path);
  }
  const saved=await savePortraitObject({
   path,bytes:prepared.bytes,digest:prepared.digest,
   async commit(changed){
    if(!changed&&!needsLink)return;
    const query=admin.from("delegates").update({photo_path:path});
    const {data:linked,error}=await (shared?
     query.eq("auth_user_id",checked.user.id):
     query.eq("id",id).eq("congress_id",delegate.congress_id))
     .select("id");
    if(error||!linked?.length)
     throw new PortraitError("Lưu ảnh thành công nhưng chưa đồng bộ được hồ sơ.",503);
   }
  });
  return NextResponse.json({ok:true,path,shared,unchanged:!saved.changed,
   size:saved.size},{headers:{"Cache-Control":"private, no-store"}});
 }catch(error){
  if(error instanceof PortraitError)return fail(error.message,error.status);
  return fail("Không thể xử lý ảnh. Vui lòng thử lại.",400);
 }
}
