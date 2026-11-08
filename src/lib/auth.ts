import "server-only";
import {createClient} from "@/lib/supabase/server";

type Db=Awaited<ReturnType<typeof createClient>>;
export type Role="admin"|"checkin"|"secretary"|"delegate"|"guest";
export async function getAuth() {
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return {supabase,user:null};
 return {supabase,user};
}
export async function isStaffUser(supabase:Db,userId:string){
 const [profile,members]=await Promise.all([
  supabase.from("profiles").select("platform_role").eq("id",userId).maybeSingle(),
  supabase.from("congress_members").select("role").eq("user_id",userId)
   .in("role",["admin","checkin","secretary"]).limit(1)
 ]);
 return profile.data?.platform_role==="super_admin"||Boolean(members.data?.length);
}
export async function hasRole(
 supabase:Db,userId:string,congressId:string,needed:"admin"|"checkin"|"viewer"
){
 const [profile,membership]=await Promise.all([
  supabase.from("profiles").select("platform_role").eq("id",userId).maybeSingle(),
  supabase.from("congress_members").select("role").eq("congress_id",congressId)
   .eq("user_id",userId).maybeSingle()
 ]);
 if(profile.data?.platform_role==="super_admin")return true;
 const role=membership.data?.role as Role|undefined;
 // Delegate/guest NEVER get internal management access (not even read-only).
 if(needed==="admin")return role==="admin";
 if(needed==="checkin")return role==="admin"||role==="checkin";
 return role==="admin"||role==="checkin"||role==="secretary";
}
