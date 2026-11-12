import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {parseAndVerifyQr} from "@/lib/qr";
import {getWindowStatus,isQrAllowed} from "@/lib/attendance-window";
import {createAdminClient} from "@/lib/supabase/admin";
import {writeSystemLog} from "@/lib/system-log";
export const runtime="nodejs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const barcodePattern=/^DB[0-9A-F]{20}$/;
function jsonError(error:string,status:number,extra:Record<string,unknown>={}){
 return NextResponse.json({error,...extra},{status});
}
const dbMessages:Record<string,string>={
 CHECKIN_SESSION_MISSING:"Phiên điểm danh không tồn tại.",
 CHECKIN_SESSION_CLOSED:"BTC đã đóng phiên điểm danh.",
 CHECKIN_WINDOW_NOT_CONFIGURED:"Phiên chưa được cấu hình giờ điểm danh.",
 CHECKIN_OUTSIDE_WINDOW:"Hiện không nằm trong giờ điểm danh của phiên.",
 CHECKIN_DELEGATE_INACTIVE:"Đại biểu không còn trong danh sách hoạt động.",
 CHECKIN_QR_SCOPE_DENIED:"Loại mã QR này không được phép dùng trong phiên.",
 CHECKIN_NOTE_REQUIRED:"Cần ghi rõ lý do điểm danh dự phòng."
};
export async function POST(request:Request){
 try{
  const {supabase,user}=await getAuth();
  if(!user)return jsonError("Vui lòng đăng nhập.",401);
  const body=await request.json();
  const congressId=String(body.congressId||"").toLowerCase();
  const sessionId=String(body.sessionId||"").toLowerCase();
  const method=body.method==="qr"?"qr":body.method==="manual"?"manual":body.method==="barcode"?"barcode":null;
  if(!uuid.test(congressId)||!uuid.test(sessionId)||!method)
   return jsonError("Mã Đại hội, phiên hoặc phương thức không hợp lệ.",400);
  if(!(await hasCongressAbility(supabase,user.id,congressId,"attendance.scan")))
   return jsonError("Tài khoản không được phân quyền điểm danh tại Đại hội này.",403);
  const {data:session,error:sessionError}=await supabase.from("attendance_sessions")
   .select("id,status,starts_at,ends_at,qr_policy")
   .eq("id",sessionId).eq("congress_id",congressId).maybeSingle();
  if(sessionError)return jsonError("Không đọc được cấu hình phiên điểm danh.",500);
  if(!session)return jsonError("Phiên điểm danh không tồn tại.",404);
  if(getWindowStatus(session)!=="open")
   return jsonError("Phiên không mở hoặc đã nằm ngoài giờ điểm danh quy định.",409);

  let delegateId=String(body.delegateId||"").toLowerCase();
  let version=0;
  let qrScope:"fixed"|"session"|null=null;
  let barcodeCode="";
  if(method==="qr"){
   const parsed=parseAndVerifyQr(String(body.token||""));
   if(!parsed||parsed.congressId!==congressId)
    return jsonError("QR không hợp lệ hoặc không thuộc Đại hội này.",400);
   if(parsed.scope==="session" && parsed.sessionId!==sessionId)
    return jsonError("QR này dành cho phiên khác.",409);
   if(!isQrAllowed(session.qr_policy,parsed.scope))
    return jsonError("Phiên này không cho phép sử dụng loại QR vừa quét.",409);
   delegateId=parsed.delegateId;
   version=parsed.version;
   qrScope=parsed.scope;
  }
  const note=String(body.note||"").trim().slice(0,500);
  if(method==="manual"||method==="barcode"){
   if(body.confirmedIdentity!==true||note.length<3)
    return jsonError("BTC phải xác minh danh tính và ghi lý do điểm danh dự phòng.",400);
   if(method==="barcode"){
    barcodeCode=String(body.barcodeCode||"").trim().toUpperCase();
    if(!barcodePattern.test(barcodeCode))return jsonError("Mã barcode không hợp lệ.",400);
   }
  }
  if(method!=="barcode"&&!uuid.test(delegateId))
   return jsonError("Mã đại biểu không hợp lệ.",400);

  const lookup=supabase.from("delegates")
   .select("id,full_name,code,is_active,qr_version,barcode_code")
   .eq("congress_id",congressId);
  const {data:delegate,error:delegateError}=await (
   method==="barcode"
    ?lookup.eq("barcode_code",barcodeCode)
    :lookup.eq("id",delegateId)
  ).maybeSingle();
  if(delegateError)return jsonError("Không tra cứu được đại biểu.",500);
  if(!delegate||!delegate.is_active||(method==="qr"&&delegate.qr_version!==version))
   return jsonError("Không tìm thấy đại biểu đang hoạt động hoặc QR đã bị thu hồi.",400);
  if(method==="barcode")delegateId=delegate.id;

  // Tới đây mới dùng secret/service role. Client không được phép INSERT trực tiếp.
  const serverDb=createAdminClient();
  const {data,error}=await serverDb.from("checkins").insert({
   congress_id:congressId,session_id:sessionId,delegate_id:delegateId,
   checked_in_by:user.id,method,qr_scope:qrScope,note:method==="qr"?null:note
  }).select("id,checked_in_at").single();

  if(error?.code==="23505")
   return jsonError("Đại biểu đã được điểm danh trong phiên này.",409,{duplicate:true});
  if(error){
   for(const [key,message] of Object.entries(dbMessages))
    if(error.message.includes(key))return jsonError(message,409);
   const requestId=await writeSystemLog({level:"error",source:"attendance",event:"attendance.checkin_write_failed",
     message:"Không ghi được lượt điểm danh vào Supabase.",congressId,actorId:user.id,statusCode:500,
     context:{operation:"checkins.insert",dbCode:error.code||"unknown",sessionId}});
   return jsonError("Không ghi được điểm danh. Kiểm tra cấu hình máy chủ và Supabase.",500,{requestId});
  }
  return NextResponse.json({
   ok:true,checkin:data,
   delegate:{id:delegate.id,code:delegate.code,full_name:delegate.full_name},
   method,qrScope
  },{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  await writeSystemLog({level:"error",source:"attendance",event:"attendance.checkin_unexpected_error",
    message:"Điểm danh gặp lỗi xử lý không mong đợi.",statusCode:500,
    context:{operation:"checkins.POST",errorName:error instanceof Error?error.name:"unknown"}});
  return jsonError("Máy chủ chưa cấu hình hoặc dữ liệu gửi lên không hợp lệ.",500);
 }
}