import {randomBytes} from "node:crypto";
import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {writeSystemLog} from "@/lib/system-log";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Role="admin"|"checkin"|"secretary";
const isRole=(x:unknown):x is Role=>x==="admin"||x==="checkin"||x==="secretary";
const HEADERS={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:HEADERS});
const validOrigin=(req:Request)=>{
 try{const origin=req.headers.get("origin");return !origin||new URL(origin).host===req.headers.get("host");}
 catch{return false;}
};
const password=()=>randomBytes(21).toString("base64url")+"!A7";
async function authorize(congressId:string){
 const {supabase,user}=await getAuth();
 if(!user)return {error:fail("Vui lòng đăng nhập.",401)} as const;
 if(!UUID.test(congressId)||!(await hasCongressAbility(supabase,user.id,congressId,"team.manage")))
  return {error:fail("Không có quyền quản lý BTC Đại hội này.",403)} as const;
 return {user} as const;
}
async function audit(congressId:string,actorId:string,action:string,targetId:string,role?:Role){
 const db=createAdminClient();
 const {error}=await db.from("audit_logs").insert({
  congress_id:congressId,actor_id:actorId,action,target_id:targetId,
  details:role?{role}:{}
 });
 if(error)console.warn("btc audit unavailable",error.code);
 await writeSystemLog({level:"info",source:"auth",event:action,
  message:"Đã cập nhật quyền hoặc tài khoản BTC của Đại hội.",congressId,
  actorId,context:{operation:action}});
}
export async function GET(request:Request){
 try{
  const congressId=new URL(request.url).searchParams.get("congressId")||"";
  const session=await authorize(congressId);
  if("error" in session)return session.error;
  const db=createAdminClient();
  const [{data:accounts,error}, {data:roles,error:roleError}, {data:restrictions,error:restrictionsError}]=await Promise.all([
   db.from("btc_accounts").select("user_id,login_email,full_name,created_at")
    .eq("congress_id",congressId).is("disabled_at",null)
    .order("created_at",{ascending:false}).limit(300),
   db.from("congress_members").select("user_id,role")
    .eq("congress_id",congressId).in("role",["admin","checkin","secretary"]).limit(300),
   db.from("btc_account_capability_restrictions").select("user_id,ability,allowed")
    .eq("congress_id",congressId).limit(5000)
  ]);
  if(error||roleError||restrictionsError)return fail("Không tải được tài khoản BTC hoặc quyền riêng. Kiểm tra migration V57.",503);
  const byUser=new Map((roles||[]).map(m=>[m.user_id,m.role]));
  return NextResponse.json({
   members:(accounts||[]).filter(a=>byUser.has(a.user_id)).map(a=>({
    userId:a.user_id,email:a.login_email,name:a.full_name,
    role:byUser.get(a.user_id),createdAt:a.created_at,
    isSelf:a.user_id===session.user.id,
    deniedAbilities:(restrictions||[]).filter(item=>item.user_id===a.user_id&&item.allowed===false).map(item=>item.ability),
    permissionOverrides:(restrictions||[]).filter(item=>item.user_id===a.user_id).map(item=>({ability:item.ability,allowed:item.allowed}))
   }))
  },{headers:HEADERS});
 }catch{return fail("Không thể tải danh sách tài khoản BTC.",503);}
}
export async function POST(req:Request){
 let createdId="";
 try{
  if(!validOrigin(req))return fail("Nguồn yêu cầu không hợp lệ.",403);
  const body=await req.json().catch(()=>null);
  const congressId=body?.congressId;
  const fullName=typeof body?.fullName==="string"?body.fullName.trim().replace(/\s+/g," "):"";
  const role=body?.role;
  if(typeof congressId!=="string"||!UUID.test(congressId)||!isRole(role)||
    fullName.length<2||fullName.length>120)
   return fail("Nhập họ tên từ 2–120 ký tự và chọn vai trò BTC hợp lệ.",400);
  const session=await authorize(congressId);
  if("error" in session)return session.error;
  const db=createAdminClient();
  const loginEmail="btc-"+congressId.slice(0,8)+"-"+randomBytes(7).toString("hex")+"@staff.daihoi.invalid";
  const initialPassword=password();
  const {data,error}=await db.auth.admin.createUser({
   email:loginEmail,password:initialPassword,email_confirm:true,
   user_metadata:{full_name:fullName},
   app_metadata:{account_kind:"btc",btc_congress_id:congressId}
  });
  if(error||!data.user)return fail("Không thể tạo tài khoản BTC. Hãy thử lại.",503);
  createdId=data.user.id;
  const {error:accountError}=await db.from("btc_accounts").insert({
   user_id:createdId,congress_id:congressId,login_email:loginEmail,
   full_name:fullName,created_by:session.user.id
  });
  if(accountError)throw new Error("ACCOUNT_INSERT_FAILED");
  const {error:memberError}=await db.from("congress_members").insert({
   congress_id:congressId,user_id:createdId,role
  });
  if(memberError)throw new Error("MEMBER_INSERT_FAILED");
  await audit(congressId,session.user.id,"btc.account_created",createdId,role);
  return NextResponse.json({ok:true,account:{
   userId:createdId,name:fullName,email:loginEmail,role
  },initialPassword},{status:201,headers:HEADERS});
 }catch{
  if(createdId){
   try{
    const db=createAdminClient();
    await db.from("congress_members").delete().eq("user_id",createdId);
    await db.from("btc_accounts").delete().eq("user_id",createdId);
    await db.auth.admin.deleteUser(createdId);
   }catch{/* Failed provisioning cannot grant privileges without a membership. */}
  }
  return fail("Không thể hoàn tất cấp tài khoản BTC. Kiểm tra migration V45 và thử lại.",503);
 }
}
export async function PATCH(req:Request){
 try{
  if(!validOrigin(req))return fail("Nguồn yêu cầu không hợp lệ.",403);
  const body=await req.json().catch(()=>null);
  const congressId=body?.congressId,userId=body?.userId,role=body?.role;
  if(typeof congressId!=="string"||!UUID.test(congressId)||typeof userId!=="string"||!UUID.test(userId)||
   !isRole(role))return fail("Thông tin phân quyền không hợp lệ.",400);
  const session=await authorize(congressId);
  if("error" in session)return session.error;
  if(session.user.id===userId)return fail("Không tự thay đổi quyền của mình.",409);
  const db=createAdminClient();
  const {data:account}=await db.from("btc_accounts").select("user_id")
   .eq("congress_id",congressId).eq("user_id",userId).is("disabled_at",null).maybeSingle();
  if(!account)return fail("Tài khoản BTC không thuộc Đại hội này.",404);
  const {data,error}=await db.from("congress_members").update({role})
   .eq("congress_id",congressId).eq("user_id",userId).select("user_id").maybeSingle();
  if(error||!data)return fail("Không thay đổi được vai trò BTC.",409);
  await audit(congressId,session.user.id,"btc.role_changed",userId,role);
  return NextResponse.json({ok:true},{headers:HEADERS});
 }catch{return fail("Không cập nhật được quyền BTC.",503);}
}
export async function DELETE(req:Request){
 try{
  if(!validOrigin(req))return fail("Nguồn yêu cầu không hợp lệ.",403);
  const body=await req.json().catch(()=>null);
  const congressId=body?.congressId,userId=body?.userId;
  if(typeof congressId!=="string"||!UUID.test(congressId)||typeof userId!=="string"||!UUID.test(userId))
   return fail("Tài khoản không hợp lệ.",400);
  const session=await authorize(congressId);
  if("error" in session)return session.error;
  if(session.user.id===userId)return fail("Không thể tự thu hồi tài khoản của mình.",409);
  const db=createAdminClient();
  const {data:account}=await db.from("btc_accounts").select("user_id")
   .eq("congress_id",congressId).eq("user_id",userId).is("disabled_at",null).maybeSingle();
  if(!account)return fail("Tài khoản BTC không thuộc Đại hội này.",404);
  // First revoke membership: all privileged APIs and RLS lose access immediately.
  const {error:revoked}=await db.from("congress_members").delete()
   .eq("congress_id",congressId).eq("user_id",userId);
  if(revoked)return fail("Không thể thu hồi quyền BTC.",503);
  const {error:disabled}=await db.from("btc_accounts")
   .update({disabled_at:new Date().toISOString()})
   .eq("user_id",userId).eq("congress_id",congressId);
  if(disabled)console.warn("btc disable metadata unavailable",disabled.code);
  const {error:banned}=await db.auth.admin.updateUserById(userId,{ban_duration:"876000h"});
  if(banned)console.warn("btc auth ban unavailable",banned.status);
  await audit(congressId,session.user.id,"btc.account_revoked",userId);
  return NextResponse.json({ok:true,accessRevoked:true,
   authBanned:!banned,metadataDisabled:!disabled},{headers:HEADERS});
 }catch{return fail("Không thể gỡ tài khoản BTC.",503);}
}
