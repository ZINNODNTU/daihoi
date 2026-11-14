import {notFound} from "next/navigation";
import {createAdminClient} from "@/lib/supabase/admin";
import {GuestCongressReader} from "@/components/guest-congress-reader";
import type {DocRow} from "@/lib/types";

export const dynamic="force-dynamic";

const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PUBLIC_CONGRESS="id,slug,name,kind,term,venue,starts_at,ends_at,status";
const PUBLIC_DOCUMENT="id,congress_id,file_name,mime_type,byte_size,drive_file_id,created_at,delegate_visible,display_order";

async function readPublicGuestCongress(slug:string){
 // One round trip for the congress, its published documents, and
 // an exact aggregate BCH count. Never cache status across requests.
 const started=performance.now();
 const result=await createAdminClient().from("congresses")
  .select(`${PUBLIC_CONGRESS},documents(${PUBLIC_DOCUMENT}),bch_candidates(count)`)
  .eq("slug",slug).eq("status","live")
  .eq("documents.delegate_visible",true)
  .order("display_order",{referencedTable:"documents"})
  .order("created_at",{referencedTable:"documents",ascending:false})
  .limit(500,{referencedTable:"documents"})
  .abortSignal(AbortSignal.timeout(9000))
  .maybeSingle();
 const dbDuration=performance.now()-started;
 if(dbDuration>2500)console.warn("[guest-page] slow Supabase read",{durationMs:Math.round(dbDuration)});
 return result;
}

export default async function GuestCongressPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 if(slug.length>120||!SLUG.test(slug))notFound();
 const {data:congress,error}=await readPublicGuestCongress(slug);
 if(error){
  console.error("[guest-page] Supabase read failed",{code:error.code||"unknown"});
  return <main role="alert" className="mx-auto max-w-xl p-8 text-center text-sm text-red-700">Không tải được thông tin Đại hội. Vui lòng thử lại sau.</main>;
 }
 if(!congress)notFound();

 const {documents,bch_candidates,...publicCongress}=congress;
 return <GuestCongressReader congress={publicCongress} docs={(documents||[]) as DocRow[]}
  candidateCount={bch_candidates?.[0]?.count||0} slug={slug}/>;
}
