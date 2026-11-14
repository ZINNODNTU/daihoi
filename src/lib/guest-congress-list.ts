import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";
import type {GuestCongress} from "@/components/guest-access-entry";
/** Only congresses deliberately enabled by organizers are publicly listed. */
export async function loadAvailableGuestCongresses():Promise<GuestCongress[]>{
 const db=createAdminClient();
 const {data:links,error}=await db.from("congress_guest_links")
  .select("congress_id").eq("enabled",true).limit(200);
 if(error||!links?.length)return [];
 const ids=links.map(link=>link.congress_id);
 const {data,error:congressError}=await db.from("congresses")
  .select("id,slug,name,term,kind").in("id",ids).order("created_at",{ascending:false}).limit(200);
 if(congressError)return [];
 return (data||[]) as GuestCongress[];
}
