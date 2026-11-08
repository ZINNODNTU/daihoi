import {redirect,notFound} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {AppShell} from "@/components/app-shell";
import {hasRole} from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function CongressLayout({children,params}:{children:React.ReactNode;params:Promise<{id:string}>}){
 const {id}=await params;const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login");
 const [{data:congress},{data:profile}]=await Promise.all([
  supabase.from("congresses").select("id,name").eq("id",id).maybeSingle(),
  supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle()
 ]);
 if(!congress)notFound();
  const canManage=await hasRole(supabase,user.id,id,"admin");
 const {data:membership}=canManage?{data:{role:"admin"}}:await supabase.from("congress_members")
  .select("role").eq("congress_id",id).eq("user_id",user.id).maybeSingle();
 const canViewBch=canManage||membership?.role==="secretary";
 return <AppShell name={profile?.full_name||user.email||""} congressId={id} congressName={congress.name} canManage={canManage} canViewBch={canViewBch}>{children}</AppShell>;
}
