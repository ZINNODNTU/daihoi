import {redirect,notFound} from "next/navigation";
import {getAuth,hasRole} from "@/lib/auth";
import {CongressSettingsClient} from "@/components/congress-settings-client";
export const dynamic="force-dynamic";
export default async function CongressSettingsPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {supabase,user}=await getAuth();
 if(!user)redirect("/login");
 if(!(await hasRole(supabase,user.id,id,"admin")))redirect(`/congresses/${id}`);
 const {data:congress}=await supabase.from("congresses")
  .select("id,name,term,venue,status,slug,kind").eq("id",id).maybeSingle();
 if(!congress)notFound();
 return <CongressSettingsClient initial={congress}/>;
}
