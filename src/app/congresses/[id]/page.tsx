import {notFound} from "next/navigation";
import {getAuth,getCongressEffectiveAbilities} from "@/lib/auth";
import {CongressOverviewForUser} from "@/components/congress-overview";
export const dynamic="force-dynamic";
export default async function CongressHome({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {supabase,user}=await getAuth();
 if(!user)notFound();
 const effectiveAbilities=await getCongressEffectiveAbilities(supabase,user.id,id);
 if(!effectiveAbilities.includes("workspace.view"))notFound();
 return <CongressOverviewForUser supabase={supabase} id={id} effectiveAbilities={effectiveAbilities}/>;
}
