import {notFound} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import {hasGuestCongressAccess} from "@/lib/guest-congress-access";
import {GuestAccessEntry} from "@/components/guest-access-entry";
import {GuestCongressReader} from "@/components/guest-congress-reader";
import {loadAvailableGuestCongresses} from "@/lib/guest-congress-list";
import type {DocRow} from "@/lib/types";
import type {BchCandidate} from "@/lib/bch-candidates";
export const dynamic="force-dynamic";
export default async function GuestCongressPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>120)notFound();
 const options=await loadAvailableGuestCongresses();
 const selected=options.find(option=>option.slug===slug);
 if(!selected)notFound();
 if(!(await hasGuestCongressAccess(selected.id)))
  return <GuestAccessEntry options={options} initialSlug={slug}/>;
 const db=createAdminClient();
 const [documents,candidates]=await Promise.all([
  db.from("documents")
   .select("id,congress_id,file_name,mime_type,byte_size,drive_file_id,created_at,delegate_visible,display_order")
   .eq("congress_id",selected.id).eq("delegate_visible",true)
   .order("display_order").order("created_at",{ascending:false}).limit(500),
  db.from("bch_candidates")
   .select("id,congress_id,full_name,birth_year,hometown,ethnicity,education_level,union_join_year,current_position,photo_path,display_order,created_at,updated_at")
   .eq("congress_id",selected.id).order("display_order").order("created_at").limit(500)
 ]);
 if(documents.error||candidates.error)
  return <main className="mx-auto max-w-xl p-8 text-center text-sm text-red-700">Không tải được dữ liệu Đại hội. Vui lòng thử lại hoặc liên hệ BTC.</main>;
 const personnel: (BchCandidate&{congressName:string})[]=(candidates.data||[]).map(item=>({...item,congressName:selected.name}));
 return <GuestCongressReader congress={selected} docs={(documents.data||[]) as DocRow[]} candidates={personnel}/>;
}
