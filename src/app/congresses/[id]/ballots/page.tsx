import {notFound} from "next/navigation";
import {getAuth,hasCongressAbility} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {BchBallotsClient} from "@/components/bch-ballots-client";
import type {BchBallotCandidate} from "@/lib/bch-candidates";

export const dynamic="force-dynamic";
export default async function BchBallotsPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const {supabase,user}=await getAuth();
 if(!user||!(await hasCongressAbility(supabase,user.id,id,"ballots.read")))notFound();
 const [canWrite,canViewBch]=await Promise.all([
  hasCongressAbility(supabase,user.id,id,"ballots.write"),
  hasCongressAbility(supabase,user.id,id,"bch.read")
 ]);
 const [congress,candidates,publication]=await Promise.all([
  supabase.from("congresses").select("name,kind,slug,bch_total_ballots").eq("id",id).maybeSingle(),
  createAdminClient().from("bch_candidates")
   .select("id,full_name,display_order,created_at,updated_at,votes_received,total_ballots"+
    (canViewBch?",photo_path,current_position":""))
   .eq("congress_id",id).order("display_order").order("created_at").limit(500),
   createAdminClient().from("bch_new_committee_publications")
    .select("member_count,published_at").eq("congress_id",id).maybeSingle()
 ]);
 if(congress.error||!congress.data||congress.data.kind!=="doan")notFound();
 return <BchBallotsClient congressId={id} congressName={congress.data.name}
  congressCode={congress.data.slug||id} canWrite={canWrite} canViewBch={canViewBch}
  totalBallots={congress.data.bch_total_ballots??null}
   initialPublication={publication.data?{memberCount:publication.data.member_count,
    publishedAt:publication.data.published_at}:null}
   publicationError={publication.error?"Cần triển khai migration BCH khóa mới V83 trên Supabase.":""}
  initialCandidates={(candidates.data||[]) as unknown as BchBallotCandidate[]}
  initialError={candidates.error?"Không tải được sổ kiểm phiếu ("+(candidates.error.code||"unknown")+").":""}/>;
}
