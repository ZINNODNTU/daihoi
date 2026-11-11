"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {AlertTriangle,Activity,ChevronDown,ChevronLeft,ChevronRight,ClipboardCopy,RefreshCcw,ShieldAlert} from "lucide-react";

type Resolution="open"|"investigating"|"resolved";
type Level="critical"|"error"|"warning";
type Incident={
 id:string;fingerprint:string;congress_id:string|null;
 source:string;event:string;title:string;level:Level;
 first_seen_at:string;last_seen_at:string;
 occurrence_count:number;window_started_at:string;window_count:number;
 latest_request_id:string|null;first_release:string|null;latest_release:string|null;
 resolution:Resolution;reopened_count:number;handled_at:string|null;
};
type IncidentResponse={
 incidents:Incident[];total:number;page:number;pageSize:number;
 metrics:{unresolved:number;spikes:number};refreshedAt:string;
};
type IncidentEvent={
 id:string;occurred_at:string;level:string;event:string;request_id:string|null;
 status_code:number|null;duration_ms:number|null;
 context:Record<string,unknown>;release:string|null;environment:string|null;
};
const DATE=new Intl.DateTimeFormat("vi-VN",{
 timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit",
 hour:"2-digit",minute:"2-digit",second:"2-digit"
});
const formatTime=(value:string)=>DATE.format(new Date(value));
const STATUS:Record<Resolution,string>={
 open:"Chưa xử lý",investigating:"Đang xử lý",resolved:"Đã khắc phục"
};
const severity:Record<Level,string>={
 critical:"border-rose-300 bg-rose-100 text-rose-800",
 error:"border-red-200 bg-red-50 text-red-700",
 warning:"border-amber-200 bg-amber-50 text-amber-800"
};
const text:Record<Level,string>={critical:"Critical",error:"Error",warning:"Warning"};

