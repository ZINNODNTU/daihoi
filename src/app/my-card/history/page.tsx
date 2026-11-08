import Link from "next/link";
import {ArrowRight,CheckCircle2,Clock3,History,ScanLine} from "lucide-react";
import {getMyDelegateData} from "@/lib/delegate-page";
import {DelegatePageHeading,DelegateUnavailable} from "@/components/delegate-page-elements";
import {DelegateRefreshButton} from "@/components/delegate-refresh-button";

export const dynamic="force-dynamic";
function date(value:string){
 return new Intl.DateTimeFormat("vi-VN",{
  timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",year:"numeric",
  hour:"2-digit",minute:"2-digit",hour12:false
 }).format(new Date(value));
}
const methodLabel={qr:"QR phiên",manual:"BTC xác nhận thủ công",barcode:"Mã vạch / BTC"};
export default async function DelegateHistoryPage(){
 const {items,error}=await getMyDelegateData();
 const history=items.flatMap(item=>item.history.map(record=>({
  ...record,congressName:item.congressName
 }))).sort((a,b)=>Date.parse(b.checkedInAt)-Date.parse(a.checkedInAt));
 return <div className="mx-auto max-w-[850px]">
  <DelegatePageHeading eyebrow="HỒ SƠ / LỊCH SỬ"
   title="Lịch sử điểm danh"
   description="Mọi lượt điểm danh đã được lưu theo phiên Đại hội, kèm thời gian và phương thức xác nhận."
   icon={History}/>
  {error?<DelegateUnavailable message={error}/>:
   !items.length?<DelegateUnavailable/>:
   <section className="overflow-hidden rounded-[17px] border border-[#d9e7e9] bg-white shadow-[0_8px_24px_rgba(15,58,76,.04)]">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8eff1] px-5 py-4 sm:px-7">
     <div>
      <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#70949e]">LƯỢT THAM DỰ ĐÃ GHI NHẬN</p>
      <p className="mt-2 text-[22px] font-extrabold leading-none tabular-nums text-[#1d5c68]">{history.length}<span className="ml-2 text-[11px] font-semibold text-[#8aa1aa]">phiên</span></p>
     </div>
     <DelegateRefreshButton/>
    </header>
    {history.length?<ol className="divide-y divide-[#ebf1f1]">
     {history.map(record=><li key={record.id} className="flex items-start gap-3 px-5 py-5 sm:gap-4 sm:px-7">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4f9] text-[#2184a6]">
       <CheckCircle2 size={21} strokeWidth={1.8}/>
      </span>
      <div className="min-w-0 flex-1">
       <p className="text-[14px] font-extrabold leading-6 text-[#284b5e]">{record.sessionName}</p>
       <p className="mt-0.5 text-[11px] leading-5 text-[#86a0ab]">{record.congressName}</p>
       <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#5a8393]">
        <Clock3 size={13}/>{date(record.checkedInAt)}
       </p>
       <p className="mt-1 text-[10px] font-medium text-[#8ba0aa]">Hình thức: {methodLabel[record.method]}</p>
      </div>
      <span className="shrink-0 rounded-full border border-[#ccecdc] bg-[#ecf9f2] px-2.5 py-1.5 text-[10px] font-extrabold text-[#207c9e]">Đã ghi nhận</span>
     </li>)}
    </ol>:
    <div className="px-6 py-14 text-center">
     <History size={35} className="mx-auto text-[#91b1bc]" strokeWidth={1.5}/>
     <h2 className="mt-4 text-sm font-bold text-[#477082]">Bạn chưa có lượt điểm danh</h2>
     <p className="mt-2 text-[12px] leading-6 text-[#91a6b0]">Quét QR phiên tại hội trường để ghi nhận tham dự.</p>
     <Link href="/my-card/checkin" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#007fae] px-5 text-xs font-bold text-white">
      <ScanLine size={17}/> Điểm danh ngay <ArrowRight size={15}/>
     </Link>
    </div>}
   </section>}
 </div>;
}