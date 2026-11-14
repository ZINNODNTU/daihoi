import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";

export const runtime="nodejs";
export const dynamic="force-dynamic";
// Collocate the public read-only BCH feed with Supabase in Mumbai.
export const preferredRegion="bom1";
const HEADERS={"Cache-Control":"no-store, max-age=0","X-Content-Type-Options":"nosniff"};
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function fail(error:string,status:number){
 return NextResponse.json({error},{status,headers:HEADERS});
}

/**
 * Public, read-only BCH feed. Resolve the live congress AND its candidates
 * in one PostgREST query instead of two sequential network round trips.
 * Keep fresh status checks, no shared cache and an explicit public allowlist.
 */
export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(slug.length>120||!SLUG.test(slug))return fail("Đại hội không hợp lệ.",404);
 try{
  const started=performance.now();
  const {data:congress,error}=await createAdminClient().from("congresses")
   .select("id,name,bch_candidates(id,congress_id,full_name,birth_year,hometown,ethnicity,education_level,union_join_year,current_position,photo_path,display_order,created_at,updated_at)")
   .eq("slug",slug).eq("status","live")
   .order("display_order",{referencedTable:"bch_candidates"})
   .order("created_at",{referencedTable:"bch_candidates"})
   .limit(500,{referencedTable:"bch_candidates"})
   .abortSignal(AbortSignal.timeout(9000))
   .maybeSingle();
  const dbDuration=performance.now()-started;
  if(dbDuration>2500)console.warn("[guest-bch] slow Supabase read",{durationMs:Math.round(dbDuration)});
  if(error){
   console.error("[guest-bch] Supabase read failed",{code:error.code||"unknown"});
   return fail("Không tải được thông tin nhân sự Đại hội.",503);
  }
  if(!congress)return fail("Đại hội không đang diễn ra.",404);
  // Explicit public projection: never return the ballot tally or secret fields.
  return NextResponse.json({candidates:(congress.bch_candidates||[]).map(item=>({
   id:item.id,congress_id:item.congress_id,full_name:item.full_name,
   birth_year:item.birth_year,hometown:item.hometown,ethnicity:item.ethnicity,
   education_level:item.education_level,union_join_year:item.union_join_year,
   current_position:item.current_position,photo_path:item.photo_path,
   display_order:item.display_order,created_at:item.created_at,
   updated_at:item.updated_at,congressName:congress.name
  }))},{headers:{...HEADERS,"Server-Timing":"supabase;dur="+dbDuration.toFixed(1)}});
 }catch{
  return fail("Không tải được thông tin nhân sự Đại hội.",503);
 }
}
