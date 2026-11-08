import {Armchair} from "lucide-react";
import {getMyDelegateData} from "@/lib/delegate-page";
import {loadMyHallMap} from "@/lib/delegate-seat-map";
import {DelegateSeatHall} from "@/components/delegate-seat-hall";
import {DelegatePageHeading,DelegateUnavailable} from "@/components/delegate-page-elements";

export const dynamic="force-dynamic";
export default async function DelegateSeatsPage({searchParams}:{
 searchParams:Promise<{sessionId?:string}>
}){
 const {items,error}=await getMyDelegateData();
 const {sessionId}=await searchParams;
 const choices=items.flatMap(item=>item.sessions.map(s=>({
  id:s.id,name:s.name,congressName:item.congressName
 })));
 let map:Awaited<ReturnType<typeof loadMyHallMap>>=null;
 let mapError:string|null=null;
 if(!error&&items.length&&choices.length){
  try{map=await loadMyHallMap(items,sessionId||null);}
  catch{mapError="Sơ đồ của phiên hiện chưa thể tải được. Hãy thử lại hoặc liên hệ Ban Tổ chức.";}
 }
 return <div className="mx-auto max-w-[1150px]">
  <DelegatePageHeading eyebrow="HỘI TRƯỜNG / SƠ ĐỒ CHỖ NGỒI"
   title="Vị trí của tôi"
   description="Toàn cảnh hội trường theo từng phiên, với ghế của bạn được tô nổi bật để tìm nhanh."
   icon={Armchair}/>
  {error?<DelegateUnavailable message={error}/>:
   !items.length?<DelegateUnavailable/>:
   !choices.length?<div className="rounded-2xl border border-[#deeaed] bg-white px-5 py-12 text-center text-xs text-[#75939f]">Chưa có phiên điểm danh được công bố.</div>:
   mapError?<DelegateUnavailable message={mapError}/>:
   <DelegateSeatHall map={map} choices={choices}/>}
 </div>;
}
