import {NextResponse} from "next/server";
import {getAuth} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {getWindowStatus,isQrAllowed} from "@/lib/attendance-window";
import {verifySessionEntryQr} from "@/lib/session-entry-qr";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(error:string,status:number,extra:Record<string,unknown>={})=>
 NextResponse.json({error,...extra},{status,headers:{"Cache-Control":"private, no-store"}});
export async function POST(request:Request){
 try{
  const {user}=await getAuth();
  if(!user)return fail("Bạn cần đăng nhập tài khoản đại biểu trước khi điểm danh.",401);
  const body=await request.json();
  const sessionId=String(body.sessionId||"").toLowerCase();
  const token=String(body.token||"");
  if(!uuid.test(sessionId)||token.length>100)return fail("Mã QR phiên không hợp lệ.",400);
  const admin=createAdminClient();
  const {data:session,error:sessionError}=await admin.from("attendance_sessions")
   .select("id,congress_id,name,status,starts_at,ends_at,qr_policy")
   .eq("id",sessionId).maybeSingle();
  if(sessionError)return fail("Không thể đọc cấu hình điểm danh.",500);
  if(!session)return fail("Phiên điểm danh không tồn tại.",404);
  if(!verifySessionEntryQr(token,session.congress_id,sessionId))
   return fail("Mã QR không hợp lệ với phiên này. Vui lòng quét mã do Ban Tổ chức cung cấp.",410);
  if(!isQrAllowed(session.qr_policy,"session"))
   return fail("Phiên không chấp nhận QR theo phiên.",409);
  if(getWindowStatus(session)!=="open")
   return fail("Phiên chưa mở, đã đóng hoặc ngoài giờ điểm danh.",409);
  const {data:delegates,error:delegateError}=await admin.from("delegates")
   .select("id,code,full_name,unit,is_active")
   .eq("auth_user_id",user.id).eq("congress_id",session.congress_id)
   .eq("is_active",true).limit(2);
  if(delegateError)return fail("Không thể xác minh hồ sơ đại biểu.",500);
  if(!delegates?.length)return fail("Tài khoản đăng nhập chưa liên kết với hồ sơ đại biểu của Đại hội này. Liên hệ BTC.",403);
  if(delegates.length!==1)return fail("Tài khoản đang liên kết với nhiều hồ sơ trong cùng Đại hội. Liên hệ BTC để xác minh.",409);
  const delegate=delegates[0];

  // Identity comes exclusively from authenticated user and the database,
  // NOT a submitted delegateId. Unique (session_id,delegate_id) stops replay.
  const {data:checkin,error}=await admin.from("checkins").insert({
   congress_id:session.congress_id,session_id:session.id,delegate_id:delegate.id,
   checked_in_by:user.id,method:"qr",qr_scope:"session",note:null
  }).select("id,checked_in_at").single();
  if(error?.code==="23505")
   return NextResponse.json({ok:true,already:true,
    delegate:{id:delegate.id,code:delegate.code,full_name:delegate.full_name,unit:delegate.unit},
    sessionName:session.name},{headers:{"Cache-Control":"private, no-store"}});
  if(error){
   console.error("self checkin write",error.code);
   return fail(error.message.includes("CHECKIN_OUTSIDE_WINDOW")?
    "Phiên đã hết thời gian điểm danh.":error.message.includes("CHECKIN_QR_SCOPE_DENIED")?
    "Phiên không chấp nhận QR theo phiên.":"Không ghi được điểm danh. Vui lòng liên hệ BTC.",409);
  }
  return NextResponse.json({ok:true,checkin,
   delegate:{id:delegate.id,code:delegate.code,full_name:delegate.full_name,unit:delegate.unit},
   sessionName:session.name
  },{headers:{"Cache-Control":"private, no-store"}});
 }catch{return fail("Yêu cầu điểm danh không hợp lệ. Vui lòng thử lại.",400);}
}
