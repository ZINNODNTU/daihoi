import {getAuth,hasRole} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {SessionQrScreen} from "@/components/session-qr-screen";
import type {AttendanceSession} from "@/lib/types";

export const dynamic="force-dynamic";
export default async function AttendanceLivePage({params,searchParams}:{
 params:Promise<{id:string}>;searchParams:Promise<{sessionId?:string}>;
}){
 const {id}=await params;
 const query=await searchParams;
 const {supabase,user}=await getAuth();
 const authorized=!!user&&await hasRole(supabase,user.id,id,"checkin");
 if(!authorized)return <div role="alert" className="card p-6 text-sm text-red-700">Chỉ Ban Tổ chức được truy cập màn hình điểm danh.</div>;
 const db=createAdminClient();
 const [sessionsResult,congressResult]=await Promise.all([
  db.from("attendance_sessions").select("id,congress_id,name,status,starts_at,ends_at,qr_policy,seating_layout_id")
   .eq("congress_id",id).order("created_at",{ascending:false}).limit(150),
  db.from("congresses").select("name").eq("id",id).maybeSingle()
 ]);
 if(sessionsResult.error)return <p role="alert" className="card p-6 text-sm text-red-700">Không tải được phiên điểm danh.</p>;
 const sessions=(sessionsResult.data||[]) as AttendanceSession[];
 const initial=sessions.find(s=>s.id===query.sessionId)?.id||sessions[0]?.id||"";
 return <SessionQrScreen congressId={id} congressName={congressResult.data?.name||"Đại hội"}
  sessions={sessions} initialSessionId={initial}/>;
}