export function SystemIncidentsPanel({congressId,period}:{congressId:string;period:string}){
 const [payload,setPayload]=useState<IncidentResponse|null>(null);
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(true);
 const [refreshing,setRefreshing]=useState(false);
 const [status,setStatus]=useState<Resolution|"">("open");
 const [page,setPage]=useState(0);
 const [expanded,setExpanded]=useState("");
 const [events,setEvents]=useState<IncidentEvent[]>([]);
 const eventsRequest=useRef(0);
 const [eventsLoading,setEventsLoading]=useState(false);
 const [updating,setUpdating]=useState("");
 const [refreshTick,setRefreshTick]=useState(0);
 const params=useMemo(()=>{
  const q=new URLSearchParams({period,page:String(page)});
  if(congressId)q.set("congressId",congressId);
  if(status)q.set("resolution",status);
  return q.toString();
 },[congressId,period,page,status]);

 useEffect(()=>{
  let active=true, busy=false;
  const load=async()=>{
   if(busy)return;
   busy=true;setRefreshing(true);
   try{
    const response=await fetch("/api/system-incidents?"+params,{
     credentials:"same-origin",cache:"no-store"
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||"Không tải được nhóm sự cố.");
    if(active){setPayload(data as IncidentResponse);setError("");}
   }catch(e){if(active)setError(e instanceof Error?e.message:"Không thể tải nhóm sự cố.");}
   finally{busy=false;if(active){setLoading(false);setRefreshing(false);}}
  };
  void load();
  const timer=setInterval(()=>{if(document.visibilityState==="visible")void load();},15000);
  return()=>{active=false;clearInterval(timer);};
 },[params,refreshTick]);

 // Reset context before loading a new incident. Never display another
 // incident's events while a slow fetch is in flight.
 const toggle=useCallback(async(item:Incident)=>{
  const requestId=++eventsRequest.current;
  if(expanded===item.id){setExpanded("");setEvents([]);return;}
  setExpanded(item.id);setEvents([]);setEventsLoading(true);
  try{
   const response=await fetch("/api/system-incidents?fingerprint="+item.fingerprint,{
    credentials:"same-origin",cache:"no-store"
   });
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Không đọc được lịch sử lỗi.");
   if(requestId===eventsRequest.current)setEvents(data.events||[]);
  }catch(e){if(requestId===eventsRequest.current)setError(e instanceof Error?e.message:"Không thể đọc lịch sử lỗi.");}
  finally{if(requestId===eventsRequest.current)setEventsLoading(false);}
 },[expanded]);

 const change=useCallback(async(item:Incident,resolution:Resolution)=>{
  if(updating)return;
  setUpdating(item.id);
  try{
   const response=await fetch("/api/system-incidents",{
    method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({id:item.id,resolution})
   });
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"Không cập nhật được trạng thái.");
   setPayload(prev=>prev?{
    ...prev,incidents:prev.incidents.map(x=>x.id===item.id?{...x,...data.incident}:x)
   }:prev);
   setError("");setRefreshTick(v=>v+1);
  }catch(e){setError(e instanceof Error?e.message:"Không thể cập nhật sự cố.");}
  finally{setUpdating("");}
 },[updating]);

 const pages=payload?Math.ceil(payload.total/payload.pageSize):0;
 return <section aria-label="Sự cố được gom nhóm" className="overflow-hidden rounded-2xl border border-[#dce5ed] bg-white">
  <header className="border-b border-[#e8eef2] bg-[#f8fafc] px-4 py-5 sm:px-6">
   <div className="flex flex-wrap items-center justify-between gap-4">
    <div>
     <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.11em] text-[#7a8da2]">
      <Activity size={15}/> Incident management
     </div>
     <h2 className="mt-2 text-[19px] font-extrabold text-[#1b3950]">Nhóm sự cố cần theo dõi</h2>
     <p className="mt-1.5 max-w-2xl text-[12px] leading-6 text-[#657b8e]">
      Một nhóm tương ứng một loại lỗi và ngữ cảnh kỹ thuật. Lượt tái phát được đếm tự động; lỗi xuất hiện lại sau khi khắc phục sẽ được mở lại.
     </p>
    </div>
    <button type="button" disabled={refreshing} onClick={()=>setRefreshTick(v=>v+1)}
     className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#d5e0e9] bg-white px-3 text-[11px] font-bold text-[#4b6980] hover:bg-[#eff5f8] disabled:opacity-50">
     <RefreshCcw size={14} className={refreshing?"animate-spin":""}/> Cập nhật
    </button>
   </div>
   <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
    <div className="rounded-xl border border-[#e0e8ee] bg-white px-4 py-3">
     <p className="text-[11px] text-[#7c8c9b]">Chưa khắc phục</p>
     <p className="mt-1.5 text-[25px] font-extrabold tabular-nums text-[#263d55]">{payload?.metrics.unresolved??"—"}</p>
    </div>
    <div className="rounded-xl border border-[#f1d9ad] bg-[#fff9ed] px-4 py-3">
     <p className="flex items-center gap-1.5 text-[11px] text-[#8c6736]"><AlertTriangle size={13}/> Lỗi tăng đột biến</p>
     <p className="mt-1.5 text-[25px] font-extrabold tabular-nums text-[#8c5623]">{payload?.metrics.spikes??"—"}</p>
    </div>
    <div className="col-span-2 rounded-xl border border-[#e0e8ee] bg-white px-4 py-3 sm:col-span-1">
     <p className="text-[11px] text-[#7c8c9b]">Nhóm lỗi theo bộ lọc</p>
     <p className="mt-1.5 text-[25px] font-extrabold tabular-nums text-[#263d55]">{payload?.total??"—"}</p>
    </div>
   </div>
   <div className="mt-4 flex flex-wrap items-center gap-3">
    <label className="flex items-center gap-2 text-[12px] font-semibold text-[#617489]">
     Trạng thái
     <select value={status} onChange={e=>{setStatus(e.target.value as Resolution|"");setPage(0);setExpanded("");}}
      className="field max-w-[190px]">
      <option value="open">Chưa xử lý</option>
      <option value="investigating">Đang xử lý</option>
      <option value="resolved">Đã khắc phục</option>
      <option value="">Tất cả</option>
     </select>
    </label>
    <p className="text-[11px] leading-5 text-[#8593a0]">
     Theo bộ lọc thời gian và Đại hội phía dưới · Giờ Việt Nam
    </p>
   </div>
  </header>

  {error&&<div role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] leading-6 text-red-800">
   {error} {error.includes("V37")?"Hãy chạy migration V36 rồi V37 đúng project Supabase trước khi phát hành.":""}
  </div>}
  {loading&&!payload?
   <div className="p-8 text-center text-[12px] text-[#718597]">Đang phân tích sự cố...</div>:
   payload?.incidents.length===0?
    <div className="px-5 py-10 text-center text-[12px] text-[#718597]">
     {error?"Chưa thể xác minh trạng thái sự cố.":"Không có nhóm sự cố phù hợp với trạng thái đang chọn."}
    </div>:
    <div className="divide-y divide-[#edf0f3]">
     {(payload?.incidents||[]).map(item=>{
      const spike=item.level!=="warning"&&item.window_count>=3&&
       new Date(payload!.refreshedAt).getTime()-new Date(item.window_started_at).getTime()<300000&&item.resolution!=="resolved";
      return <article key={item.id} className="px-4 py-4 sm:px-6">
       <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
         <div className="flex flex-wrap items-center gap-2">
          <span className={"rounded-md border px-2 py-1 text-[10px] font-bold "+severity[item.level]}>{text[item.level]}</span>
          <span className="rounded-md bg-[#eaf1f4] px-2 py-1 text-[10px] font-semibold text-[#527082]">{item.source}</span>
          {spike&&<span className="rounded-md bg-orange-100 px-2 py-1 text-[10px] font-bold text-orange-800">Lặp ≥ 3 lần / 5 phút</span>}
          {item.reopened_count>0&&<span className="rounded-md bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-800">Đã tái phát {item.reopened_count} lần</span>}
         </div>
         <h3 className="mt-2 break-words font-mono text-[12px] font-bold text-[#25445e]">{item.event}</h3>
         <p className="mt-1 text-[12px] leading-6 text-[#607589]">{item.title}</p>
         <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#8493a2]">
          <span>Đầu tiên: {formatTime(item.first_seen_at)}</span>
          <span>Gần nhất: {formatTime(item.last_seen_at)}</span>
          <span className="font-bold text-[#365a76]">{item.occurrence_count.toLocaleString("vi-VN")} lượt</span>
          {item.latest_release&&<span>Release: <code>{item.latest_release}</code></span>}
         </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
         <span className="text-[11px] font-semibold text-[#657f91]">{STATUS[item.resolution]}</span>
         <button type="button" aria-expanded={expanded===item.id}
          onClick={()=>void toggle(item)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#dce5ea] bg-white px-3 text-[11px] font-bold text-[#44637b] hover:bg-[#f0f4f7]">
          {expanded===item.id?"Thu gọn":"Điều tra"} <ChevronDown size={14} className={expanded===item.id?"rotate-180":""}/>
         </button>
        </div>
       </div>
       {expanded===item.id&&<div className="mt-4 space-y-4 rounded-xl border border-[#e0e8ee] bg-[#f7fafb] p-4">
        <div className="grid gap-2 text-[11px] sm:grid-cols-2">
         <div><span className="text-[#8798a5]">Dấu vân tay lỗi</span><p className="mt-1 break-all font-mono text-[#324e61]">{item.fingerprint}</p></div>
         <div><span className="text-[#8798a5]">Lượt trong cửa sổ tối đa 5 phút</span><p className="mt-1 font-semibold text-[#324e61]">{item.window_count} lượt · bắt đầu {formatTime(item.window_started_at)}</p></div>
         <div><span className="text-[#8798a5]">Request ID gần nhất</span><p className="mt-1 break-all font-mono text-[#324e61]">{item.latest_request_id||"—"}</p></div>
         <div><span className="text-[#8798a5]">Phát hành đầu tiên / mới nhất</span><p className="mt-1 font-mono text-[#324e61]">{item.first_release||"—"} / {item.latest_release||"—"}</p></div>
        </div>
        <div>
         <p className="mb-2 text-[11px] font-bold text-[#415d74]">15 lượt lỗi mới nhất trong nhóm</p>
         {eventsLoading?<p className="text-[12px] text-[#7d8998]">Đang tải lịch sử...</p>:
          events.length===0?<p className="text-[12px] text-[#7d8998]">Chưa có dữ liệu sự kiện.</p>:
          <div className="max-h-64 space-y-2 overflow-auto">
           {events.map(event=><div key={event.id}
            className="rounded-lg border border-[#e0e7ec] bg-white px-3 py-2.5 text-[11px]">
            <div className="flex flex-wrap items-center gap-3">
             <span className="font-semibold text-[#41627a]">{formatTime(event.occurred_at)}</span>
             <span className="font-mono text-[#677e91]">{event.status_code||"—"} · {event.duration_ms??"—"} ms</span>
             <span className="font-mono text-[#677e91]">{event.release||"—"}</span>
             {event.request_id&&<button type="button"
              onClick={()=>{void navigator.clipboard?.writeText(event.request_id||"");}}
              className="flex items-center gap-1 rounded-md border border-[#dae5eb] px-2 py-1 text-[#44637b] hover:bg-[#eff4f6]">
              <ClipboardCopy size={12}/> Copy Request ID
             </button>}
            </div>
            <pre className="mt-1 max-h-28 overflow-auto break-words whitespace-pre-wrap font-mono text-[10px] text-[#6b7f8e]">{JSON.stringify(event.context||{})}</pre>
           </div>)}
          </div>}
        </div>
        <div className="flex flex-wrap gap-2">
         {(["open","investigating","resolved"] as const).map(next=><button
          type="button" key={next} disabled={updating===item.id||item.resolution===next}
          onClick={()=>void change(item,next)}
          className={"min-h-9 rounded-lg border px-3 text-[11px] font-bold disabled:opacity-40 "+(
           next==="resolved"?"border-emerald-200 bg-emerald-50 text-emerald-800":
            "border-[#d4e0e8] bg-white text-[#46677e]")}>
          {next==="open"?"Mở lại":next==="investigating"?"Đang xử lý":"Đã khắc phục"}
         </button>)}
        </div>
       </div>}
      </article>;
     })}
    </div>}
  {payload&&pages>1&&<footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5eaef] px-5 py-4">
   <span className="text-[11px] text-[#7a8da0]">Trang {page+1}/{pages}</span>
   <div className="flex gap-2">
    <button type="button" disabled={page===0}
     onClick={()=>{setPage(p=>Math.max(0,p-1));setExpanded("");}}
     className="btn btn-secondary min-h-9 disabled:opacity-40"><ChevronLeft size={14}/> Trước</button>
    <button type="button" disabled={page+1>=pages||page>=50}
     onClick={()=>{setPage(p=>p+1);setExpanded("");}}
     className="btn btn-secondary min-h-9 disabled:opacity-40">Tiếp <ChevronRight size={14}/></button>
   </div>
  </footer>}
  <footer className="flex items-center gap-2 border-t border-[#edf0f4] bg-[#f9fbfc] px-4 py-3 text-[11px] leading-5 text-[#8192a2] sm:px-6">
   <ShieldAlert size={15}/> Nhóm lỗi lưu tại Supabase, phân quyền theo Đại hội. Không thu thập mật khẩu, token hay nội dung hồ sơ đại biểu.
  </footer>
 </section>;
}
