"use client";

import Image from "next/image";
import {Armchair,CheckCircle2,Clock3,IdCard,MapPin,UserRound,Users} from "lucide-react";
import {displayTime} from "@/lib/attendance-report";
import type {Checkin,Delegate} from "@/lib/types";
import type {SeatPlacement} from "@/lib/attendance-seating";

type Props={
 latest:Checkin|null;
 recent:Checkin[];
 delegates:ReadonlyMap<string,Delegate>;
 seats:Record<string,SeatPlacement>;
 now:number;
};
const modeLabel:Record<Checkin["method"],string>={
 qr:"QR",manual:"Thủ công",barcode:"Barcode"
};

export function RecentCheckinCard({latest,recent,delegates,seats,now}:Props){
 const person=latest?delegates.get(latest.delegate_id):null;
 const seat=person?seats[person.id]:null;
 const elapsed=latest?Math.max(0,now-Date.parse(latest.checked_in_at)):Number.POSITIVE_INFINITY;
 const justArrived=elapsed<=45000;
 return <section className="mb-6 overflow-hidden rounded-2xl border border-[#d9e7e8] bg-white shadow-[0_12px_36px_rgba(16,69,79,.055)]"
  aria-label="Thẻ đại biểu điểm danh gần nhất">
  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e7eeee] bg-[#f5faf8] px-4 py-3 sm:px-6">
   <h2 className="flex items-center gap-2 text-[13px] font-bold text-[#1e6359]">
    <span aria-hidden="true" className={"h-2.5 w-2.5 rounded-full "+(justArrived?"animate-pulse bg-[#0ca578]":"bg-[#7ab8a4]")}/>
    {justArrived?"Vừa điểm danh thành công":"Đại biểu điểm danh gần nhất"}
   </h2>
   <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#78948d]">
    <Clock3 size={14}/> Tự đồng bộ theo phiên Đại hội
   </span>
  </div>
  {latest&&person?<div className="grid gap-5 p-4 sm:grid-cols-[152px_1fr] sm:gap-6 sm:p-6">
   <div className="mx-auto w-full max-w-[152px] sm:mx-0">
    {person.photo_path?<Image
      key={person.id} unoptimized
      src={"/api/delegates/"+encodeURIComponent(person.id)+"/photo?w=160"}
      width={152} height={202} alt={"Ảnh đại biểu "+person.full_name}
      className="aspect-[3/4] w-full rounded-xl border border-[#dbe6e9] bg-white object-cover"
    />:<div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl border border-[#dce9eb] bg-[#eef5f7] text-[#91a8ad]">
      <UserRound size={58} aria-hidden="true"/>
    </div>}
   </div>
   <div className="flex min-w-0 flex-col justify-center">
    <div className="flex flex-wrap items-center gap-2">
     <span className="inline-flex items-center gap-1 rounded-full bg-[#def7eb] px-3 py-1 text-[11px] font-extrabold text-[#11724d]">
      <CheckCircle2 size={14}/> ĐÃ ĐIỂM DANH
     </span>
     <span className="text-[11px] font-semibold text-[#7793a0]">{modeLabel[latest.method]} · {displayTime(latest.checked_in_at)}</span>
    </div>
    <h3 className="mt-3 break-words text-[clamp(23px,3vw,34px)] font-extrabold leading-tight tracking-[-.04em] text-[#18394c]">
     {person.full_name}
    </h3>
    <p className="mt-2 inline-flex items-start gap-2 break-words text-[13px] leading-6 text-[#547184]">
     <Users size={17} className="mt-1 shrink-0 text-[#2281a7]"/>
     <span><strong className="text-[#284d65]">Đơn vị:</strong> {person.unit||"Chưa cập nhật"}</span>
    </p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
     <div className="min-w-0 rounded-xl border border-[#dbeaf1] bg-[#f2f9fd] px-3 py-3.5">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-[#6c94a9]">
       <Armchair size={14}/> Vị trí ghế
      </p>
      <p className="mt-1.5 break-words text-[19px] font-extrabold text-[#086d9b]">{seat?.code||"Chưa phân ghế"}</p>
      <p className="mt-1 text-xs text-[#617f91]">{seat?seat.layoutTitle+" · Hàng "+seat.rowLabel+" · Ghế "+seat.seatNumber:"BTC chưa xếp chỗ ngồi"}</p>
     </div>
     <div className="min-w-0 rounded-xl border border-[#e3eaf0] bg-[#f8fafb] px-3 py-3.5">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-[#8394a0]">
       <IdCard size={14}/> Hình thức tham dự
      </p>
      <p className="mt-1.5 break-words text-[19px] font-extrabold text-[#294f66]">{modeLabel[latest.method]}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-[#748a99]">
       <MapPin size={12}/>{person.delegate_type==="guest"?"Khách mời":person.delegate_type==="alternate"?"Đại biểu dự khuyết":"Đại biểu chính thức"}
      </p>
     </div>
    </div>
   </div>
  </div>:<div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
   <div className="rounded-full bg-[#edf6f5] p-4 text-[#7a9e9d]"><IdCard size={26}/></div>
   <p className="mt-2 text-[14px] font-bold text-[#436677]">Đang chờ đại biểu điểm danh</p>
   <p className="max-w-md text-xs leading-6 text-[#8196a3]">Khi có lượt quét QR hoặc điểm danh thủ công, ảnh và thông tin đại biểu sẽ xuất hiện tại đây.</p>
  </div>}
  {recent.length>1&&<div className="border-t border-[#e8eff1] px-4 py-3 sm:px-6">
   <p className="mb-2 text-[10px] font-bold uppercase tracking-[.11em] text-[#7c939e]">Các lượt điểm danh gần đây</p>
   <div className="grid gap-2 sm:grid-cols-3">
    {recent.slice(1,4).map(c=>{
     const d=delegates.get(c.delegate_id);
     const placement=d?seats[d.id]:null;
     return <div key={c.id} className="flex min-w-0 items-center gap-2 rounded-lg bg-[#f7fafb] px-2 py-2">
      {d?.photo_path?<Image unoptimized src={"/api/delegates/"+d.id+"/photo?w=96"}
       width={32} height={42} alt="" className="h-[42px] w-8 shrink-0 rounded-md object-cover"/>:
       <span className="flex h-[42px] w-8 shrink-0 items-center justify-center rounded-md bg-[#e6eff2] text-[#88a3af]"><UserRound size={18}/></span>}
      <div className="min-w-0"><p className="truncate text-[11px] font-bold text-[#254e64]">{d?.full_name||"Đại biểu"}</p>
       <p className="mt-0.5 truncate text-[10px] text-[#7b94a3]">{placement?.code||"Chưa phân ghế"} · {modeLabel[c.method]}</p>
      </div>
     </div>;
    })}
   </div>
  </div>}
 </section>;
}
