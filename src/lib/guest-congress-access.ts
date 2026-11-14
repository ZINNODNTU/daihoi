import "server-only";
import {createHash,timingSafeEqual} from "node:crypto";
import {cookies} from "next/headers";
import {createAdminClient} from "@/lib/supabase/admin";

export const GUEST_VIEW_COOKIE="daihoi_guest_view";
export const guestCodePattern=/^gv_[A-Za-z0-9_-]{28,64}$/;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function hashGuestCode(code:string){return createHash("sha256").update(code).digest("hex");}
export function compareGuestCode(code:string,hash:string){
 if(!guestCodePattern.test(code)||!/^[a-f0-9]{64}$/i.test(hash))return false;
 return timingSafeEqual(Buffer.from(hashGuestCode(code),"hex"),Buffer.from(hash,"hex"));
}
export function parseGuestSession(value:string|undefined){
 if(!value||value.length>130)return null;
 const split=value.indexOf(".");
 if(split<0)return null;
 const congressId=value.slice(0,split),code=value.slice(split+1);
 return uuid.test(congressId)&&guestCodePattern.test(code)?{congressId,code}:null;
}
/** A guest viewer has no Supabase Auth identity. The bearer code is stored in a
 * short-lived HTTP-only cookie and revalidated against active DB hash on EVERY
 * read. Rotation/disabling immediately invalidates previously issued sessions.
 */
export async function hasGuestCongressAccess(congressId:string){
 if(!uuid.test(congressId))return false;
 const session=parseGuestSession((await cookies()).get(GUEST_VIEW_COOKIE)?.value);
 if(!session||session.congressId!==congressId)return false;
 try{
  const {data,error}=await createAdminClient().from("congress_guest_links")
   .select("access_hash,enabled").eq("congress_id",congressId).maybeSingle();
  return !error&&Boolean(data?.enabled)&&compareGuestCode(session.code,data!.access_hash);
 }catch{return false;}
}
