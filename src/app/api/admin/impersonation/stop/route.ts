import {NextRequest,NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {createAdminClient} from "@/lib/supabase/admin";
import {createExchangeClient} from "@/lib/impersonation-auth";
import {readActingSession,clearActingCookies,validateSameOrigin} from "@/lib/impersonation";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const headers={"Cache-Control":"private, no-store, max-age=0"};
function fail(error:string,status:number){return NextResponse.json({error},{status,headers});}

export async function POST(request:NextRequest){
 if(!validateSameOrigin(request)||request.headers.get("x-daihoi-acting")!=="stop")
  return fail("Yêu cầu không hợp lệ.",403);
 const acting=readActingSession(request.cookies);
 if(!acting){
  // The recoverable Admin token may have expired after a long absence.
  // Never keep the delegated user logged in without a valid acting context.
  if(!request.cookies.has("daihoi_actor_trace_v1"))
   return fail("Không có phiên đóng vai cần khôi phục.",403);
  const abandoned=NextResponse.json({ok:true,destination:"/login"},{headers});
  try{const auth=createExchangeClient(request,abandoned);await auth.auth.signOut();}catch{/* Clear even if Auth is offline. */}
  clearActingCookies(abandoned.cookies);
  const result=NextResponse.json({ok:true,destination:"/login"},{headers});
  abandoned.cookies.getAll().forEach(cookie=>result.cookies.set(cookie));
  return result;
 }
 const response=NextResponse.json({ok:true,destination:"/dashboard/access?congressId="+acting.congressId},{headers});
 try{
  const supabase=createExchangeClient(request,response);
  const {data:{user},error}=await supabase.auth.getUser();
  // A signed-out target can still exit; however another authenticated user
  // must never use this backup to acquire the Admin's identity.
  if(!error&&user&&user.id!==acting.targetId)
   return fail("Phiên xác thực không khớp. Không thể khôi phục Admin.",403);
  const {data:restored,error:restoreError}=await supabase.auth.setSession({
   access_token:acting.adminAccessToken,
   refresh_token:acting.adminRefreshToken
  });
  if(restoreError||!restored.user||restored.user.id!==acting.adminId)
   return fail("Không khôi phục được phiên Admin. Hãy đăng nhập lại.",401);
  const adminDb=createAdminClient();
  const {error:immutableAuditError}=await adminDb.from("audit_logs").insert({
   congress_id:acting.congressId,actor_id:acting.adminId,
   target_id:acting.targetId,action:"auth.impersonation_stopped",
   details:{targetId:acting.targetId,actingAdminId:acting.adminId}
  });
  if(immutableAuditError)console.warn("impersonation_stop_immutable_audit_unavailable");
  const {error:auditError}=await adminDb.from("system_logs").insert({
   level:"info",source:"auth",event:"auth.impersonation_stopped",
   message:"Đã thoát đóng vai và khôi phục phiên Admin.",
   actor_id:acting.adminId,congress_id:acting.congressId,request_id:randomUUID(),
   context:{operation:"impersonation.stop",targetId:acting.targetId,actingAdminId:acting.adminId}
  });
  if(auditError)console.warn("impersonation_stop_audit_unavailable");
  clearActingCookies(response.cookies);
  const result=NextResponse.json({ok:true,destination:"/dashboard/access?congressId="+acting.congressId},
   {headers});
  response.cookies.getAll().forEach(cookie=>result.cookies.set(cookie));
  return result;
 }catch(error){
  console.error("impersonation_stop_failed",error instanceof Error?error.message:"unknown");
  return fail("Không thể khôi phục tài khoản Admin. Hãy đăng nhập lại.",503);
 }
}
