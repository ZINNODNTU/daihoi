import {notFound} from "next/navigation";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {BchCandidatesClient} from "@/components/bch-candidates-client";
import type {BchCandidate} from "@/lib/bch-candidates";

export const dynamic="force-dynamic";
const BASE_FIELDS="id,congress_id,full_name,birth_year,hometown,ethnicity,education_level,union_join_year,current_position,photo_path,display_order,created_at,updated_at";

export default async function BchCandidatesPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {supabase,user}=await getAuth();
 if(!user||!(await hasCongressAbility(supabase,user.id,id,"bch.read")))notFound();
 const [canManage,canViewBallots]=await Promise.all([
  hasCongressAbility(supabase,user.id,id,"bch.write"),
  hasCongressAbility(supabase,user.id,id,"ballots.read")
 ]);
 const [people,delegates,congress]=await Promise.all([
  supabase.from("bch_candidates").select(BASE_FIELDS)
   .eq("congress_id",id).order("display_order").order("created_at").limit(500),
  supabase.from("delegates").select("id,full_name,position,code,photo_path")
   .eq("congress_id",id).eq("is_active",true).order("full_name").limit(500),
  supabase.from("congresses").select("name,slug,kind").eq("id",id).maybeSingle()
 ]);
 if(people.error)console.error("BCH personnel read",people.error.code);
 return <BchCandidatesClient congressId={id} congressName={congress.data?.name||"Đại hội"}
   congressCode={congress.data?.slug||id} congressKind={congress.data?.kind||"unknown"}
   canManage={canManage} canViewBallots={canViewBallots}
   initialCandidates={(people.data||[]) as BchCandidate[]}
   initialError={people.error?"Không tải được danh sách nhân sự BCH ("+(people.error.code||"unknown")+").":""}
   delegates={(delegates.data||[]) as {id:string;full_name:string;position:string;code:string;photo_path:string|null}[]}
 />;
}
