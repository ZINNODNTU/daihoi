import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";
import {hasCongressAbility} from "@/lib/auth";
import {canReuseDelegatePortrait,type PortraitLinkPerson} from "@/lib/delegate-photo-reuse";

type Supabase=Parameters<typeof hasCongressAbility>[0];

/** Batched candidate discovery; never return details from source congresses to
 * the browser. Only verified targets receive the link action.
 */
export async function availableDelegatePortraitLinks(
 supabase:Supabase,actorId:string,congressId:string,delegates:readonly PortraitLinkPerson[]
):Promise<string[]>{
 const students=[...new Set(delegates.filter(d=>d.is_active&&d.student_id)
  .map(d=>d.student_id!.trim().toUpperCase()))];
 if(!students.length)return [];
 const db=createAdminClient();
 const fields="id,congress_id,student_id,full_name,birth_date,auth_user_id,photo_path,is_active";
 const sources:PortraitLinkPerson[]=[];
 for(let i=0;i<students.length;i+=75){
  const {data,error}=await db.from("delegates").select(fields)
   .in("student_id",students.slice(i,i+75)).eq("is_active",true)
   .not("photo_path","is",null).neq("congress_id",congressId).limit(1001);
  if(error||!data||data.length>1000)return [];
  sources.push(...data);
 }
 const byStudent=new Map<string,PortraitLinkPerson[]>();
 for(const source of sources){
  const key=source.student_id?.trim().toUpperCase()||"";
  byStudent.set(key,[...(byStudent.get(key)||[]),source]);
 }
 const permissionCache=new Map<string,boolean>();
 const matching:string[]=[];
 for(const target of delegates){
  if(!target.is_active||!target.student_id)continue;
  for(const source of byStudent.get(target.student_id.trim().toUpperCase())||[]){
   if(!canReuseDelegatePortrait(target,source))continue;
   const account=Boolean(target.auth_user_id&&target.auth_user_id===source.auth_user_id);
   if(!account){
    if(!permissionCache.has(source.congress_id))
     permissionCache.set(source.congress_id,
      await hasCongressAbility(supabase,actorId,source.congress_id,"delegates.read"));
    if(!permissionCache.get(source.congress_id))continue;
   }
   matching.push(target.id);
   break;
  }
 }
 return matching;
}
