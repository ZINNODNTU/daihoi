"use client";

import {useEffect,useState} from "react";
import {Activity,AlertTriangle,BarChart3,CloudOff,Layers3,RefreshCw} from "lucide-react";

type Level="critical"|"error"|"warning"|"info";
type Bucket={start:string;critical:number;error:number;warning:number;info:number;total:number};
type Payload={
 buckets:Bucket[];levels:Record<Level,number>;
 sources:{source:string;total:number}[];
 counted:number;sampled:number;truncated:boolean;refreshedAt:string
};
const COLOR:Record<Level,string>={
 critical:"#be123c",error:"#ef4444",warning:"#dba23b",info:"#3184bc"
};
const SOURCE_LABEL:Record<string,string>={
 auth:"Xác thực",attendance:"Điểm danh",documents:"Tài liệu",
 seating:"Sơ đồ ghế",frontend:"Giao diện",api:"Hệ thống API"
};
const formatter=new Intl.DateTimeFormat("vi-VN",{
 timeZone:"Asia/Ho_Chi_Minh",hour:"2-digit",minute:"2-digit",
 day:"2-digit",month:"2-digit"
});
const labelFor=(s:string,period:string)=>{
 const value=formatter.format(new Date(s));
 return period==="1h"||period==="24h"?value.slice(-5):value.slice(0,5);
};

