import {redirect} from "next/navigation";
import {getAuth,hasRole} from "@/lib/auth";
import {CongressTeamClient} from "@/components/congress-team-client";
export const dynamic="force-dynamic";
export default async function TeamPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {supabase,user}=await getAuth();
 if(!user)redirect("/login");
 if(!(await hasRole(supabase,user.id,id,"admin")))redirect(`/congresses/${id}`);
 return <CongressTeamClient congressId={id}/>;
}
