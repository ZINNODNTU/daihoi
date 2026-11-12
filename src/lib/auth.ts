import "server-only";
import {createClient} from "@/lib/supabase/server";
import {cache} from "react";
import {roleAbilities,ACCOUNT_PERMISSION_CAPABILITIES,type CongressAbility,type CongressRole} from "@/lib/congress-permissions";
import {isRbacMigrationPending} from "@/lib/rbac-schema";
import {currentPortalPreview} from "@/lib/portal-preview-context";

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
 const preview=currentPortalPreview();
  // Only a verified admin preview server render can set this request-local
  // identity. Mutation APIs and the real Auth session are never changed.
  if(preview)return {supabase,user:{id:preview.userId,email:undefined}};
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
/** Server-resolved account rights: verified role + user-specific denied actions.
 * The account restriction table is read-only to clients and RLS self-scoped.
 * Super administrators cannot be restricted through a BTC account.
 */
export async function getCongressEffectiveAbilities(
 supabase:Db,userId:string,congressId:string
):Promise<readonly CongressAbility[]>{
 const role=await getCongressRole(supabase,userId,congressId);
 if(!role)return [];
 if(role==="super_admin")return roleAbilities(role);
 const {data,error}=await supabase.from("btc_account_capability_restrictions")
  .select("ability,allowed").eq("congress_id",congressId).eq("user_id",userId)
  .limit(30);
 // Fail closed; do not bypass per-account overrides when RLS/DB is unavailable.
 if(error)return [];
 const overrides=new Map((data||[]).map(row=>[row.ability,row.allowed]));
 const effective=new Set<CongressAbility>(roleAbilities(role).filter(a=>overrides.get(a)!==false));
 // Granting a dedicated tally function is permitted for a non-admin BTC user.
 // All other role defaults remain non-escalatable.
 for(const ability of ["ballots.read","ballots.write"] as const){
  if(overrides.get(ability)===true)effective.add(ability);
 }
 // Write access never exists without read access (including on stale overrides).
 if(!effective.has("ballots.read"))effective.delete("ballots.write");
 // A group can only restrict the verified base permissions.
  const assignment=await supabase.from("rbac_account_assignments").select("group_id")
   .eq("congress_id",congressId).eq("user_id",userId).maybeSingle();
  if(assignment.error)return isRbacMigrationPending(assignment.error)?[...effective]:[];
  if(assignment.data){
   const group=await supabase.from("rbac_groups").select("role,abilities")
    .eq("congress_id",congressId).eq("id",assignment.data.group_id).maybeSingle();
   if(group.error||!group.data||group.data.role!==role)return [];
   for(const ability of ACCOUNT_PERMISSION_CAPABILITIES){
    if(!group.data.abilities.includes(ability))effective.delete(ability);
   }
  }
  if(!effective.has("ballots.read"))effective.delete("ballots.write");
  return [...effective];
}
export async function hasCongressAbility(
 supabase:Db,userId:string,congressId:string,ability:CongressAbility
){
 const effective=await getCongressEffectiveAbilities(supabase,userId,congressId);
 return effective.includes(ability);
}
export async function hasRole(
 supabase:Db,userId:string,congressId:string,needed:"admin"|"checkin"|"viewer"
){
 return hasCongressAbility(supabase,userId,congressId,
  needed==="admin"?"settings.manage":needed==="checkin"?"attendance.scan":"workspace.view");
}