export function SystemLogInsights({period,congressId,refreshKey,onSource}:{
 period:string;congressId:string;refreshKey:number;onSource:(value:string)=>void
}){
 const [payload,setPayload]=useState<Payload|null>(null);
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{
  let active=true;
  let inFlight=false;
  async function load(){
   if(inFlight)return;
   inFlight=true;
   try{
    const search=new URLSearchParams({period});
    if(congressId)search.set("congressId",congressId);
    const response=await fetch("/api/system-logs/analytics?"+search.toString(),{
     cache:"no-store",credentials:"same-origin"
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Không tải được phân tích sự kiện.");
    if(active){setPayload(data as Payload);setError("");}
   }catch(e){
    if(active)setError(e instanceof Error?e.message:"Phân tích chưa sẵn sàng.");
   }finally{
    inFlight=false;
    if(active)setBusy(false);
   }
  }
  queueMicrotask(()=>{if(active){setBusy(true);void load();}});
  const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void load();},30000);
  return()=>{active=false;window.clearInterval(timer);};
 },[period,congressId,refreshKey]);

 const total=payload?.sampled||0;
 const failures=(payload?.levels.critical||0)+(payload?.levels.error||0);
 const max=Math.max(1,...(payload?.buckets.map(item=>item.total)||[0]));
 return <section aria-label="Phân tích lưu lượng sự kiện" className="overflow-hidden rounded-[18px] border border-[#dce5ec] bg-white shadow-[0_8px_24px_rgba(12,43,68,.04)]">
  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6edf2] px-5 py-4 sm:px-6">
   <div>
    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.13em] text-[#59859e]"><Activity size={14}/> OBSERVABILITY · EVENT INTELLIGENCE</p>
    <h2 className="mt-1 text-[17px] font-extrabold text-[#163d57]">Xu hướng sự kiện &amp; sức khỏe hệ thống</h2>
   </div>
   <div className="flex items-center gap-2 text-[11px] font-medium text-[#648295]">
    <span className={"h-2 w-2 rounded-full "+(error?"bg-rose-500":busy?"animate-pulse bg-amber-400":"bg-emerald-500")}/>
    {error?"Không kết nối được":busy?"Đang đồng bộ":"Tự làm mới 30 giây"}
   </div>
  </header>
  {error&&<div role="alert" className="mx-5 mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">
   <CloudOff size={16}/> {error}
  </div>}
  <div className="grid gap-0 divide-y divide-[#edf2f5] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
   <div className="px-5 py-4 sm:px-6">
    <div className="flex items-center gap-2 text-[11px] text-[#6c8193]"><Layers3 size={15}/> Tổng sự kiện</div>
    <p className="mt-2 text-[26px] font-extrabold tabular-nums text-[#183d58]">{(payload?.counted??0).toLocaleString("vi-VN")}</p>
    <p className="mt-1 text-[10px] text-[#8b9eaa]">Trong khoảng thời gian đã chọn</p>
   </div>
   <div className="px-5 py-4 sm:px-6">
    <div className="flex items-center gap-2 text-[11px] text-[#6c8193]"><AlertTriangle size={15}/> Tỷ lệ lỗi</div>
    <p className="mt-2 text-[26px] font-extrabold tabular-nums text-[#bc3d49]">{total?((failures/total)*100).toFixed(1):"0.0"}%</p>
    <p className="mt-1 text-[10px] text-[#8b9eaa]">{failures.toLocaleString("vi-VN")} bản ghi Critical / Error {payload?.truncated?"· từ mẫu giới hạn":""}</p>
   </div>
   <div className="px-5 py-4 sm:px-6">
    <div className="flex items-center gap-2 text-[11px] text-[#6c8193]"><BarChart3 size={15}/> Nguồn sự kiện</div>
    <p className="mt-2 text-[26px] font-extrabold tabular-nums text-[#183d58]">{payload?.sources.length||0}</p>
    <p className="mt-1 text-[10px] text-[#8b9eaa]">Nhóm theo phân hệ nghiệp vụ</p>
   </div>
  </div>
  <div className="grid gap-0 border-t border-[#e6edf2] xl:grid-cols-[minmax(0,1fr)_265px]">
   <div className="min-w-0 px-4 py-5 sm:px-6">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
     <h3 className="text-[12px] font-extrabold text-[#36546b]">Mật độ sự kiện theo thời gian</h3>
     <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#71889a]">
      {(["critical","error","warning","info"] as const).map(level=><span key={level} className="inline-flex items-center gap-1">
       <span className="h-2 w-2 rounded-sm" style={{backgroundColor:COLOR[level]}}/>{level}
      </span>)}
     </div>
    </div>
    <div className="min-w-0 overflow-x-auto pb-2">
     <div className="flex h-[172px] min-w-[480px] items-end gap-1.5 border-b border-[#e4ecf1] pb-1">
      {payload?.buckets.map((bucket,i)=>{
       const height=Math.round(bucket.total/max*139);
       const counts:Level[]=["info","warning","error","critical"];
       return <div key={bucket.start} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={formatter.format(new Date(bucket.start))+" · "+bucket.total+" sự kiện"}>
        <div className="flex w-full max-w-[26px] flex-col-reverse overflow-hidden rounded-t-[3px] bg-[#f0f4f6]" style={{height:Math.max(2,height)}}>
         {counts.map(level=>bucket[level]>0&&<span key={level} style={{
          height:(bucket[level]/bucket.total*100)+"%",backgroundColor:COLOR[level],
          display:"block",flexShrink:0
         }}/>)}
        </div>
        {(i===0||i===payload.buckets.length-1||i%Math.max(1,Math.ceil(payload.buckets.length/6))===0)
         ?<span className="absolute top-full mt-1 whitespace-nowrap text-[9px] font-medium text-[#91a3b0]">
          {labelFor(bucket.start,period)}
         </span>:null}
       </div>;
      })||Array.from({length:12},(_,i)=><div key={i} className="h-8 flex-1 animate-pulse rounded bg-[#edf3f6]"/>)}
     </div>
     <p className="mt-5 text-center text-[10px] text-[#8a9dab]">
      {payload?.truncated?"Biểu đồ lấy tối đa 3.000 sự kiện mới nhất; thống kê tỷ lệ chỉ mang tính mẫu.":"Số liệu từ nhật ký kỹ thuật; thời gian hiển thị theo múi giờ Việt Nam."}
     </p>
    </div>
   </div>
   <div className="border-t border-[#e6edf2] px-5 py-5 xl:border-l xl:border-t-0">
    <h3 className="mb-3 text-[12px] font-extrabold text-[#36546b]">Nguồn phát sinh</h3>
    {!payload?.sources.length?<p className="text-[11px] leading-5 text-[#8499a7]">Chưa có sự kiện trong khoảng thời gian này.</p>:
     <div className="space-y-3">{payload.sources.slice(0,7).map(item=>
      <button key={item.source} type="button" onClick={()=>onSource(item.source)}
       className="block w-full rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1785aa] hover:bg-[#f4f8fb]"
       aria-label={"Lọc nhật ký theo nguồn "+item.source}>
       <span className="mb-1.5 flex justify-between gap-2 text-[11px] text-[#46677e]">
        <span className="font-semibold">{SOURCE_LABEL[item.source]||item.source}</span>
        <span className="tabular-nums">{item.total}</span>
       </span>
       <span className="block h-1.5 overflow-hidden rounded-full bg-[#eaf0f4]">
        <span className="block h-full rounded-full bg-[#3b94ab]" style={{width:Math.max(2,item.total/Math.max(1,total)*100)+"%"}}/>
       </span>
      </button>
     )}</div>}
    <p className="mt-4 flex items-start gap-1.5 text-[10px] leading-5 text-[#8297a6]">
     <RefreshCw size={12} className="mt-1 shrink-0"/> Chọn một nguồn để lọc sự kiện bên dưới.
    </p>
   </div>
  </div>
 </section>;
}
