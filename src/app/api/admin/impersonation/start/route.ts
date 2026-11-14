import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {randomUUID} from "node:crypto";
import {createAdminClient} from "@/lib/supabase/admin";
import {createExchangeClient} from "@/lib/impersonation-auth";
import {getCongressRole} from "@/lib/auth";
import {readActingSession,encryptActingSession,setActingCookies,
 IMPERSONATION_SECONDS,validateSameOrigin} from "@/lib/impersonation";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers={"Cache-Control":"private, no-store, max-age=0"};
function fail(error:string,status:number){
 return NextResponse.json({error},{status,headers});
}
export async function POST(request:NextRequest){
 if(!validateSameOrigin(request)||request.headers.get("x-daihoi-acting")!=="start")
  return fail("Yêu cầu đóng vai không hợp lệ.",403);
 if(readActingSession(request.cookies))
  return fail("Đã có phiên đóng vai. Hãy thoát trước khi bắt đầu phiên khác.",409);
 let body:unknown;
 try{body=await request.json();}catch{return fail("Dữ liệu không hợp lệ.",400);}
 const data=body as {userId?:unknown;congressId?:unknown}|null;
 if(!data||typeof data.userId!=="string"||!UUID.test(data.userId)||
  typeof data.congressId!=="string"||!UUID.test(data.congressId))
  return fail("Tài khoản hoặc Đại hội không hợp lệ.",400);
 const {userId:targetId,congressId}=data as {userId:string;congressId:string};
 const response=NextResponse.json({ok:true,destination:"/dashboard"},{headers});
 const secure=request.nextUrl.protocol==="https:";
 try{
  const exchange=createExchangeClient(request,response);
  const {data:{user:actor},error:actorError}=await exchange.auth.getUser();
  if(actorError||!actor)return fail("Phiên Admin đã hết hạn.",401);
  if(actor.id===targetId)return fail("Không thể đóng vai chính tài khoản đang đăng nhập.",409);
  const adminDb=createAdminClient();
  const {data:profile,error:profileError}=await adminDb.from("profiles")
   .select("platform_role").eq("id",actor.id).maybeSingle();
  if(profileError||profile?.platform_role!=="super_admin")
   return fail("Chỉ Super Admin mới được bắt đầu đóng vai.",403);
  const [{data:target,error:targetError},{data:membership,error:memberError},
   {data:congress,error:congressError}]=await Promise.all([
   adminDb.auth.admin.getUserById(targetId),
   adminDb.from("congress_members").select("role").eq("user_id",targetId)
    .eq("congress_id",congressId).maybeSingle(),
   adminDb.from("congresses").select("id,name").eq("id",congressId).maybeSingle()
  ]);
  if(targetError||!target.user||memberError||!membership||congressError||!congress)
   return fail("Không tìm thấy tài khoản thuộc Đại hội này.",404);
  const {data:targetProfile}=await adminDb.from("profiles")
   .select("full_name,platform_role").eq("id",targetId).maybeSingle();
  if(targetProfile?.platform_role==="super_admin")
   return fail("Không cho phép đóng vai quản trị hệ thống khác.",403);
  const staff=["admin","checkin","secretary"].includes(membership.role);
  if(staff){
   const role=await getCongressRole(adminDb,targetId,congressId);
   if(role!==membership.role)return fail("Tài khoản BTC đã bị khóa hoặc không còn quyền.",403);
  }else if(membership.role==="delegate"||membership.role==="guest"){
   const {data:delegate}=await adminDb.from("delegates").select("id")
    .eq("congress_id",congressId).eq("auth_user_id",targetId)
    .eq("is_active",true).limit(1);
   if(!delegate?.length)return fail("Tài khoản đại biểu không còn hoạt động.",403);
  }else return fail("Vai trò tài khoản không được hỗ trợ.",403);

  const {data:{session:original},error:sessionError}=await exchange.auth.getSession();
  if(sessionError||!original||original.user.id!==actor.id)
   return fail("Không thể bảo toàn phiên quản trị hiện tại.",401);
  const now=Math.floor(Date.now()/1000);
  const encrypted=encryptActingSession({
   version:1,adminId:actor.id,targetId,congressId,
   targetName:(targetProfile?.full_name||target.user.email||"Tài khoản").slice(0,120),
   createdAt:now,expiresAt:now+IMPERSONATION_SECONDS,
   adminAccessToken:original.access_token,adminRefreshToken:original.refresh_token
  });
  // Fail before issuing any Auth session if the backup cannot be stored safely.
  if((encrypted.match(/.{1,2800}/g)||[]).length>4)
   return fail("Phiên đăng nhập quá lớn để bảo toàn an toàn.",503);
  const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!base||!key)return fail("Supabase chưa cấu hình.",503);
  const {data:link,error:linkError}=await adminDb.auth.admin.generateLink({
   type:"magiclink",email:target.user.email||""
  });
  // generateLink may create an account for a nonexistent email; never accept a
  // link whose actual identity is not the verified target UUID.
  if(linkError||!link.user||link.user.id!==targetId||!link.properties?.hashed_token)
   return fail("Supabase không thể cấp phiên đóng vai cho tài khoản này.",503);
  const verifier=createClient(base,key,{auth:{
   persistSession:false,autoRefreshToken:false,detectSessionInUrl:false
  }});
  const {data:verified,error:verifyError}=await verifier.auth.verifyOtp({
   token_hash:link.properties.hashed_token,type:"magiclink"
  });
  if(verifyError||!verified.user||verified.user.id!==targetId||!verified.session)
   return fail("Không xác minh được phiên của tài khoản đích.",503);
  // Append-only operational audit: the Admin's identity and the target must
  // never be confused, even though subsequent writes use the target JWT.
  const {error:immutableAuditError}=await adminDb.from("audit_logs").insert({
   congress_id:congressId,actor_id:actor.id,target_id:targetId,
   action:"auth.impersonation_started",
   details:{targetId,actingAdminId:actor.id,ttlSeconds:IMPERSONATION_SECONDS}
  });
  if(immutableAuditError){
   await verifier.auth.signOut({scope:"local"}).catch(()=>{});
   return fail("Không ghi được kiểm toán đóng vai. Đã hủy chuyển tài khoản.",503);
  }
  // A failed system log write MUST NOT enable privileged impersonation.
  const {error:auditError}=await adminDb.from("system_logs").insert({
   level:"info",source:"auth",event:"auth.impersonation_started",
   message:"Super Admin bắt đầu đóng vai tài khoản Đại hội.",
   actor_id:actor.id,congress_id:congressId,request_id:randomUUID(),
   context:{operation:"impersonation.start",targetId,actingAdminId:actor.id}
  });
  if(auditError){
   await verifier.auth.signOut({scope:"local"}).catch(()=>{});
   return fail("Không ghi được nhật ký bảo mật. Đã hủy đóng vai.",503);
  }
  const {data:changed,error:swapError}=await exchange.auth.setSession({
   access_token:verified.session.access_token,
   refresh_token:verified.session.refresh_token
  });
  if(swapError||changed.user?.id!==targetId){
   await verifier.auth.signOut({scope:"local"}).catch(()=>{});
   return fail("Không thể chuyển phiên đăng nhập an toàn.",503);
  }
  setActingCookies(response.cookies,encrypted,secure);
  const destination=staff?"/congresses/"+congressId:"/my-card";
  // Preserve every Supabase Auth cookie including chunked tokens and the
  // HttpOnly encrypted Admin recovery cookie on the final JSON response.
  const final=NextResponse.json({ok:true,destination},{headers});
  response.cookies.getAll().forEach(cookie=>final.cookies.set(cookie));
  return final;
 }catch(error){
  console.error("impersonation_start_failed",error instanceof Error?error.message:"unknown");
  return fail("Không thể khởi tạo phiên đóng vai. Kiểm tra cấu hình xác thực.",503);
 }
}
