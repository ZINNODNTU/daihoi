import "server-only";
import {createClient} from "@/lib/supabase/server";
export type Role="admin"|"checkin"|"secretary"|"delegate"|"guest";
export async function getAuth() {
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error || !user) return {supabase,user:null};
  return {supabase,user};
}
export async function hasRole(
  supabase:Awaited<ReturnType<typeof createClient>>,
  userId:string,
  congressId:string,
  needed:"admin"|"checkin"|"viewer"
) {
  const {data:profile}=await supabase.from("profiles").select("platform_role").eq("id",userId).maybeSingle();
  if (profile?.platform_role==="super_admin") return true;
  const {data:member}=await supabase.from("congress_members").select("role")
    .eq("congress_id",congressId).eq("user_id",userId).maybeSingle();
  const role=member?.role as Role|undefined;
  return needed==="admin" ? role==="admin"
    : needed==="checkin" ? role==="admin"||role==="checkin"
    : Boolean(role);
}
