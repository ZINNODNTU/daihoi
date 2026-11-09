"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {ArrowRight,CheckCircle2,Clock3,History,ScanLine} from "lucide-react";
import type {PortalHistory} from "@/lib/delegate-portal";
import {DelegateRefreshButton} from "@/components/delegate-refresh-button";

type Entry=PortalHistory&{congressName:string;congressId:string};
type Congress={id:string;name:string};
const methodLabel={qr:"QR phiên",manual:"BTC xác nhận thủ công",barcode:"Mã vạch / BTC"};
function date(value:string){
 return new Intl.DateTimeFormat("vi-VN",{
  timeZone:"Asia/Ho_Chi_Minh",day:"2-digit",month:"2-digit",year:"numeric",
  hour:"2-digit",minute:"2-digit",hour12:false
 }).format(new Date(value));
}
export function DelegateHistoryList({history,congresses,initialCongressId=""}:{
 history:Entry[];congresses:Congress[];initialCongressId?:string
}){
 const [congressId,setCongressId]=useState(initialCongressId);
 const [limit,setLimit]=useState(20);
 const visible=useMemo(()=>history.filter(item=>!congressId||item.congressId===congressId),
  [history,congressId]);
 return <section aria-label="Lịch sử điểm danh" className="overflow-hidden rounded-[17px] border border-[#d9e7e9] bg-white shadow-sm">
  <header className="border-b border-[#e8eff1] p-4 sm:p-6">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
     <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[#70949e]">LƯỢT THAM DỰ ĐÃ GHI NHẬN</p>
     <p className="mt-1 text-[26px] font-extrabold leading-tight tabular-nums text-[#1d5c68]" aria-live="polite">
      {visible.length} <span className="text-[13px] font-semibold text-[#728c9b]">phiên</span>
     </p>
    </div>
    <DelegateRefreshButton/>
   </div>
   {congresses.length>1&&<label className="mt-4 block">
    <span className="mb-1.5 block text-[12px] font-bold text-[#486b7e]">Lọc lịch sử theo Đại hội</span>
    <select className="field !min-h-12 !rounded-xl !text-[14px]" value={congressId}
     onChange={e=>{setCongressId(e.target.value);setLimit(20);}}>
     <option value="">Tất cả Đại hội</option>
     {congresses.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
   </label>}
  </header>
  {visible.length?<ol className="divide-y divide-[#ebf1f1]">
   {visible.slice(0,limit).map(record=><li key={record.id} className="flex min-w-0 items-start gap-3 px-4 py-4 sm:gap-4 sm:px-7 sm:py-5">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4f9] text-[#2184a6]">
     <CheckCircle2 size={21} strokeWidth={1.8}/>
    </span>
    <div className="min-w-0 flex-1">
     <p className="break-words text-[14px] font-bold leading-6 text-[#284b5e]">{record.sessionName}</p>
     <p className="mt-0.5 break-words text-[12px] leading-5 text-[#6f8796]">{record.congressName}</p>
     <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-[#5a8393]">
      <Clock3 size={15}/>{date(record.checkedInAt)}
     </p>
     <p className="mt-1 text-[11px] font-medium leading-5 text-[#829aa8]">Hình thức: {methodLabel[record.method]||"Đã xác nhận"}</p>
    </div>
    <span className="hidden shrink-0 rounded-full border border-[#ccecdc] bg-[#ecf9f2] px-2.5 py-1.5 text-[11px] font-bold text-[#207c71] sm:inline-flex">Đã ghi nhận</span>
   </li>)}
  </ol>:<div className="px-5 py-12 text-center">
   <History size={35} className="mx-auto text-[#91b1bc]" strokeWidth={1.5}/>
   <h2 className="mt-4 text-[15px] font-bold text-[#477082]">
    {history.length?"Chưa có lượt điểm danh ở Đại hội này":"Bạn chưa có lượt điểm danh"}
   </h2>
   <p className="mt-2 text-[12px] leading-6 text-[#8199a6]">Quét QR phiên tại hội trường để ghi nhận tham dự.</p>
   <Link href="/my-card/checkin" className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#007fae] px-5 text-[13px] font-bold text-white">
    <ScanLine size={17}/> Điểm danh ngay <ArrowRight size={15}/>
   </Link>
  </div>}
  {visible.length>limit&&<div className="border-t border-[#e6edf2] p-3 text-center">
   <button type="button" onClick={()=>setLimit(n=>n+20)}
    className="min-h-11 rounded-xl border border-[#c4dce8] px-5 text-xs font-bold text-[#176e96]">
    Xem thêm ({visible.length-limit} lượt)
   </button>
  </div>}
 </section>;
}
