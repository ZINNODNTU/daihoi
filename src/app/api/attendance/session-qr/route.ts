import {networkInterfaces} from "node:os";
import {NextResponse} from "next/server";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {isQrAllowed} from "@/lib/attendance-window";
import {createSessionEntryQr} from "@/lib/session-entry-qr";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function fail(error:string,status:number){
 return NextResponse.json({error},{status,headers:{"Cache-Control":"private, no-store"}});
}
function qrOrigin(request:Request){
 const configured=process.env.SESSION_QR_BASE_URL?.trim();
 if(configured){
  const base=new URL(configured);
  if(!["http:","https:"].includes(base.protocol)||base.username||base.password||
   base.pathname!=="/"||base.search||base.hash)
   throw new Error("SESSION_QR_BASE_URL cần là origin HTTP(S).");
  return base.origin;
 }
 const origin=new URL(request.url);
 // Nếu BTC mở localhost, QR vẫn cần dùng địa chỉ LAN để điện thoại truy cập được.
 if(process.env.NODE_ENV==="development"&&
  ["localhost","127.0.0.1","[::1]"].includes(origin.hostname)){
  const adapters=Object.entries(networkInterfaces());
  adapters.sort(([a],[b])=>Number(!/wi-?fi|wireless|ethernet/i.test(a))-
   Number(!/wi-?fi|wireless|ethernet/i.test(b)));
  const lan=adapters.flatMap(([,items])=>items||[]).find(x=>
   x.family==="IPv4"&&!x.internal&&/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(x.address));
  if(lan)return "http://"+lan.address+(origin.port?":"+origin.port:"");
 }
 return origin.origin;
}
export async function GET(request:Request){
 try{
  const {supabase,user}=await getAuth();
  if(!user)return fail("Vui lòng đăng nhập tài khoản BTC.",401);
  const params=new URL(request.url).searchParams;
  const congressId=params.get("congressId")||"";
  const sessionId=params.get("sessionId")||"";
  if(!uuid.test(congressId)||!uuid.test(sessionId))return fail("Phiên không hợp lệ.",400);
  if(!(await hasCongressAbility(supabase,user.id,congressId,"attendance.scan")))
   return fail("Chỉ BTC được phát mã QR điểm danh.",403);
  const {data:session,error}=await createAdminClient().from("attendance_sessions")
   .select("id,congress_id,name,status,starts_at,ends_at,qr_policy,seating_layout_id")
   .eq("id",sessionId).eq("congress_id",congressId).maybeSingle();
  if(error)return fail("Không thể lấy thông tin phiên.",500);
  if(!session)return fail("Không tìm thấy phiên điểm danh.",404);
  if(!isQrAllowed(session.qr_policy,"session"))
   return fail("Phiên chỉ cho phép QR cá nhân. Hãy chọn 'Cả hai' hoặc 'QR theo phiên' để chiếu mã lên màn hình.",409);
  const {token}=createSessionEntryQr(congressId,sessionId);
  const url=qrOrigin(request)+"/checkin/s/"+sessionId+"?t="+encodeURIComponent(token);
  return NextResponse.json({
   url,sessionName:session.name,refreshedAt:new Date().toISOString()
  },{headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
 }catch{return fail("Không cấp được QR phiên. Kiểm tra cấu hình máy chủ.",500);}
}