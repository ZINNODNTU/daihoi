import {Users} from "lucide-react";
import {getMyDelegateData} from "@/lib/delegate-page";
import {createAdminClient} from "@/lib/supabase/admin";
import {DelegatePageHeading,DelegateUnavailable} from "@/components/delegate-page-elements";
import {DelegateBchCarousel} from "@/components/delegate-bch-carousel";
import type {BchCandidate} from "@/lib/bch-candidates";

export const dynamic="force-dynamic";
export default async function DelegateBchPage(){
 const {items,error}=await getMyDelegateData();
 const congressIds=[...new Set(items.map(item=>item.congressId))];
 let candidates:(BchCandidate&{congressName:string})[]=[];
 let loadError="";
 if(!error&&congressIds.length){
  const {data,error:queryError}=await createAdminClient().from("bch_candidates")
   .select("id,congress_id,full_name,birth_year,hometown,ethnicity,education_level,union_join_year,current_position,photo_path,display_order,created_at,updated_at")
   .in("congress_id",congressIds).order("display_order").order("created_at").limit(500);
  if(queryError)loadError="Chưa thể tải danh sách trích ngang nhân sự.";
  else{
   const names=new Map(items.map(item=>[item.congressId,item.congressName]));
   candidates=(data||[]).map(p=>({...p,congressName:names.get(p.congress_id)||"Đại hội"}));
  }
 }
 return <div className="mx-auto max-w-[1140px]">
  <DelegatePageHeading eyebrow="NHÂN SỰ / BAN CHẤP HÀNH"
   title="Nhân sự giới thiệu BCH"
   description="Bộ hồ sơ trích ngang theo dạng thẻ dọc. Vuốt ngang để xem lần lượt từng nhân sự được giới thiệu."
   icon={Users}/>
  {error||loadError?<DelegateUnavailable message={error||loadError}/>:
   !items.length?<DelegateUnavailable/>:
   candidates.length?<DelegateBchCarousel items={candidates}/>:
   <div className="rounded-2xl border border-[#dce8ee] bg-white px-6 py-14 text-center">
    <Users size={37} className="mx-auto text-[#a0b4c5]"/>
    <p className="mt-4 text-[15px] font-bold text-[#435c75]">Chưa có danh sách nhân sự BCH</p>
    <p className="mt-2 text-[12px] text-[#8fa2af]">Ban Tổ chức sẽ cập nhật khi có danh sách giới thiệu.</p>
   </div>}
 </div>;
}
