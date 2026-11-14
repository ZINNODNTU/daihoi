import {redirect} from "next/navigation";
import {getSystemLogAccess} from "@/lib/system-log-access";
import {AppShell} from "@/components/app-shell";
import {SystemLogsClient} from "@/components/system-logs-client";
import {resolveAdminSidebarCongress} from "@/lib/admin-sidebar-context";

export const dynamic="force-dynamic";
export default async function SystemLogsPage({searchParams}:{searchParams:Promise<{congressId?:string}>}){
 const access=await getSystemLogAccess();
 if(!access.user)redirect("/login");
 if(!access.allowed)redirect("/dashboard");
 const {congressId}=await searchParams;
 const sidebar=await resolveAdminSidebarCongress(access.supabase,congressId);
 const {data:profile}=await access.supabase.from("profiles")
  .select("full_name").eq("id",access.user.id).maybeSingle();
 return <AppShell name={profile?.full_name||access.user.email||""}
  accessRole="super_admin" canViewSystemLogs
  congressId={sidebar?.id} congressName={sidebar?.name} congressKind={sidebar?.kind}>
  <SystemLogsClient/>
 </AppShell>;
}
