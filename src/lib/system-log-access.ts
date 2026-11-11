import "server-only";
import {getAuth} from "@/lib/auth";

export async function getSystemLogAccess(){
 const {supabase,user}=await getAuth();
 if(!user)return {supabase,user:null,allowed:false,superAdmin:false,congressIds:[] as string[]};
 const [profile,members]=await Promise.all([
  supabase.from("profiles").select("platform_role").eq("id",user.id).maybeSingle(),
  supabase.from("congress_members").select("congress_id")
   .eq("user_id",user.id).eq("role","admin").limit(500)
 ]);
 // Read failure denies access, even when an unrelated query succeeded.
 if(profile.error||members.error)return {supabase,user,allowed:false,superAdmin:false,congressIds:[] as string[]};
 const superAdmin=profile.data?.platform_role==="super_admin";
 const congressIds=(members.data||[]).map(row=>row.congress_id);
 return {supabase,user,allowed:superAdmin||congressIds.length>0,superAdmin,congressIds};
}
