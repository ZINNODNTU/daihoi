import {notFound,redirect} from "next/navigation";
import {Suspense} from "react";
import {getAuth} from "@/lib/auth";
import {AppShell} from "@/components/app-shell";
import {AccessControlClient} from "@/components/access-control-client";

export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function AdminAccessPage({searchParams}:{
 searchParams:Promise<{congressId?:string|string[]}>;
}){
 const {supabase,user}=await getAuth();
 if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("platform_role,full_name")
  .eq("id",user.id).maybeSingle();
 if(profile?.platform_role!=="super_admin")redirect("/dashboard");
 const params=await searchParams;
 const requestedId=params.congressId;
 if(requestedId!==undefined&&(typeof requestedId!=="string"||!UUID.test(requestedId)))
  notFound();
 let congress:{id:string;name:string;kind:"doan"|"hoi_sinh_vien"}|null=null;
 if(requestedId){
  const {data,error}=await supabase.from("congresses").select("id,name,kind")
   .eq("id",requestedId).maybeSingle();
  if(error||!data)notFound();
  congress=data;
 }
 return <AppShell name={profile.full_name||user.email||"Quản trị"}
  canViewSystemLogs accessRole="super_admin"
  congressId={congress?.id} congressName={congress?.name} congressKind={congress?.kind}>
  <Suspense fallback={<div className="p-8 text-sm">Đang mở quản lý RBAC...</div>}>
   <AccessControlClient key={congress?.id||"global"} initialCongressId={congress?.id}/>
  </Suspense>
 </AppShell>;
}
