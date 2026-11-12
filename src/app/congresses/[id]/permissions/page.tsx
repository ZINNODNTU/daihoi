import {redirect} from "next/navigation";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {CongressPermissionsClient} from "@/components/congress-permissions-client";

export const dynamic="force-dynamic";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CongressPermissionsPage({params}:{
 params:Promise<{id:string}>
}){
 const {id}=await params;
 if(!UUID.test(id))redirect("/dashboard");
 const {supabase,user}=await getAuth();
 if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("platform_role").eq("id",user.id).maybeSingle();
  if(profile?.platform_role==="super_admin")redirect("/dashboard/access?congressId="+id);
  // Permission management is a server-verified BTC ability, never a client flag.
 if(!(await hasCongressAbility(supabase,user.id,id,"team.manage")))
  redirect("/congresses/"+id);
 return <CongressPermissionsClient congressId={id}/>;
}
