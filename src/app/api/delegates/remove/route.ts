import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {delegatePortraitKey} from "@/lib/portrait-policy";
import {removeUnreferencedPortrait} from "@/lib/portrait-storage";
import {writeSystemLog} from "@/lib/system-log";

export const runtime="nodejs";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers={"Cache-Control":"private, no-store"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});

export async function POST(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(origin){
   try{if(new URL(origin).host!==request.headers.get("host"))
    return fail("Nguồn yêu cầu không hợp lệ.",403);}
   catch{return fail("Nguồn yêu cầu không hợp lệ.",403);}
  }
  if(Number(request.headers.get("content-length")||0)>4096)
   return fail("Yêu cầu quá lớn.",413);
  const body=await request.json().catch(()=>null);
  if(!body||typeof body!=="object"||Array.isArray(body)||
     Object.keys(body).some(k=>!["congressId","delegateId","confirmCode"].includes(k)))
   return fail("Yêu cầu xóa đại biểu không hợp lệ.",400);
  const {congressId,delegateId,confirmCode}=body;
  if(typeof congressId!=="string"||typeof delegateId!=="string"||
   !UUID.test(congressId)||!UUID.test(delegateId)||typeof confirmCode!=="string")
   return fail("Mã Đại hội hoặc đại biểu không hợp lệ.",400);
  const {supabase,user}=await getAuth();
  if(!user)return fail("Vui lòng đăng nhập.",401);
  if(!(await hasCongressAbility(supabase,user.id,congressId,"delegates.write")))
   return fail("Không có quyền xóa đại biểu tại Đại hội này.",403);
  const db=createAdminClient();
  const {data:delegate,error:lookupError}=await db.from("delegates")
   .select("id,congress_id,code,full_name,auth_user_id,photo_path,is_active")
   .eq("id",delegateId).eq("congress_id",congressId).maybeSingle();
  if(lookupError)return fail("Không kiểm tra được hồ sơ đại biểu.",503);
  if(!delegate)return fail("Đại biểu đã được xóa hoặc không tồn tại.",404);
  if(confirmCode!==delegate.code)return fail("Nhập đúng mã đại biểu để xác nhận xóa.",400);
  if(delegate.auth_user_id===user.id)return fail("Không thể xóa hồ sơ gắn với tài khoản đang thực hiện.",403);
  // Check all attendance/vote history before deleting an individual. A deleted
  // attendee must never silently change published congress statistics.
  const [checkins,votes]=await Promise.all([
   db.from("checkins").select("id",{count:"exact",head:true})
    .eq("congress_id",congressId).eq("delegate_id",delegateId),
   db.from("votes").select("id",{count:"exact",head:true}).eq("delegate_id",delegateId)
  ]);
  if(checkins.error||votes.error)return fail("Không kiểm tra được lịch sử điểm danh hoặc bỏ phiếu.",503);
  if((checkins.count||0)>0||(votes.count||0)>0)
   return fail("Đại biểu đã có lịch sử điểm danh hoặc bỏ phiếu. Hệ thống không xóa vĩnh viễn để bảo toàn số liệu; vui lòng liên hệ quản trị hệ thống xử lý hồ sơ theo quy trình.",409);
  const localKey=delegatePortraitKey(congressId,delegateId);
  if(delegate.photo_path===localKey){
   const links=await db.from("delegates").select("id",{count:"exact",head:true})
    .eq("photo_path",localKey).neq("id",delegateId);
   if(links.error)return fail("Không kiểm tra được các Đại hội đang dùng chung ảnh.",503);
   if((links.count||0)>0)
    return fail("Ảnh đại biểu này đang được hồ sơ ở Đại hội khác liên kết. Hãy chuyển các liên kết ảnh sang nguồn khác trước khi xóa hồ sơ gốc.",409);
  }
  const {data:removed,error:deleteError}=await db.from("delegates").delete()
   .eq("id",delegateId).eq("congress_id",congressId)
   .eq("code",delegate.code).select("id").maybeSingle();
  if(deleteError)return fail("Không thể xóa hồ sơ. Kiểm tra phân ghế, điểm danh hoặc các dữ liệu có liên quan.",409);
  if(!removed)return fail("Hồ sơ đã bị thay đổi. Hãy tải lại trang.",409);
  let membershipRemoved=false;
  if(delegate.auth_user_id){
   // Do not revoke account rights when another profile in THIS congress still
   // uses the same Auth user. Auth identity remains reusable in other congresses.
   const others=await db.from("delegates").select("id",{count:"exact",head:true})
    .eq("congress_id",congressId).eq("auth_user_id",delegate.auth_user_id);
   if(!others.error&&others.count===0){
    const role=await db.from("congress_members").select("role")
     .eq("user_id",delegate.auth_user_id).eq("congress_id",congressId).maybeSingle();
    if(!role.error&&["guest","delegate"].includes(role.data?.role||"")){
     const revoked=await db.from("congress_members").delete()
      .eq("congress_id",congressId).eq("user_id",delegate.auth_user_id)
      .in("role",["guest","delegate"]);
     membershipRemoved=!revoked.error;
    }
   }
  }
  if(delegate.photo_path){
   try{await removeUnreferencedPortrait(delegate.photo_path,"");}
   catch{console.warn("Photo cleanup after delegate deletion unavailable");}
  }
  await writeSystemLog({level:"warning",source:"api",event:"delegate.deleted",
   message:"BTC đã xóa một hồ sơ đại biểu chưa có điểm danh/bỏ phiếu.",
   congressId,actorId:user.id,
   context:{operation:"delegate.delete",targetId:delegateId,httpMethod:"POST",
    endpoint:"/api/delegates/remove"}});
  return NextResponse.json({ok:true,deletedId:delegateId,membershipRemoved,
   authPreserved:true},{headers});
 }catch{return fail("Không thực hiện được thao tác xóa đại biểu.",503);}
}
