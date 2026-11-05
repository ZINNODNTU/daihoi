import {getAuth,hasRole} from "@/lib/auth";
import {DocumentsClient} from "@/components/documents-client";
import type {DocRow} from "@/lib/types";
export default async function DocumentsPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const {supabase,user}=await getAuth();
 const {data}=await supabase.from("documents").select("*").eq("congress_id",id).order("created_at",{ascending:false});
 const canManage=!!user&&await hasRole(supabase,user.id,id,"admin");
 return <DocumentsClient congressId={id} docs={(data||[]) as DocRow[]} canManage={canManage}/>;
}
