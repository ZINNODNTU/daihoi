import {getAuth,hasRole} from "@/lib/auth";
import {notFound} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import {AttendanceClient} from "@/components/attendance-client";
import {buildDelegateSeatMap,type SeatingLayoutRef,type SeatRef,type SeatAssignmentRef} from "@/lib/attendance-seating";
import type {Delegate,AttendanceSession,Checkin} from "@/lib/types";

export const dynamic="force-dynamic";
export default async function AttendanceDeskPage({params,searchParams}:{
 params:Promise<{id:string}>;searchParams:Promise<{sessionId?:string}>;
}){
 const {id}=await params;
 const selectedSessionId=(await searchParams).sessionId||"";
 const {supabase,user}=await getAuth();
 if(!user||!(await hasRole(supabase,user.id,id,"checkin")))notFound();
 const [delegates,sessions,checkins]=await Promise.all([
  supabase.from("delegates")
   .select("id,congress_id,code,full_name,unit,delegate_type,qr_version,barcode_code,is_active,photo_path")
   .eq("congress_id",id).order("code"),
  supabase.from("attendance_sessions")
   .select("id,congress_id,name,status,starts_at,ends_at,qr_policy,seating_layout_id")
   .eq("congress_id",id).order("created_at",{ascending:false}),
  supabase.from("checkins").select("*").eq("congress_id",id)
   .order("checked_in_at",{ascending:false}).limit(1500)
 ]);
 const canScan=!!user&&await hasRole(supabase,user.id,id,"checkin");
 const canManage=!!user&&await hasRole(supabase,user.id,id,"admin");
 const canReadSeating=!!user&&await hasRole(supabase,user.id,id,"viewer");
 let seatByDelegate:ReturnType<typeof buildDelegateSeatMap>={};
 if(canReadSeating){
  // Seating tables are intentionally service-only; access the privileged client
  // only after checking congress membership. Never expose service keys to browser.
  const db=createAdminClient();
  const [layouts,seats,assignments]=await Promise.all([
   db.from("seating_layouts").select("id,title,updated_at")
    .eq("congress_id",id).order("updated_at",{ascending:false}).limit(100),
   db.from("seats").select("id,code,row_label,seat_number,zone")
    .eq("congress_id",id).limit(1200),
   db.from("seat_assignments").select("delegate_id,seat_id,layout_id")
    .eq("congress_id",id).limit(1200)
  ]);
  if(!layouts.error&&!seats.error&&!assignments.error){
   seatByDelegate=buildDelegateSeatMap(
    (layouts.data||[]) as SeatingLayoutRef[],
    (seats.data||[]) as SeatRef[],
    (assignments.data||[]) as SeatAssignmentRef[]
   );
  }
 }
 return <AttendanceClient congressId={id}
  delegates={(delegates.data||[]) as Delegate[]}
  sessions={(sessions.data||[]) as AttendanceSession[]}
  initialCheckins={(checkins.data||[]) as Checkin[]}
  seatByDelegate={seatByDelegate} canScan={canScan} canManage={canManage}
  hideManagement defaultSessionId={selectedSessionId}/>;
}
