import {redirect,notFound} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {AppShell} from "@/components/app-shell";
import {getCongressRole} from "@/lib/auth";
import {canCongress} from "@/lib/congress-permissions";

export const dynamic="force-dynamic";
export default async function CongressLayout({children,params}:{
 children:React.ReactNode;params:Promise<{id:string}>;
}){
 const {id}=await params;
 const supabase=await createClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)redirect("/login");
 // Resolve only verified roles; a revoked or missing BTC account is not staff.
 const accessRole=await getCongressRole(supabase,user.id,id);
 if(!canCongress(accessRole,"workspace.view"))redirect("/my-card");
 const [congressResult,profileResult]=await Promise.all([
  supabase.from("congresses").select("id,name,kind").eq("id",id).maybeSingle(),
  supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle()
 ]);
 if(congressResult.error||!congressResult.data)notFound();
 const congress=congressResult.data;
 return <AppShell name={profileResult.data?.full_name||user.email||""}
  congressId={id} congressName={congress.name} congressKind={congress.kind}
  accessRole={accessRole} canManage={canCongress(accessRole,"settings.manage")}
  canViewBch={canCongress(accessRole,"bch.read")}
  canCheckin={canCongress(accessRole,"attendance.scan")}
  canViewSystemLogs={accessRole==="super_admin"}>{children}</AppShell>;
}
