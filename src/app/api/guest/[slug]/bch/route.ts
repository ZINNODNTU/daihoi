import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const HEADERS={"Cache-Control":"no-store, max-age=0","X-Content-Type-Options":"nosniff"};
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function fail(error:string,status:number){
 return NextResponse.json({error},{status,headers:HEADERS});
}

/**
 * Public, read-only BCH feed. Never expose candidates of preparing/closed
 * congresses, and never trust a congressId provided by a client.
 * Sensitive ballot totals are deliberately omitted.
 */
export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(slug.length>120||!SLUG.test(slug))return fail("Đại hội không hợp lệ.",404);
 try{
  const db=createAdminClient();
  const {data:congress,error:congressError}=await db.from("congresses")
   .select("id,name").eq("slug",slug).eq("status","live").maybeSingle();
  if(congressError)return fail("Không đọc được thông tin Đại hội.",503);
  if(!congress)return fail("Đại hội không đang diễn ra.",404);
  const {data,error}=await db.from("bch_candidates")
   .select("id,congress_id,full_name,birth_year,hometown,ethnicity,education_level,union_join_year,current_position,photo_path,display_order,created_at,updated_at")
   .eq("congress_id",congress.id)
   .order("display_order").order("created_at").limit(500);
  if(error)return fail("Không tải được nhân sự BCH.",503);
  // Explicitly whitelist public profile fields. Never spread full database
  // rows into a public response, even when select() is later extended.
  return NextResponse.json({candidates:(data||[]).map(item=>({
   id:item.id,congress_id:item.congress_id,full_name:item.full_name,
   birth_year:item.birth_year,hometown:item.hometown,ethnicity:item.ethnicity,
   education_level:item.education_level,union_join_year:item.union_join_year,
   current_position:item.current_position,photo_path:item.photo_path,
   display_order:item.display_order,created_at:item.created_at,
   updated_at:item.updated_at,congressName:congress.name
  }))},{headers:HEADERS});
 }catch{
  return fail("Không tải được thông tin nhân sự Đại hội.",503);
 }
}
