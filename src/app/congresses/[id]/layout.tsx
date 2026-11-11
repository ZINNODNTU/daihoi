import {redirect,notFound} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {AppShell} from "@/components/app-shell";
import {hasRole} from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function CongressLayout({children,params}:{children:React.ReactNode;params:Promise<{id:string}>}){
 const {id}=await params;
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login");
 // Không tiết lộ thông tin nghiệp vụ hoặc dựng sidebar trước khi xác minh quyền.
 const canView=await hasRole(supabase,user.id,id,"viewer");
 if(!canView)redirect("/my-card");
 const [congressResult,profileResult,adminResult,membershipResult]=await Promise.all([
  supabase.from("congresses").select("id,name,kind").eq("id",id).maybeSingle(),
  supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle(),
  hasRole(supabase,user.id,id,"admin"),
  supabase.from("congress_members").select("role").eq("congress_id",id).eq("user_id",user.id).maybeSingle()
 ]);
 const congress=congressResult.data,profile=profileResult.data;
 if(!congress)notFound();
 const canManage=adminResult;
 const canViewBch=canManage||membershipResult.data?.role==="secretary";
 const canCheckin=canManage||membershipResult.data?.role==="checkin";
 return <AppShell name={profile?.full_name||user.email||""} congressId={id}
  congressName={congress.name} congressKind={congress.kind} canManage={canManage} canViewBch={canViewBch}
  canCheckin={canCheckin} canViewSystemLogs={canManage}>{children}</AppShell>;
}
