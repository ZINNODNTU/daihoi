import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {readPortrait,getPortraitWidth} from "@/lib/portrait-storage";
import {bchPortraitKey,isAuthorizedBchPhotoKey} from "@/lib/portrait-policy";
import {preparePortrait,savePortraitObject,PortraitError} from "@/lib/portrait-upload";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(message:string,status:number)=>NextResponse.json({error:message},{
 status,headers:{"Cache-Control":"private, no-store"}
});

async function authorize(id:string,write:boolean){
 if(!uuid.test(id))return {error:fail("Mã nhân sự BCH không hợp lệ.",400)} as const;
 const {supabase,user}=await getAuth();
 if(!user)return {error:fail("Vui lòng đăng nhập.",401)} as const;
 const db=createAdminClient();
 const {data:candidate,error}=await db.from("bch_candidates")
  .select("id,congress_id,photo_path,updated_at").eq("id",id).maybeSingle();
 if(error||!candidate)return {error:fail("Không tìm thấy nhân sự BCH.",404)} as const;
 const admin=await hasRole(supabase,user.id,candidate.congress_id,"admin");
 if(write&&!admin)return {error:fail("Chỉ quản trị Đại hội được thay ảnh nhân sự BCH.",403)} as const;
 if(!write&&!admin){
  // A former secretary without an enabled BTC account must not see BCH photos.
  const [staff,member,delegate]=await Promise.all([
   hasCongressAbility(supabase,user.id,candidate.congress_id,"bch.read"),
   supabase.from("congress_members").select("role").eq("congress_id",candidate.congress_id)
    .eq("user_id",user.id).maybeSingle(),
   db.from("delegates").select("id").eq("congress_id",candidate.congress_id)
    .eq("auth_user_id",user.id).eq("is_active",true).limit(1)
  ]);
  const delegateMembership=!member.error&&["delegate","guest"].includes(member.data?.role||"");
  if(!staff&&(member.error||delegate.error||(!delegateMembership&&!delegate.data?.length)))
   return {error:fail("Bạn không có quyền xem ảnh nhân sự BCH.",403)} as const;
 }
 return {candidate,supabase} as const;
}
function expectedPath(congressId:string,candidateId:string){
 return bchPortraitKey(congressId,candidateId);
}

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  const checked=await authorize(id,false);
  if("error" in checked)return checked.error;
  const candidate=checked.candidate;
  if(!isAuthorizedBchPhotoKey(candidate.photo_path,candidate.congress_id,id))
   return fail("Nhân sự chưa có ảnh hợp lệ.",404);
  const width=getPortraitWidth(new URL(request.url).searchParams.get("w"));
  const bytes=await readPortrait(expectedPath(candidate.congress_id,id),width);
  if(!bytes)return fail("Không tải được ảnh nhân sự.",404);
  return new Response(new Uint8Array(bytes),{
   headers:{"Content-Type":"image/jpeg","Cache-Control":"private, no-store",
    "Vary":"Cookie","X-Content-Type-Options":"nosniff",
    "Content-Disposition":"inline","Cross-Origin-Resource-Policy":"same-origin"}
  });
 }catch{return fail("Không thể truy cập ảnh BCH.",500);}
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
  const auth=await authorize(id,true);
  if("error" in auth)return auth.error;
  const form=await request.formData();
  const file=form.get("photo");
  if(!(file instanceof File))return fail("Vui lòng chọn ảnh JPEG.",400);
  const prepared=await preparePortrait(file);
  const candidate=auth.candidate;
  const path=expectedPath(candidate.congress_id,id);
  let updatedAt=candidate.updated_at;
  const saved=await savePortraitObject({
   path,bytes:prepared.bytes,digest:prepared.digest,
   async commit(changed){
    if(!changed&&candidate.photo_path===path)return;
    const result=await auth.supabase.from("bch_candidates")
     .update({photo_path:path,updated_at:new Date().toISOString()})
     .eq("id",id).eq("congress_id",candidate.congress_id)
     .select("photo_path,updated_at").maybeSingle();
    if(result.error||!result.data)
     throw new PortraitError("Lưu ảnh thành công nhưng chưa đồng bộ được hồ sơ BCH.",503);
    updatedAt=result.data.updated_at;
   }
  });
  return NextResponse.json({ok:true,photo_path:path,updated_at:updatedAt,
   unchanged:!saved.changed,size:saved.size},{headers:{"Cache-Control":"private, no-store"}});
 }catch(error){
  if(error instanceof PortraitError)return fail(error.message,error.status);
  return fail("Không thể xử lý ảnh BCH. Vui lòng thử lại.",400);
 }
}
