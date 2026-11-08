import {getAuth,hasRole} from "@/lib/auth";
import {DelegatesClient} from "@/components/delegates-client";
import type {Delegate,AttendanceSession} from "@/lib/types";
export default async function DelegatesPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const {supabase,user}=await getAuth();
 const [delegates,sessions,congress]=await Promise.all([
  supabase.from("delegates")
   .select("id,congress_id,code,full_name,unit,student_id,position,login_email,auth_user_id,delegate_type,qr_version,barcode_code,is_active,photo_path")
   .eq("congress_id",id).order("code"),
  supabase.from("attendance_sessions")
   .select("id,congress_id,name,status,starts_at,ends_at,qr_policy")
   .eq("congress_id",id).order("created_at",{ascending:false}),
  supabase.from("congresses").select("id,slug").eq("id",id).maybeSingle()
 ]);
 const canManage=!!user&&await hasRole(supabase,user.id,id,"admin");
 return <DelegatesClient
  congressId={id} congressCode={congress.data?.slug||id}
  delegates={(delegates.data??[]) as Delegate[]}
  sessions={(sessions.data??[]) as AttendanceSession[]}
  canManage={canManage}
 />;
}
