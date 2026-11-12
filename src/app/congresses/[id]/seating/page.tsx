import {getAuth,hasCongressAbility} from "@/lib/auth";
import {SeatingClient} from "@/components/seating-client";
export const dynamic="force-dynamic";
export default async function SeatingPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const {supabase,user}=await getAuth();
  const canManage=!!user&&await hasCongressAbility(supabase,user.id,id,"seating.write");
  return <SeatingClient congressId={id} canManage={canManage}/>;
}