import {redirect} from "next/navigation";
import Link from "next/link";
import {getAuth} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {getWindowStatus,isQrAllowed} from "@/lib/attendance-window";
import {verifySessionEntryQr} from "@/lib/session-entry-qr";
import {SelfCheckinClient} from "@/components/self-checkin-client";

export const dynamic="force-dynamic";
const validUuid=(id:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

function Message({text}:{text:string}){
 return <main className="flex min-h-dvh items-center justify-center bg-[#f1f5f8] p-5">
  <div className="w-full max-w-md rounded-2xl border border-[#deeaef] bg-white px-6 py-9 text-center shadow-lg">
   <p className="text-xs font-bold tracking-widest text-[#1689a9]">ĐẠI HỘI SỐ · ĐIỂM DANH</p>
   <h1 className="mt-4 text-lg font-extrabold text-[#2a4f63]">Không thể sử dụng mã QR này</h1>
   <p className="mt-3 text-sm leading-7 text-[#71899a]">{text}</p>
   <Link className="btn btn-secondary mt-6" href="/my-card">Về thẻ đại biểu của tôi</Link>
  </div>
 </main>;
}
export default async function CheckinSessionPage({
 params,searchParams
}:{
 params:Promise<{sessionId:string}>;
 searchParams:Promise<{t?:string|string[]}>;
}){
 const {sessionId}=await params;
 const query=await searchParams;
 const token=typeof query.t==="string"?query.t:"";
 if(!validUuid(sessionId)||!token||token.length>100)
  return <Message text="Đường dẫn điểm danh không hợp lệ. Hãy quét QR của phiên tại hội trường."/>;
 const {user}=await getAuth();
 if(!user){
  const next="/checkin/s/"+sessionId+"?t="+encodeURIComponent(token);
  redirect("/login?next="+encodeURIComponent(next));
 }
 const admin=createAdminClient();
 const {data:session,error}=await admin.from("attendance_sessions")
  .select("id,congress_id,name,status,starts_at,ends_at,qr_policy")
  .eq("id",sessionId).maybeSingle();
 if(error||!session)return <Message text="Phiên điểm danh không tồn tại."/>;
 if(!verifySessionEntryQr(token,session.congress_id,sessionId))
  return <Message text="Mã QR không hợp lệ với phiên này. Vui lòng kiểm tra mã do Ban Tổ chức cung cấp."/>;
 if(!isQrAllowed(session.qr_policy,"session")||getWindowStatus(session)!=="open")
  return <Message text="Phiên chưa mở, đã đóng hoặc không chấp nhận QR theo phiên."/>;
 const {data:delegates,error:delegateError}=await admin.from("delegates")
  .select("id,code,full_name,unit,photo_path")
  .eq("congress_id",session.congress_id).eq("auth_user_id",user.id)
  .eq("is_active",true).limit(2);
 if(delegateError||delegates?.length!==1)
  return <Message text="Tài khoản chưa liên kết với đúng một hồ sơ đại biểu tại Đại hội này. Vui lòng liên hệ Ban Tổ chức."/>;
 const {data:congress}=await admin.from("congresses").select("name,kind")
  .eq("id",session.congress_id).maybeSingle();
 return <SelfCheckinClient sessionId={sessionId} token={token}
  sessionName={session.name} congressName={congress?.name||"Đại hội"}
   kind={congress?.kind==="hoi_sinh_vien"?"hoi_sinh_vien":"doan"}
  delegate={delegates[0]}/>;
}
