import {redirect} from "next/navigation";
import {Suspense} from "react";
import {getAuth} from "@/lib/auth";
import {AppShell} from "@/components/app-shell";
import {AccessControlClient} from "@/components/access-control-client";

export const dynamic="force-dynamic";
export default async function AdminAccessPage(){
 const {supabase,user}=await getAuth();
 if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("platform_role,full_name")
  .eq("id",user.id).maybeSingle();
 if(profile?.platform_role!=="super_admin")redirect("/dashboard");
 return <AppShell name={profile.full_name||user.email||"Quản trị"} canViewSystemLogs>
  <Suspense fallback={<div className="p-8 text-sm">Đang mở quản lý RBAC...</div>}>
   <AccessControlClient/>
  </Suspense>
 </AppShell>;
}
