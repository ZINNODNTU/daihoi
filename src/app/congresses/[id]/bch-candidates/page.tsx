import {notFound} from "next/navigation";
import {getAuth,hasRole} from "@/lib/auth";
import {BchCandidatesClient} from "@/components/bch-candidates-client";
import type {BchCandidate} from "@/lib/bch-candidates";

export const dynamic="force-dynamic";

export default async function BchCandidatesPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {supabase,user}=await getAuth();
 if(!user)notFound();
 const canManage=await hasRole(supabase,user.id,id,"admin");
 const {data:membership}=canManage?{data:{role:"admin"}}:await supabase.from("congress_members")
  .select("role").eq("congress_id",id).eq("user_id",user.id).maybeSingle();
 if(!canManage&&membership?.role!=="secretary")notFound();

 const [people,delegates,congress]=await Promise.all([
  supabase.from("bch_candidates").select(
   "id,congress_id,full_name,birth_year,hometown,ethnicity,education_level,union_join_year,current_position,photo_path,display_order,votes_received,total_ballots,created_at,updated_at"
  ).eq("congress_id",id).order("display_order").order("created_at").limit(500),
  supabase.from("delegates").select("id,full_name,position,code,photo_path").eq("congress_id",id)
   .eq("is_active",true).order("full_name").limit(500),
  supabase.from("congresses").select("name,slug,kind").eq("id",id).maybeSingle()
 ]);
 // V47 is additive; keep the existing BCH directory usable before migration.
  const fallback=people.error?await supabase.from("bch_candidates").select(
   "id,congress_id,full_name,birth_year,hometown,ethnicity,education_level,union_join_year,current_position,photo_path,display_order,created_at,updated_at"
  ).eq("congress_id",id).order("display_order").order("created_at").limit(500):null;
  const ballotReady=!people.error;
  return <BchCandidatesClient congressId={id} congressName={congress.data?.name||"Đại hội"}
  congressCode={congress.data?.slug||id} congressKind={congress.data?.kind||"unknown"} ballotReady={ballotReady} canManage={canManage}
  initialCandidates={((ballotReady?people.data:fallback?.data)||[]) as BchCandidate[]}
  initialError={people.error&&fallback?.error?"Không tải được danh sách nhân sự. Kiểm tra Supabase BCH v8.":""}
  delegates={(delegates.data||[]) as {id:string;full_name:string;position:string;code:string;photo_path:string|null}[]}
 />;
}
