import "server-only";
import {createAdminClient} from "@/lib/supabase/admin";
import type {GuestCongress} from "@/components/guest-access-entry";

/** Public index includes only congresses marked "live" by organizers.
 * Service-role is confined to these non-private fields, never delegate data.
 */
export async function loadAvailableGuestCongresses():Promise<GuestCongress[]>{
 const {data,error}=await createAdminClient().from("congresses")
  .select("id,slug,name,term,kind,venue,starts_at,ends_at")
  .eq("status","live")
  .order("starts_at",{ascending:false,nullsFirst:false})
  .limit(100);
 if(error)throw new Error("Không tải được danh sách Đại hội đang diễn ra.");
 return (data||[]) as GuestCongress[];
}
