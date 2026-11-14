import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Only an explicitly LIVE congress is public. Do not infer public permission
 * from knowledge of a slug, an old guest cookie, or a stale access code.
 * Check this at the point of each file/portrait request so that marking a
 * congress completed or preparing immediately revokes anonymous access.
 */
export async function hasPublicCongressAccess(congressId:string):Promise<boolean>{
 if(!UUID.test(congressId))return false;
 try{
  const {data,error}=await createAdminClient().from("congresses")
   .select("status").eq("id",congressId).maybeSingle();
  return !error&&data?.status==="live";
 }catch{return false;}
}
