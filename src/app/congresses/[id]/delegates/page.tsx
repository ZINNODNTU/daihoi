import {getAuth,hasRole} from "@/lib/auth";
import {notFound} from "next/navigation";
import {DelegatesClient} from "@/components/delegates-client";
import {DelegateAdminTabs} from "@/components/delegate-admin-tabs";
import type {Delegate,AttendanceSession} from "@/lib/types";
export default async function DelegatesPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const {supabase,user}=await getAuth();
 if(!user||!(await hasRole(supabase,user.id,id,"admin")))notFound();
 const [delegates,sessions,congress]=await Promise.all([
  supabase.from("delegates")
   .select("id,congress_id,code,full_name,unit,student_id,position,login_email,auth_user_id,delegate_type,gender,birth_date,qr_version,barcode_code,is_active,photo_path")
   .eq("congress_id",id).order("code"),
  supabase.from("attendance_sessions")
   .select("id,congress_id,name,status,starts_at,ends_at,qr_policy")
   .eq("congress_id",id).order("created_at",{ascending:false}),
  supabase.from("congresses").select("id,slug").eq("id",id).maybeSingle()
 ]);
 const canManage=!!user&&await hasRole(supabase,user.id,id,"admin");
 if(delegates.error)return <>
  <DelegateAdminTabs congressId={id} active="delegates" canManage={canManage}/>
  <section role="alert" className="rounded-xl border border-[#f0d6c7] bg-[#fff8f3] p-5 text-[13px] leading-6 text-[#a25737]">
   Không tải được danh sách đại biểu. Kiểm tra kết nối Supabase và cập nhật
   <code className="mx-1">upgrade-delegate-demographics-v15.sql</code> trước khi nhập hoặc chỉnh sửa hồ sơ.
  </section>
 </>;
 return <>
  <DelegateAdminTabs congressId={id} active="delegates" canManage={canManage}/>
  <DelegatesClient congressId={id} congressCode={congress.data?.slug||id}
   delegates={(delegates.data??[]) as Delegate[]}
   sessions={(sessions.data??[]) as AttendanceSession[]}
   canManage={canManage}/>
 </>;
}
