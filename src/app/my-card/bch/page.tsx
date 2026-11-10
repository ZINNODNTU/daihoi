import {Users} from "lucide-react";
import {redirect} from "next/navigation";
import {getPortalViewerAuth} from "@/lib/auth";
import {getPortalCongressContext} from "@/lib/active-congress";
import {createAdminClient} from "@/lib/supabase/admin";
import {DelegatePageHeading,DelegateUnavailable} from "@/components/delegate-page-elements";
import {DelegateBchCarousel} from "@/components/delegate-bch-carousel";
import type {BchCandidate} from "@/lib/bch-candidates";

export const dynamic="force-dynamic";
export default async function DelegateBchPage(){
 const {user}=await getPortalViewerAuth();
 if(!user)redirect("/login");
 let context:Awaited<ReturnType<typeof getPortalCongressContext>>;
 try{context=await getPortalCongressContext(user.id);}
 catch{return <DelegateUnavailable message="Không xác minh được quyền xem nhân sự BCH. Vui lòng thử lại."/>;}
 const congressId=context.activeCongressId;
 if(!congressId)redirect("/my-card");
 const congress=context.options.find(item=>item.id===congressId);
 if(!congress)return <DelegateUnavailable message="Không có quyền xem nhân sự BCH tại Đại hội này."/>;
 const db=createAdminClient();
 const {data,error}=await db.from("bch_candidates").select(
  "id,congress_id,full_name,birth_year,hometown,ethnicity,education_level,union_join_year,current_position,photo_path,display_order,created_at,updated_at"
 ).eq("congress_id",congressId).order("display_order").order("created_at").limit(500);
 const candidates:(BchCandidate&{congressName:string})[]=(data||[]).map(item=>({
  ...item,congressName:congress.name
 }));
 return <div className="mx-auto max-w-[1140px]">
  <DelegatePageHeading eyebrow="NHÂN SỰ / BAN CHẤP HÀNH"
   title="Nhân sự giới thiệu BCH"
   description={"Danh sách ứng viên BCH của "+congress.name+". Vuốt ngang để xem từng hồ sơ."}
   icon={Users}/>
  {error?<DelegateUnavailable message="Chưa thể tải danh sách ứng viên BCH."/>:
   candidates.length?<DelegateBchCarousel items={candidates} initialCongressId={congressId}/>:
   <div className="rounded-2xl border border-[#dce8ee] bg-white px-6 py-14 text-center">
    <Users size={37} className="mx-auto text-[#a0b4c5]"/>
    <p className="mt-4 text-[15px] font-bold text-[#435c75]">Chưa có danh sách nhân sự BCH</p>
    <p className="mt-2 text-[12px] text-[#8fa2af]">Ban Tổ chức sẽ cập nhật khi có danh sách giới thiệu.</p>
   </div>}
 </div>;
}
