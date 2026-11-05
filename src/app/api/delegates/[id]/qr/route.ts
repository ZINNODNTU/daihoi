import {NextResponse} from "next/server";
import {getAuth,hasRole} from "@/lib/auth";
import {issueQr,issueSessionQr} from "@/lib/qr";
export const runtime="nodejs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  const {supabase,user}=await getAuth();
  if(!user)return NextResponse.json({error:"Cần đăng nhập."},{status:401});
  const {data:d}=await supabase.from("delegates")
   .select("id,congress_id,qr_version,barcode_code,code,full_name,is_active")
   .eq("id",id).maybeSingle();
  if(!d||!d.is_active)return NextResponse.json({error:"Không tìm thấy đại biểu."},{status:404});
  if(!(await hasRole(supabase,user.id,d.congress_id,"viewer")))
   return NextResponse.json({error:"Không đủ quyền."},{status:403});
  const sessionId=new URL(request.url).searchParams.get("sessionId");
  if(sessionId){
   if(!uuid.test(sessionId))return NextResponse.json({error:"Mã phiên không hợp lệ."},{status:400});
   const {data:s}=await supabase.from("attendance_sessions")
    .select("id,name,qr_policy,starts_at,ends_at").eq("id",sessionId).eq("congress_id",d.congress_id).maybeSingle();
   if(!s)return NextResponse.json({error:"Phiên không thuộc Đại hội này."},{status:404});
   if(s.qr_policy==="fixed")return NextResponse.json({error:"Phiên chỉ sử dụng QR cố định."},{status:409});
   return NextResponse.json({
    token:issueSessionQr(d.congress_id,d.id,s.id,d.qr_version),
    scope:"session",sessionName:s.name,startsAt:s.starts_at,endsAt:s.ends_at,
    code:d.code,full_name:d.full_name,barcodeCode:d.barcode_code
   },{headers:{"Cache-Control":"no-store"}});
  }
  return NextResponse.json({
   token:issueQr(d.congress_id,d.id,d.qr_version),scope:"fixed",
   code:d.code,full_name:d.full_name,barcodeCode:d.barcode_code
  },{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Chưa cấu hình khóa ký QR hoặc dữ liệu phiên."},{status:500});}
}
