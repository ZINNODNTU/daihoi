import {notFound} from "next/navigation";
import {getAuth,hasCongressAbility} from "@/lib/auth";

import {BchCandidatesClient} from "@/components/bch-candidates-client";
import type {BchCandidate} from "@/lib/bch-candidates";

export const dynamic="force-dynamic";
const BASE_FIELDS="id,congress_id,full_name,birth_year,hometown,ethnicity,education_level,union_join_year,current_position,photo_path,display_order,created_at,updated_at";
const BALLOT_FIELDS=",votes_received,total_ballots";

export default async function BchCandidatesPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {supabase,user}=await getAuth();
 if(!user)notFound();
 // Staff must have a verified, enabled BTC account (or be platform super admin).
 if(!(await hasCongressAbility(supabase,user.id,id,"bch.read")))notFound();
 const canManage=await hasCongressAbility(supabase,user.id,id,"bch.write");
 const [people,delegates,congress]=await Promise.all([
  supabase.from("bch_candidates").select(BASE_FIELDS+(canManage?BALLOT_FIELDS:""))
   .eq("congress_id",id).order("display_order").order("created_at").limit(500),
  supabase.from("delegates").select("id,full_name,position,code,photo_path")
   .eq("congress_id",id).eq("is_active",true).order("full_name").limit(500),
  supabase.from("congresses").select("name,slug,kind,bch_total_ballots").eq("id",id).maybeSingle()
 ]);
 // Only 42703 means v47 columns are missing. Do not hide RLS/network errors.
 const fallback=people.error?.code==="42703"&&canManage?
  await supabase.from("bch_candidates").select(BASE_FIELDS)
   .eq("congress_id",id).order("display_order").order("created_at").limit(500):null;
 const ballotReady=canManage&&!people.error;
 const records=people.error?(fallback?.data||[]):(people.data||[]);
 const initialError=people.error&&(!fallback||fallback.error)?
  "Không tải được danh sách nhân sự BCH ("+(people.error.code||"unknown")+"). Kiểm tra kết nối và phân quyền Supabase.":"";
 return <BchCandidatesClient congressId={id} congressName={congress.data?.name||"Đại hội"}
  congressCode={congress.data?.slug||id} congressKind={congress.data?.kind||"unknown"}
  ballotReady={ballotReady} canManage={canManage}
  totalBallots={congress.data?.bch_total_ballots??null}
  initialCandidates={records as BchCandidate[]} initialError={initialError}
  delegates={(delegates.data||[]) as {id:string;full_name:string;position:string;code:string;photo_path:string|null}[]}
 />;
}
