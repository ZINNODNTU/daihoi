import "server-only";
import {cache} from "react";
import {isRbacMigrationPending} from "@/lib/rbac-schema";
import {createAdminClient} from "@/lib/supabase/admin";
import {baseManagedAbilities,resolveGroupAbilities,type ManagedRole,type PortalAbility} from "@/lib/access-rbac";

/** Use a server-owned identity; never accept a simulated user as Auth principal. */
export const loadRbacScope=cache(async(userId:string,congressId:string)=>{
 const db=createAdminClient();
 const {data:assigned,error}=await db.from("rbac_account_assignments")
  .select("group_id").eq("user_id",userId).eq("congress_id",congressId).maybeSingle();
 if(error){
  if(isRbacMigrationPending(error))return {group:null as null|{role:ManagedRole;abilities:string[]},denied:[] as string[]};
  throw Error("RBAC_ASSIGNMENT_READ_FAILED");
 }
 if(!assigned)return {group:null as null|{role:ManagedRole;abilities:string[]},denied:[] as string[]};
 const {data:group,error:groupError}=await db.from("rbac_groups")
  .select("role,abilities").eq("id",assigned.group_id).eq("congress_id",congressId).maybeSingle();
 if(groupError||!group)throw Error("RBAC_GROUP_READ_FAILED");
 return {group:{role:group.role as ManagedRole,abilities:group.abilities as string[]},denied:[] as string[]};
});
/** Returns an empty list on DB errors; a broken permission query cannot restore access. */
export const getPortalAbilities=cache(async(userId:string,congressId:string,role:ManagedRole):Promise<PortalAbility[]>=>{
 if(role!=="delegate"&&role!=="guest")return [];
 try{
  const [scope,denials]=await Promise.all([
   loadRbacScope(userId,congressId),
   createAdminClient().from("rbac_portal_denials").select("ability")
    .eq("user_id",userId).eq("congress_id",congressId).limit(12)
  ]);
  if(denials.error&&!isRbacMigrationPending(denials.error)||scope.group&&scope.group.role!==role)return [];
  const granted=resolveGroupAbilities(baseManagedAbilities(role) as PortalAbility[],
   scope.group?.abilities??null).filter(a=>!(denials.data||[]).some(d=>d.ability===a));
  return granted.includes("portal.access")?granted:[];
 }catch{return [];}
});
export async function hasPortalAbility(userId:string,congressId:string,ability:PortalAbility){
 const db=createAdminClient();
 const [{data:member,error:memberError},{data:delegate,error:delegateError}]=await Promise.all([
  db.from("congress_members").select("role").eq("congress_id",congressId)
   .eq("user_id",userId).maybeSingle(),
  db.from("delegates").select("id").eq("congress_id",congressId)
   .eq("auth_user_id",userId).eq("is_active",true).limit(1)
 ]);
 if(memberError||delegateError)return false;
 const role:ManagedRole|null=delegate?.length?"delegate":member?.role==="guest"?"guest":null;
 return role?(await getPortalAbilities(userId,congressId,role)).includes(ability):false;
}
