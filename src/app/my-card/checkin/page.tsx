import {Camera,Clock3,CheckCircle2} from "lucide-react";
import {getWindowStatus,getWindowLabel} from "@/lib/attendance-window";
import {getMyDelegateData} from "@/lib/delegate-page";
import {DelegateCheckinScanner} from "@/components/delegate-checkin-scanner";
import {DelegatePageHeading,DelegateUnavailable} from "@/components/delegate-page-elements";

export const dynamic="force-dynamic";
export default async function DelegateCheckinPage(){
 const {items,error}=await getMyDelegateData();
 const sessions=items.flatMap(d=>d.sessions.map(s=>({...s,congressName:d.congressName})));
 const current=sessions.filter(s=>getWindowStatus(s)==="open");
 return <div className="mx-auto max-w-[760px]">
  <DelegatePageHeading eyebrow="THAM DỰ / ĐIỂM DANH"
   title="Điểm danh Đại hội"
   description="Quét mã QR của phiên do Ban Tổ chức cung cấp. Không cần mã QR trên thẻ đại biểu."
   icon={Camera}/>
  {error?<DelegateUnavailable message={error}/>:
   !items.length?<DelegateUnavailable/>:
   <div className="space-y-5">
    {current.length>0?<div className="rounded-[15px] border border-[#c6e7d8] bg-[#edfaf3] px-4 py-4 sm:px-5">
     <p className="flex items-center gap-2 text-xs font-extrabold text-[#217d9f]"><CheckCircle2 size={17}/> Đang mở điểm danh</p>
     {current.slice(0,3).map(s=><p key={s.id} className="mt-2 text-[12px] leading-5 text-[#4d806d]">{s.name} · {s.congressName}</p>)}
    </div>:
    <div className="flex items-start gap-3 rounded-[15px] border border-[#d9e8ed] bg-white px-4 py-4 text-[#648293] sm:px-5">
     <Clock3 size={18} className="mt-0.5 shrink-0 text-[#6a91a1]"/>
     <p className="text-xs leading-6">{sessions.length?
      "Chưa có phiên đang trong thời gian điểm danh. Khi BTC mở phiên, bạn quét mã QR tại hội trường.":
      "Ban Tổ chức chưa công bố phiên điểm danh."}
      {sessions.length>0&&<span className="mt-1 block font-semibold">{getWindowLabel(getWindowStatus(sessions[0]))}</span>}
     </p>
    </div>}
    <DelegateCheckinScanner/>
   </div>}
 </div>;
}