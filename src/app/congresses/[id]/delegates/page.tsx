import {getAuth,hasCongressAbility} from "@/lib/auth";
import {notFound} from "next/navigation";
import {DelegatesClient} from "@/components/delegates-client";
import {DelegateAdminTabs} from "@/components/delegate-admin-tabs";
import type {Delegate,AttendanceSession} from "@/lib/types";

const COMMON="id,congress_id,code,full_name,unit,student_id,position,login_email,auth_user_id,delegate_type,gender,birth_date,qr_version,barcode_code,is_active,photo_path";
const ROSTER="hometown,religion,ethnicity,union_join_date,phone_number,class_name,profile_notes";

export default async function DelegatesPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {supabase,user}=await getAuth();
 if(!user||!(await hasCongressAbility(supabase,user.id,id,"delegates.read")))notFound();
 const [rosterDelegates,sessions,congress]=await Promise.all([
  supabase.from("delegates").select(COMMON+","+ROSTER).eq("congress_id",id).order("code"),
  supabase.from("attendance_sessions")
   .select("id,congress_id,name,status,starts_at,ends_at,qr_policy")
   .eq("congress_id",id).order("created_at",{ascending:false}),
  supabase.from("congresses").select("id,slug").eq("id",id).maybeSingle()
 ]);
 // Additive migration may be pending in production. Do not break the original delegate page.
 const missingRoster=!!rosterDelegates.error&&
  /column|schema cache|does not exist|42703|PGRST204/i.test(rosterDelegates.error.message);
 const delegates=missingRoster?await supabase.from("delegates")
  .select(COMMON).eq("congress_id",id).order("code"):rosterDelegates;
 const canManage=await hasCongressAbility(supabase,user.id,id,"delegates.write");
 if(delegates.error)return <>
  <DelegateAdminTabs congressId={id} active="delegates" canManage={canManage}/>
  <section role="alert" className="rounded-xl border border-[#f0d6c7] bg-[#fff8f3] p-5 text-[13px] leading-6 text-[#a25737]">
   Không tải được danh sách đại biểu. Kiểm tra kết nối Supabase và migration
   <code className="mx-1">upgrade-delegate-demographics-v15.sql</code>.
  </section>
 </>;
 return <>
  <DelegateAdminTabs congressId={id} active="delegates" canManage={canManage}/>
  <DelegatesClient congressId={id} congressCode={congress.data?.slug||id}
   delegates={(delegates.data??[]) as Delegate[]}
   sessions={(sessions.data??[]) as AttendanceSession[]}
   canManage={canManage} rosterReady={!missingRoster}/>
 </>;
}
