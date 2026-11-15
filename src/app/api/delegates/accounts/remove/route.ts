import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {sharedPortraitKey} from "@/lib/portrait-policy";
import {removeUnreferencedPortrait} from "@/lib/portrait-storage";
import {canDeleteOrphanDelegateAuth} from "@/lib/delegate-auth-cleanup";
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
    return fail("Yêu cầu không cùng nguồn.",403);}
   catch{return fail("Yêu cầu không cùng nguồn.",403);}
  }
  if(Number(request.headers.get("content-length")||0)>4096)
   return fail("Yêu cầu quá lớn.",413);
  const body=await request.json().catch(()=>null);
  if(!body||typeof body!=="object"||Array.isArray(body)||
     Object.keys(body).some(k=>!["congressId","delegateId","confirmCode","deleteOrphanAuth"].includes(k)))
   return fail("Dữ liệu thu hồi tài khoản không hợp lệ.",400);
  const {congressId,delegateId,confirmCode,deleteOrphanAuth}=body;
  if(typeof congressId!=="string"||typeof delegateId!=="string"||
   !UUID.test(congressId)||!UUID.test(delegateId)||typeof confirmCode!=="string"||
   typeof deleteOrphanAuth!=="boolean")
   return fail("Yêu cầu thu hồi tài khoản không hợp lệ.",400);
  const {supabase,user}=await getAuth();
  if(!user)return fail("Cần đăng nhập.",401);
  if(!(await hasCongressAbility(supabase,user.id,congressId,"delegates.write")))
   return fail("Không có quyền quản lý tài khoản Đại hội này.",403);
  const db=createAdminClient();
  const {data:delegate,error:delegateError}=await db.from("delegates")
   .select("id,congress_id,code,auth_user_id,photo_path,is_active")
   .eq("id",delegateId).eq("congress_id",congressId).maybeSingle();
  if(delegateError)return fail("Không xác minh được hồ sơ đại biểu.",503);
  if(!delegate?.auth_user_id)return fail("Đại biểu chưa có tài khoản được liên kết.",404);
  if(delegate.code!==confirmCode)return fail("Vui lòng nhập đúng mã đại biểu.",400);
  const accountId=delegate.auth_user_id;
  if(accountId===user.id)return fail("Không được xóa hoặc thu hồi quyền của tài khoản đang đăng nhập.",403);
  // An account with any BTC or admin privilege is never affected by a
  // delegate account management action, even at another congress.
  const [profile,roles,btc]=await Promise.all([
   db.from("profiles").select("platform_role").eq("id",accountId).maybeSingle(),
   db.from("congress_members").select("role,congress_id").eq("user_id",accountId).limit(200),
   db.from("btc_accounts").select("user_id").eq("user_id",accountId).limit(1)
  ]);
  if(profile.error||roles.error||btc.error)
   return fail("Không xác minh được phân quyền và các Đại hội đang sử dụng tài khoản.",503);
  if(profile.data?.platform_role==="super_admin"||
    roles.data?.some(row=>["admin","checkin","secretary"].includes(row.role))||
    (btc.data?.length||0)>0)
   return fail("Đây là tài khoản BTC hoặc quản trị hệ thống, không thể xóa tại khu vực đại biểu.",403);
  if((roles.data?.length||0)>=200)
   return fail("Tài khoản có quá nhiều liên kết để kiểm tra an toàn.",503);
  const currentMembership=roles.data?.find(row=>row.congress_id===congressId);
  if(currentMembership&&!["delegate","guest"].includes(currentMembership.role))
   return fail("Không được thu hồi quyền không thuộc tài khoản đại biểu.",403);
  const currentPhoto=delegate.photo_path;
  const photoShared=currentPhoto===sharedPortraitKey(accountId);
  const {data:unlinked,error:unlinkError}=await db.from("delegates")
   .update({auth_user_id:null,...(photoShared?{photo_path:null}:{})})
   .eq("id",delegateId).eq("congress_id",congressId)
   .eq("auth_user_id",accountId).select("id").maybeSingle();
  if(unlinkError)return fail("Không thu hồi được tài khoản đại biểu.",503);
  if(!unlinked)return fail("Liên kết tài khoản đã thay đổi. Hãy tải lại danh sách.",409);
  const remaining=await db.from("delegates").select("id",{head:true,count:"exact"})
   .eq("congress_id",congressId).eq("auth_user_id",accountId);
  let accessRevoked=false;
  let notice="";
  if(remaining.error){
   notice="Không xác minh được các hồ sơ còn lại, cần kiểm tra quyền truy cập thủ công.";
  }else if((remaining.count||0)===0&&currentMembership){
   const revoked=await db.from("congress_members").delete()
    .eq("congress_id",congressId).eq("user_id",accountId)
    .in("role",["delegate","guest"]);
   accessRevoked=!revoked.error;
   if(revoked.error)notice="Chưa xóa được quyền thành viên Đại hội, cần kiểm tra thủ công.";
  }else if((remaining.count||0)>0){
   notice="Tài khoản vẫn được một hồ sơ đại biểu khác tại Đại hội này sử dụng.";
  }
  let authDeleted=false;
  let authNotice="";
  if(deleteOrphanAuth&&(!currentMembership||accessRevoked)&&remaining.count===0){
   const decision=await canDeleteOrphanDelegateAuth(db,accountId);
   if(decision.allowed){
    const deleted=await db.auth.admin.deleteUser(accountId);
    authDeleted=!deleted.error||deleted.error.status===404;
    if(!authDeleted)authNotice="Auth còn bị ràng buộc hoặc Supabase chưa xóa được; tài khoản toàn cục được giữ lại.";
   }else authNotice=decision.reason;
  }else if(deleteOrphanAuth)authNotice="Không xóa Auth vì tài khoản vẫn còn quyền hoặc hồ sơ liên kết.";
  if(photoShared&&currentPhoto){
   try{await removeUnreferencedPortrait(currentPhoto,"");}
   catch{console.warn("Shared image cleanup unavailable after account unlink");}
  }
  await writeSystemLog({level:"warning",source:"auth",event:"delegate.account_revoked",
   message:"BTC đã thu hồi liên kết tài khoản đại biểu tại một Đại hội.",
   congressId,actorId:user.id,
   context:{operation:"delegate.account_revoke",targetId:delegateId,httpMethod:"POST",
    endpoint:"/api/delegates/accounts/remove",hasResult:authDeleted}});
  return NextResponse.json({ok:true,unlinked:true,accessRevoked,
   authDeleted,authPreserved:!authDeleted,notice:[notice,authNotice].filter(Boolean).join(" ")},{headers});
 }catch{return fail("Không thu hồi được tài khoản. Vui lòng thử lại.",503);}
}
