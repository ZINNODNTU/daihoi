import "server-only";
import {getAuth} from "@/lib/auth";

export async function getSystemLogAccess(){
 const {supabase,user}=await getAuth();
 if(!user)return {supabase,user:null,allowed:false,superAdmin:false,congressIds:[] as string[]};
 const [profile,members,accounts]=await Promise.all([
  supabase.from("profiles").select("platform_role").eq("id",user.id).maybeSingle(),
  supabase.from("congress_members").select("congress_id").eq("user_id",user.id).eq("role","admin").limit(500),
  supabase.from("btc_accounts").select("congress_id").eq("user_id",user.id).is("disabled_at",null).limit(1)
 ]);
 if(profile.error||members.error||accounts.error)
  return {supabase,user,allowed:false,superAdmin:false,congressIds:[] as string[]};
 const superAdmin=profile.data?.platform_role==="super_admin";
 const accountId=accounts.data?.[0]?.congress_id;
 const congressIds=(members.data||[]).map(item=>item.congress_id)
  .filter(id=>id===accountId);
 return {supabase,user,allowed:superAdmin||congressIds.length>0,superAdmin,congressIds};
}