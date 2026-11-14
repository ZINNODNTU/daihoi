import {notFound} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import {GuestCongressReader} from "@/components/guest-congress-reader";
import type {DocRow} from "@/lib/types";
import type {BchCandidate} from "@/lib/bch-candidates";
export const dynamic="force-dynamic";

export default async function GuestCongressPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>120)notFound();
 const db=createAdminClient();
 const {data:congress,error:congressError}=await db.from("congresses")
  .select("id,slug,name,kind,term,venue,starts_at,ends_at,status")
  .eq("slug",slug).eq("status","live").maybeSingle();
 if(congressError)return <main role="alert" className="mx-auto max-w-xl p-8 text-center text-sm text-red-700">Không tải được thông tin Đại hội. Vui lòng thử lại sau.</main>;
 if(!congress)notFound();
 const [documents,candidates]=await Promise.all([
  db.from("documents")
   .select("id,congress_id,file_name,mime_type,byte_size,drive_file_id,created_at,delegate_visible,display_order")
   .eq("congress_id",congress.id).eq("delegate_visible",true)
   .order("display_order").order("created_at",{ascending:false}).limit(500),
  db.from("bch_candidates")
   .select("id,congress_id,full_name,birth_year,hometown,ethnicity,education_level,union_join_year,current_position,photo_path,display_order,created_at,updated_at")
   .eq("congress_id",congress.id).order("display_order").order("created_at").limit(500)
 ]);
 if(documents.error||candidates.error)
  return <main role="alert" className="mx-auto max-w-xl p-8 text-center text-sm text-red-700">Không tải được nội dung Đại hội. Vui lòng thử lại hoặc liên hệ BTC.</main>;
 const personnel:(BchCandidate&{congressName:string})[]=(candidates.data||[]).map(item=>({...item,congressName:congress.name}));
 return <GuestCongressReader congress={congress} docs={(documents.data||[]) as DocRow[]} candidates={personnel}/>;
}
