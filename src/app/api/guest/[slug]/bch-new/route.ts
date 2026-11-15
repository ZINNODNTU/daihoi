import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {readPublishedNewBch} from "@/lib/bch-new-committee";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const preferredRegion="bom1";
const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEADERS={"Cache-Control":"no-store, max-age=0","X-Content-Type-Options":"nosniff"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers:HEADERS});

/** Public read: only published new BCH flashcards from a live congress.
 * Never return the internal election ledger (votes_received or total_ballots). */
export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(slug.length>120||!SLUG.test(slug))return fail("Đại hội không hợp lệ.",404);
 try{
  const {data:congress,error}=await createAdminClient().from("congresses")
   .select("id,name,kind").eq("slug",slug).eq("status","live")
   .abortSignal(AbortSignal.timeout(9000)).maybeSingle();
  if(error)return fail("Không thể tải thông tin Đại hội.",503);
  if(!congress)return fail("Đại hội không đang diễn ra.",404);
  if(congress.kind!=="doan")return NextResponse.json({committee:null},{headers:HEADERS});
  const publication=await readPublishedNewBch(congress.id);
  if(!publication)return NextResponse.json({committee:null},{headers:HEADERS});
  const members=publication.members.map(item=>({
   id:item.id,congress_id:item.congress_id,full_name:item.full_name,
   birth_year:item.birth_year,hometown:item.hometown,ethnicity:item.ethnicity,
   education_level:item.education_level,union_join_year:item.union_join_year,
   current_position:item.current_position,photo_path:item.photo_path,
   display_order:item.display_order,created_at:item.created_at,
   updated_at:item.updated_at,congressName:congress.name
  }));
  return NextResponse.json({committee:{
   memberCount:publication.memberCount,publishedAt:publication.publishedAt,members
  }},{headers:HEADERS});
 }catch{
  return fail("Không thể tải BCH khóa mới đã công bố. Vui lòng thử lại.",503);
 }
}
