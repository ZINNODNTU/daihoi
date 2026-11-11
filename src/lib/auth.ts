import "server-only";
import {createClient} from "@/lib/supabase/server";
import {cache} from "react";
import {canCongress,type CongressAbility,type CongressRole} from "@/lib/congress-permissions";

type Db=Awaited<ReturnType<typeof createClient>>;
export type Role="admin"|"checkin"|"secretary"|"delegate"|"guest";
// React server-request cache: one verified user lookup for a layout + its page.
// Never cache across separate HTTP requests or users.
export const getAuth=cache(async ()=>{
 const supabase=await createClient();
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return {supabase,user:null};
 return {supabase,user};
});

// Read-only portal views use a verified JWT instead of an Auth /user request
// on every navigation. Supabase verifies asymmetric JWTs locally using JWKS.
// Mutating and privileged API routes continue using getAuth() / getUser().
export const getPortalViewerAuth=cache(async ()=>{
 const supabase=await createClient();
 const {data,error}=await supabase.auth.getClaims();
 const claims=data?.claims;
 if(error||!claims?.sub)return {supabase,user:null};
 return {supabase,user:{
  id:claims.sub,
  email:typeof claims.email==="string"?claims.email:undefined
 }};
});

export async function isStaffUser(supabase:Db,userId:string){
 const profile=await supabase.from("profiles").select("platform_role").eq("id",userId).maybeSingle();
 if(profile.error)return false;
 if(profile.data?.platform_role==="super_admin")return true;
 const [members,btc]=await Promise.all([
  supabase.from("congress_members").select("role,congress_id").eq("user_id",userId)
   .in("role",["admin","checkin","secretary"]).limit(20),
  supabase.from("btc_accounts").select("congress_id").eq("user_id",userId)
   .is("disabled_at",null).limit(1)
 ]);
 if(members.error||btc.error)return false;
 return Boolean(btc.data?.some(item=>
   members.data?.some(member=>member.congress_id===item.congress_id)));
}
/** Fail-closed, congress-scoped role resolution. A plain congress_members row
 * never authorizes BTC access: it must match an enabled independent BTC account.
 * The global super_admin exception is stored only in profiles, not user_metadata.
 */
export async function getCongressRole(supabase:Db,userId:string,congressId:string):Promise<CongressRole>{
 const profile=await supabase.from("profiles").select("platform_role")
  .eq("id",userId).maybeSingle();
 if(profile.error)return null;
 if(profile.data?.platform_role==="super_admin")return "super_admin";
 const [membership,btc]=await Promise.all([
  supabase.from("congress_members").select("role").eq("congress_id",congressId)
   .eq("user_id",userId).maybeSingle(),
  supabase.from("btc_accounts").select("congress_id").eq("user_id",userId)
   .eq("congress_id",congressId).is("disabled_at",null).maybeSingle()
 ]);
 if(membership.error||btc.error)return null;
 if(btc.data?.congress_id!==congressId)return null;
 const role=membership.data?.role;
 return role==="admin"||role==="checkin"||role==="secretary"?role:null;
}
export async function hasCongressAbility(
 supabase:Db,userId:string,congressId:string,ability:CongressAbility
){
 return canCongress(await getCongressRole(supabase,userId,congressId),ability);
}
export async function hasRole(
 supabase:Db,userId:string,congressId:string,needed:"admin"|"checkin"|"viewer"
){
 return hasCongressAbility(supabase,userId,congressId,
  needed==="admin"?"settings.manage":needed==="checkin"?"attendance.scan":"workspace.view");
}