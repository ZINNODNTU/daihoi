import {createAdminClient} from "@/lib/supabase/admin";
import {congressBchPublication,mapPublishedNewBch,type PublishedNewBch} from "@/lib/bch-new-committee-selection";
import type {BchCandidate} from "@/lib/bch-candidates";

/** Only published snapshots are visible. Never fetch or return vote totals. */
export const NEW_BCH_PUBLIC_FIELDS=
 "id,congress_id,full_name,birth_year,hometown,ethnicity,education_level,union_join_year,current_position,photo_path,display_order,created_at,updated_at";

export async function readPublishedNewBch(congressId:string):Promise<PublishedNewBch|null>{
 const db=createAdminClient();
 const {data:congress,error}=await db.from("congresses")
  .select("bch_new_member_ids,bch_new_published_at").eq("id",congressId).maybeSingle();
 if(error)throw new Error("Không đọc được BCH khóa mới đã công bố. Kiểm tra migration V84.");
 const publication=congressBchPublication(congress);
 if(!publication)return null;
 const ids=congress!.bch_new_member_ids!;
 const {data:records,error:profileError}=await db.from("bch_candidates")
  .select(NEW_BCH_PUBLIC_FIELDS).eq("congress_id",congressId).in("id",ids).limit(500);
 if(profileError)throw new Error("Không đọc được hồ sơ ủy viên BCH khóa mới.");
 return mapPublishedNewBch(congress,(records||[]) as BchCandidate[]);
}
