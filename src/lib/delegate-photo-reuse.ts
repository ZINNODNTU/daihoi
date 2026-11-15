import {delegatePortraitKey,sharedPortraitKey} from "@/lib/portrait-policy";
import {isSameDelegateIdentity} from "@/lib/delegate-identity";

/** Private, server-verified identity gate. A shared MSSV is not enough by itself. */
export type PortraitLinkPerson={
 id:string;congress_id:string;student_id:string|null;full_name:string;
 birth_date:string|null;auth_user_id:string|null;photo_path:string|null;
 is_active:boolean;
};

export function normalizePortraitStudentId(value:string|null|undefined){
 return typeof value==="string"?value.trim().toUpperCase():"";
}

/** Only link directly from a photo's actual owner row; no chained or arbitrary keys. */
export function canReuseDelegatePortrait(target:PortraitLinkPerson,source:PortraitLinkPerson):boolean{
 const targetStudent=normalizePortraitStudentId(target.student_id);
 if(!target.is_active||!source.is_active||!targetStudent||targetStudent.length<4||
    target.id===source.id||target.congress_id===source.congress_id||
    normalizePortraitStudentId(source.student_id)!==targetStudent||
    !isSameDelegateIdentity(target.full_name,source.full_name)||
    (target.birth_date&&source.birth_date&&target.birth_date!==source.birth_date)||
    (target.auth_user_id&&source.auth_user_id&&target.auth_user_id!==source.auth_user_id)||
    !source.photo_path)return false;

 const key=source.photo_path.toLowerCase();
 if(key===delegatePortraitKey(source.congress_id,source.id))return true;
 // Shared portraits belong to a specific Supabase Auth identity. Never expose
 // one to a profile with no matching Auth ID, even when student IDs match.
 return Boolean(source.auth_user_id&&target.auth_user_id===source.auth_user_id&&
  key===sharedPortraitKey(source.auth_user_id));
}

/** After linking, a target may read an owner's local portrait only if identity
 * is still consistent and the source row remains active.
 */
export function isVerifiedReusedDelegatePortrait(
 target:PortraitLinkPerson,sources:readonly PortraitLinkPerson[]
):boolean{
 return Boolean(target.photo_path&&sources.some(source=>
  source.photo_path?.toLowerCase()===target.photo_path?.toLowerCase()&&
  canReuseDelegatePortrait(target,source)));
}
