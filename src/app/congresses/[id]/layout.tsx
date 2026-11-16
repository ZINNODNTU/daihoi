import {redirect,notFound} from "next/navigation";
import {getAuth} from "@/lib/auth";
import {AppShell} from "@/components/app-shell";
import {ActingSessionNotice} from "@/components/acting-session-notice";
import {getCongressRole,getCongressEffectiveAbilities} from "@/lib/auth";
import {congressFullName} from "@/lib/congress-title";


export const dynamic="force-dynamic";
export default async function CongressLayout({children,params}:{
 children:React.ReactNode;params:Promise<{id:string}>;
}){
 const {id}=await params;
 const {supabase,user}=await getAuth();
 if(!user)redirect("/login");
 // Resolve only verified roles; a revoked or missing BTC account is not staff.
 const [accessRole,effectiveAbilities]=await Promise.all([
  getCongressRole(supabase,user.id,id),getCongressEffectiveAbilities(supabase,user.id,id)
 ]);
 if(!effectiveAbilities.includes("workspace.view"))redirect("/my-card");
 const [congressResult,profileResult]=await Promise.all([
  supabase.from("congresses").select("id,name,kind").eq("id",id).maybeSingle(),
  supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle()
 ]);
 if(congressResult.error||!congressResult.data)notFound();
 const congress=congressResult.data;
 return <><ActingSessionNotice/><AppShell name={profileResult.data?.full_name||user.email||""}
  congressId={id} congressName={congressFullName(congress.name,congress.kind==="hoi_sinh_vien"?"hoi_sinh_vien":"doan")} congressKind={congress.kind}
  accessRole={accessRole} effectiveAbilities={[...effectiveAbilities]} canManage={effectiveAbilities.includes("settings.manage")}
  canViewBch={effectiveAbilities.includes("bch.read")}
  canCheckin={effectiveAbilities.includes("attendance.scan")}
  canViewSystemLogs={accessRole==="super_admin"}>{children}</AppShell></>;
}
