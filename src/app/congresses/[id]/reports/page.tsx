import {getAuth} from "@/lib/auth";
import {AttendanceReportClient} from "@/components/attendance-report-client";
import type {ReportDelegate} from "@/lib/attendance-report";
import type {AttendanceSession} from "@/lib/types";
export default async function ReportsPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {supabase}=await getAuth();
 const [congress,delegates,sessions]=await Promise.all([
  supabase.from("congresses").select("name,kind,term").eq("id",id).maybeSingle(),
  supabase.from("delegates").select("id,code,full_name,unit,delegate_type,is_active").eq("congress_id",id).order("code"),
  supabase.from("attendance_sessions").select("id,congress_id,name,status,starts_at,ends_at,qr_policy").eq("congress_id",id).order("created_at",{ascending:false})
 ]);
 return <AttendanceReportClient
   congressId={id}
   congressName={congress.data?.name||"Đại hội"}
   congressKind={congress.data?.kind==="hoi_sinh_vien"?"Hội Sinh viên":"Đoàn TNCS Hồ Chí Minh"}
   term={congress.data?.term||""}
   delegates={(delegates.data||[]) as ReportDelegate[]}
   sessions={(sessions.data||[]) as AttendanceSession[]}
 />;
}
