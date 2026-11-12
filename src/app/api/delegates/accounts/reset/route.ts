import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {writeSystemLog} from "@/lib/system-log";
import {DEFAULT_DELEGATE_PASSWORD} from "@/lib/delegate-password-policy";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(error:string,status:number)=>NextResponse.json({error},{
 status,headers:{"Cache-Control":"private, no-store","Pragma":"no-cache"}
});

// A new password is shown once. Existing passwords cannot be fetched/exported.
// Admin privileges are verified against the specific congress and protected
// accounts with staff roles in any congress cannot be reset by congress admins.
export async function POST(request:Request){
 try{
  const origin=request.headers.get("origin");
  if(origin&&new URL(origin).host!==request.headers.get("host"))
   return fail("Yêu cầu không cùng nguồn.",403);
  const {supabase,user}=await getAuth();
  if(!user)return fail("Cần đăng nhập.",401);
  const body=await request.json().catch(()=>null);
  const congressId=String(body?.congressId||"");
  const delegateId=String(body?.delegateId||"");
  if(!UUID.test(congressId)||!UUID.test(delegateId))return fail("Dữ liệu không hợp lệ.",400);
  if(!(await hasCongressAbility(supabase,user.id,congressId,"delegates.write")))
   return fail("Chỉ quản trị Đại hội được cấp lại mật khẩu.",403);
  if(body?.password!==undefined)
   return fail("Chức năng reset chỉ hỗ trợ mật khẩu mặc định của hệ thống.",400);
  const db=createAdminClient();
  const {data:delegate,error:lookupError}=await db.from("delegates")
   .select("id,full_name,login_email,auth_user_id,is_active")
   .eq("id",delegateId).eq("congress_id",congressId).maybeSingle();
  if(lookupError||!delegate?.auth_user_id||!delegate.is_active)
   return fail("Đại biểu chưa có tài khoản hoạt động.",404);
  if(delegate.auth_user_id===user.id)
   return fail("Không thể đặt lại mật khẩu của chính mình tại đây.",403);
  const [profile,staff]=await Promise.all([
   db.from("profiles").select("platform_role").eq("id",delegate.auth_user_id).maybeSingle(),
   db.from("congress_members").select("role").eq("user_id",delegate.auth_user_id)
    .in("role",["admin","checkin","secretary"]).limit(1)
  ]);
  if(profile.error||staff.error)return fail("Không xác minh được phân quyền tài khoản.",503);
  if(profile.data?.platform_role==="super_admin"||(staff.data?.length||0)>0)
   return fail("Tài khoản thuộc BTC/quản trị; không được đặt lại tại khu vực đại biểu.",403);
  // Always reset to the official default, regardless of the congress.
  const password=DEFAULT_DELEGATE_PASSWORD;
  const {error}=await db.auth.admin.updateUserById(delegate.auth_user_id,{password});
  if(error)return fail("Dịch vụ xác thực chưa đặt lại được mật khẩu.",502);
  const {error:auditError}=await db.from("audit_logs").insert({
   congress_id:congressId,actor_id:user.id,action:"delegate.password_reset",
   target_id:delegateId,details:{userId:delegate.auth_user_id,policy:"default"}
  });
  if(auditError)console.error("delegate password reset audit failure",auditError.code);
  await writeSystemLog({level:"warning",source:"auth",event:"delegate.password_reset",
   message:"Quản trị đã đặt lại mật khẩu đại biểu.",congressId,actorId:user.id,
   context:{operation:"delegate.password_reset",endpoint:"/api/delegates/accounts/reset",httpMethod:"POST"}});
  return NextResponse.json({
   ok:true,id:delegate.id,name:delegate.full_name,email:delegate.login_email,
   password,changedAt:new Date().toISOString()
  },{headers:{"Cache-Control":"private, no-store","Pragma":"no-cache"}});
 }catch{return fail("Không thể đặt lại mật khẩu. Vui lòng thử lại.",500);}
}