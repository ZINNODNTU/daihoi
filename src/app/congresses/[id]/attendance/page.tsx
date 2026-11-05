import {getAuth,hasRole} from "@/lib/auth";
import {AttendanceClient} from "@/components/attendance-client";
import type {Delegate,AttendanceSession,Checkin} from "@/lib/types";
export default async function AttendancePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const {supabase,user}=await getAuth();
 const [delegates,sessions,checkins]=await Promise.all([
  supabase.from("delegates").select("id,congress_id,code,full_name,unit,delegate_type,qr_version,barcode_code,is_active").eq("congress_id",id).order("code"),
  supabase.from("attendance_sessions").select("id,congress_id,name,status,starts_at,ends_at,qr_policy").eq("congress_id",id).order("created_at",{ascending:false}),
  supabase.from("checkins").select("*").eq("congress_id",id).order("checked_in_at",{ascending:false}).limit(1500)
 ]);
 const canScan=!!user && await hasRole(supabase,user.id,id,"checkin");
 const canManage=!!user && await hasRole(supabase,user.id,id,"admin");
 return <AttendanceClient congressId={id} delegates={(delegates.data||[]) as Delegate[]} sessions={(sessions.data||[]) as AttendanceSession[]} initialCheckins={(checkins.data||[]) as Checkin[]} canScan={canScan} canManage={canManage}/>;
}
