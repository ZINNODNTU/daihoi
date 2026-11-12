import {redirect,notFound} from "next/navigation";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {CongressSettingsClient} from "@/components/congress-settings-client";
import {CongressDangerZone} from "@/components/congress-danger-zone";
export const dynamic="force-dynamic";
export default async function CongressSettingsPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {supabase,user}=await getAuth();
 if(!user)redirect("/login");
 if(!(await hasCongressAbility(supabase,user.id,id,"settings.manage")))redirect(`/congresses/${id}`);
 const [{data:congress},{data:profile}]=await Promise.all([
  supabase.from("congresses").select("id,name,term,venue,status,slug,kind").eq("id",id).maybeSingle(),
  supabase.from("profiles").select("platform_role").eq("id",user.id).maybeSingle()
 ]);
 if(!congress)notFound();
 return <div className="max-w-5xl space-y-8">
  <CongressSettingsClient initial={congress}/>
  {profile?.platform_role==="super_admin"&&<CongressDangerZone id={id} name={congress.name}/>}
 </div>;
}