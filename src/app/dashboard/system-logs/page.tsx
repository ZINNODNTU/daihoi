import {redirect} from "next/navigation";
import {getSystemLogAccess} from "@/lib/system-log-access";
import {AppShell} from "@/components/app-shell";
import {SystemLogsClient} from "@/components/system-logs-client";

export const dynamic="force-dynamic";
export default async function SystemLogsPage(){
 const access=await getSystemLogAccess();
 if(!access.user)redirect("/login");
 if(!access.allowed)redirect("/dashboard");
 const {data:profile}=await access.supabase.from("profiles")
  .select("full_name").eq("id",access.user.id).maybeSingle();
 return <AppShell name={profile?.full_name||access.user.email||""} canViewSystemLogs>
  <SystemLogsClient/>
 </AppShell>;
}
