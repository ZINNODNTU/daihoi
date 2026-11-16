import {Award,Users} from "lucide-react";
import {redirect} from "next/navigation";
import {getPortalViewerAuth} from "@/lib/auth";
import {getPortalCongressContext} from "@/lib/active-congress";
import {hasPortalAbility} from "@/lib/rbac-server";
import {readPublishedNewBch} from "@/lib/bch-new-committee";
import {DelegatePageHeading,DelegateUnavailable} from "@/components/delegate-page-elements";
import {DelegateBchCarousel} from "@/components/delegate-bch-carousel";

export const dynamic="force-dynamic";

/** Both official delegates and guest-account holders use the same role-gated
 * congress portal. The published snapshot never contains private vote totals. */
export default async function DelegateNewCommitteePage(){
 const {user}=await getPortalViewerAuth();
 if(!user)redirect("/login");
 let context:Awaited<ReturnType<typeof getPortalCongressContext>>;
 try{context=await getPortalCongressContext(user.id);}
 catch{return <DelegateUnavailable message="Không xác minh được quyền xem BCH khóa mới. Vui lòng thử lại."/>;}
 const congressId=context.activeCongressId;
 if(!congressId)redirect("/my-card");
 const congress=context.options.find(item=>item.id===congressId);
 if(!congress)return <DelegateUnavailable message="Không có quyền xem BCH khóa mới tại Đại hội này."/>;
 if(!(await hasPortalAbility(user.id,congressId,"portal.bch")))
  return <DelegateUnavailable message="Tài khoản chưa được cấp quyền xem nhân sự BCH."/>;
 if(congress.kind!=="doan")
  return <DelegateUnavailable message="Danh sách BCH khóa mới hiện áp dụng cho Đại hội Đoàn."/>;
 let committee:Awaited<ReturnType<typeof readPublishedNewBch>>;
 try{committee=await readPublishedNewBch(congressId);}
 catch{return <DelegateUnavailable message="Không tải được BCH khóa mới. Ban Tổ chức vui lòng kiểm tra dữ liệu đã công bố."/>;}
 return <div className="mx-auto max-w-[1140px]">
  <DelegatePageHeading eyebrow="ĐẠI HỘI ĐOÀN / KẾT QUẢ ĐÃ CÔNG BỐ"
   title="Ban Chấp hành khóa mới"
   description={"Danh sách ủy viên BCH khóa mới do Ban Tổ chức công bố tại "+congress.name+"."}
   icon={Award}/>
  {committee?<div className="space-y-4">
    <section className="rounded-xl border border-[#cfe5da] bg-[#f1faf5] px-4 py-3.5 text-[13px] font-semibold text-[#276b51]">
     <p className="flex items-center gap-2"><Award size={18}/> BCH khóa mới gồm đúng {committee.memberCount} ủy viên đã công bố.</p>
    </section>
    <DelegateBchCarousel
     items={committee.members.map(item=>({...item,congressName:congress.name,congressKind:congress.kind}))}
     initialCongressId={congressId} variant="new"/>
   </div>:
   <div className="rounded-2xl border border-[#dce8ee] bg-white px-6 py-14 text-center">
    <Users size={38} className="mx-auto text-[#9ab3c1]"/>
    <h2 className="mt-4 text-[16px] font-extrabold text-[#395971]">Chưa công bố BCH khóa mới</h2>
    <p className="mt-2 text-[12px] leading-6 text-[#8498a6]">Danh sách sẽ hiển thị sau khi Ban Tổ chức hoàn tất ra mắt và công bố chính thức.</p>
   </div>}
 </div>;
}
