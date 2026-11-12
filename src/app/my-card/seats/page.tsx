import {Armchair} from "lucide-react";
import {redirect} from "next/navigation";
import {getPortalViewerAuth} from "@/lib/auth";
import {getSelectedCongressId} from "@/lib/active-congress";
import {hasPortalAbility} from "@/lib/rbac-server";
import {getMyDelegateData} from "@/lib/delegate-page";
import {loadMyHallMap} from "@/lib/delegate-seat-map";
import {DelegateSeatHall} from "@/components/delegate-seat-hall";
import {DelegatePageHeading,DelegateUnavailable} from "@/components/delegate-page-elements";
import {currentPortalPreview} from "@/lib/portal-preview-context";

export const dynamic="force-dynamic";
export default async function DelegateSeatsPage({searchParams}:{
 searchParams:Promise<{sessionId?:string}>
}){
 const {user}=await getPortalViewerAuth();
 if(!user)redirect("/login");
 let congressId:string|null=null;
 try{congressId=await getSelectedCongressId(user.id);}
 catch{return <DelegateUnavailable message="Không xác minh được quyền xem Đại hội. Hãy thử lại."/>;}
 if(!congressId)redirect("/my-card");
  if(!(await hasPortalAbility(user.id,congressId,"portal.seating")))
   return <DelegateUnavailable message="Tài khoản chưa được cấp quyền xem sơ đồ ghế."/>;
 const {items,error}=await getMyDelegateData();
 const selected=items.filter(item=>item.congressId===congressId);
 const {sessionId}=await searchParams;
 const choices=selected.flatMap(item=>item.sessions.map(s=>({
  id:s.id,name:s.name,congressName:item.congressName
 })));
 let map:Awaited<ReturnType<typeof loadMyHallMap>>=null;
 let mapError:string|null=null;
 if(!error&&selected.length&&choices.length){
  try{map=await loadMyHallMap(selected,sessionId||null);}
  catch{mapError="Sơ đồ phiên hiện chưa thể tải được. Hãy thử lại hoặc liên hệ Ban Tổ chức.";}
 }
 return <div className="mx-auto max-w-[1150px]">
  <DelegatePageHeading eyebrow="HỘI TRƯỜNG / SƠ ĐỒ CHỖ NGỒI"
   title="Vị trí của tôi"
   description="Sơ đồ chỉ hiển thị phiên của Đại hội đang chọn, với ghế của bạn được tô nổi bật."
   icon={Armchair}/>
  {error?<DelegateUnavailable message={error}/>:
   !selected.length?<DelegateUnavailable message="Bạn chưa có hồ sơ đại biểu tại Đại hội này."/>:
   !choices.length?<div className="rounded-2xl border border-[#deeaed] bg-white px-5 py-12 text-center text-xs text-[#75939f]">Đại hội này chưa có phiên điểm danh được công bố.</div>:
   mapError?<DelegateUnavailable message={mapError}/>:
   <DelegateSeatHall map={map} choices={choices}
     previewHref={currentPortalPreview()?"/dashboard/access/preview/"+user.id+
      "?congressId="+encodeURIComponent(congressId)+"&view=seating&sessionId=":undefined}/>}
 </div>;
}
