"use client";
import {useCallback,useEffect,useState} from "react";
import {SystemIncidentsPanel} from "@/components/system-incidents-panel";
import {SystemLogInsights} from "@/components/system-log-insights";
import {Activity,AlertTriangle,CheckCircle2,ChevronLeft,ChevronRight,ClipboardCopy,
 Clock3,Download,Filter,RefreshCw,Search,ShieldAlert,Terminal,TriangleAlert} from "lucide-react";

type Level="critical"|"error"|"warning"|"info";
type Resolution="open"|"investigating"|"resolved";
type SystemLog={
 id:string;occurred_at:string;level:Level;source:string;event:string;message:string;
 congress_id:string|null;actor_id:string|null;request_id:string|null;
 status_code:number|null;duration_ms:number|null;
 context:Record<string,string|number|boolean|null>;
 resolution:Resolution;handled_at:string|null;handled_by:string|null;
 fingerprint:string|null;release:string|null;environment:string|null;
};
type LogPayload={
 logs:SystemLog[];total:number;page:number;pageSize:number;
 metrics:{errors24h:number;warnings24h:number;unresolved24h:number};
 congresses:{id:string;name:string}[];superAdmin:boolean;refreshedAt:string;
};
const DATE=new Intl.DateTimeFormat("vi-VN",{
 timeZone:"Asia/Ho_Chi_Minh",hour:"2-digit",minute:"2-digit",second:"2-digit",day:"2-digit",month:"2-digit",year:"numeric"
});
const levelText:Record<Level,string>={critical:"Nghiêm trọng",error:"Lỗi",warning:"Cảnh báo",info:"Thông tin"};
const levelClass:Record<Level,string>={
 critical:"border-rose-200 bg-rose-100 text-rose-800",
 error:"border-red-200 bg-red-50 text-red-700",
 warning:"border-amber-200 bg-amber-50 text-amber-800",
 info:"border-sky-200 bg-sky-50 text-sky-700"
};
const resolutionText:Record<Resolution,string>={
 open:"Chưa xử lý",investigating:"Đang xử lý",resolved:"Đã khắc phục"
};
const EMPTY_METRICS={errors24h:0,warnings24h:0,unresolved24h:0};
const troubleshooting:Record<string,string>={
 auth:"Kiểm tra Supabase Authentication Rate Limits, trạng thái dịch vụ và nhật ký runtime của Vercel.",
 attendance:"Đối chiếu mã phiên, cửa sổ điểm danh, quyền ghi checkins và PostgreSQL triggers/indexes.",
 documents:"Kiểm tra cấu hình Google Apps Script, HMAC, quyền chia sẻ Drive và bảng documents trong Supabase.",
 seating:"Kiểm tra cấu hình sơ đồ phiên, seat_assignments và các migration ghế đã áp dụng.",
 frontend:"Đối chiếu thời điểm deploy, đường dẫn file JavaScript và console trên thiết bị tái hiện lỗi.",
 api:"Kiểm tra Vercel Runtime Logs theo Request ID và trạng thái kết nối Supabase."
};
function time(value:string|null){
 if(!value)return "—";
 const date=new Date(value);
 return Number.isNaN(date.getTime())?"—":DATE.format(date);
}

export function SystemLogsClient(){
 const [payload,setPayload]=useState<LogPayload|null>(null);
 const [loading,setLoading]=useState(true);
 const [refreshing,setRefreshing]=useState(false);
 const [error,setError]=useState("");
 const [period,setPeriod]=useState("24h");
 const [level,setLevel]=useState("");
 const [source,setSource]=useState("");
 const [resolution,setResolution]=useState("");
 const [congressId,setCongressId]=useState("");
 const [draft,setDraft]=useState("");
 const [query,setQuery]=useState("");
 const [requestId,setRequestId]=useState("");
 const [page,setPage]=useState(0);
 const [expanded,setExpanded]=useState("");
 const [updating,setUpdating]=useState("");
 const [refreshKey,setRefreshKey]=useState(0);

 const params=new URLSearchParams({period,page:String(page)});
 if(level)params.set("level",level);
 if(source)params.set("source",source);
 if(resolution)params.set("resolution",resolution);
 if(congressId)params.set("congressId",congressId);
 if(query)params.set("q",query);
 if(requestId)params.set("requestId",requestId);

 useEffect(()=>{
  let active=true;
  let busy=false;
  const load=async(initial=false)=>{
   if(busy)return;
   busy=true;
   if(initial)setLoading(true);else setRefreshing(true);
   try{
    const response=await fetch("/api/system-logs?"+params.toString(),{
     credentials:"same-origin",cache:"no-store"
    });
    const body=await response.json();
    if(!response.ok)throw new Error(body.error||"Không tải được nhật ký hệ thống.");
    if(active){setPayload(body as LogPayload);setError("");}
   }catch(e){
    if(active)setError(e instanceof Error?e.message:"Không kết nối được nhật ký.");
   }finally{
    busy=false;
    if(active){setLoading(false);setRefreshing(false);}
   }
  };
  void load(!payload);
  const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void load();},15000);
  const visible=()=>{if(document.visibilityState==="visible")void load();};
  document.addEventListener("visibilitychange",visible);
  return ()=>{active=false;clearInterval(timer);document.removeEventListener("visibilitychange",visible);};
 // URLSearchParams is reconstructed on each render, so depend on its stable string.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[params.toString(),refreshKey]);

 const updateResolution=useCallback(async(id:string,next:Resolution)=>{
  if(updating)return;
  setUpdating(id);
  try{
   const response=await fetch("/api/system-logs",{
    method:"PATCH",credentials:"same-origin",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({id,resolution:next})
   });
   const body=await response.json();
   if(!response.ok)throw new Error(body.error||"Không cập nhật được trạng thái.");
   setPayload(prev=>prev?{
    ...prev,logs:prev.logs.map(item=>item.id===id?{...item,...body.log}:item)
   }:prev);
   setError("");
   setRefreshKey(v=>v+1);
  }catch(e){setError(e instanceof Error?e.message:"Không cập nhật được.");}
  finally{setUpdating("");}
 },[updating]);

 const metrics=payload?.metrics||EMPTY_METRICS;
 const downloadUrl="/api/system-logs/export?"+params.toString();
 const selectSource=(value:string)=>{
  if(!["auth","attendance","documents","seating","frontend","api"].includes(value))return;
  setSource(value);setPage(0);setExpanded("");
 };
 const logs=payload?.logs||[];
 const pages=payload?Math.ceil(payload.total/payload.pageSize):0;
 const resetPage=()=>{setPage(0);setExpanded("");};

 return <div className="space-y-6">
  <section className="relative overflow-hidden rounded-[22px] border border-[#284561] bg-[#10283f] px-5 py-7 text-white sm:px-8 sm:py-9">
   <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_95%_10%,rgba(65,145,166,.24),transparent_50%)]"/>
   <div className="relative flex flex-wrap items-end justify-between gap-6">
    <div className="max-w-2xl">
     <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.17em] text-[#d7bd87]">
      <Terminal size={16}/> Developer operations / Observability
     </p>
     <h1 className="mt-4 text-[clamp(27px,3.6vw,42px)] font-extrabold tracking-tight">Nhật ký hệ thống</h1>
     <p className="mt-3 text-[13px] leading-7 text-[#bfd2df]">
      Theo dõi lỗi ứng dụng, truy vết request, xác định sự cố và ghi nhận trạng thái khắc phục. Tự cập nhật mỗi 15 giây khi trang đang mở.
     </p>
    </div>
    <div className="flex flex-wrap items-center gap-2">
     <a href={downloadUrl} download className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-[12px] font-bold text-white hover:bg-white/20"><Download size={16}/> Xuất CSV</a>
     <button type="button" onClick={()=>setRefreshKey(n=>n+1)} disabled={refreshing}
     className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-[12px] font-bold text-white hover:bg-white/20 disabled:opacity-60">
     <RefreshCw size={16} className={refreshing?"animate-spin":""}/> Làm mới
    </button>
   </div>
    </div>
  </section>

  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
   {([
    {label:"Lỗi 24 giờ",value:metrics.errors24h,icon:ShieldAlert,foot:"Critical và Error"},
    {label:"Lượt lỗi chưa khắc phục",value:metrics.unresolved24h,icon:AlertTriangle,foot:"Theo từng bản ghi sự kiện trong 24 giờ"},
    {label:"Cảnh báo 24 giờ",value:metrics.warnings24h,icon:Activity,foot:"Warning trong hệ thống"}
   ] as const).map(({label,value,icon:Icon,foot})=>
    <div key={label} className="rounded-2xl border border-[#e1e7ef] bg-white p-5 shadow-[0_8px_30px_rgba(18,40,70,.035)]">
     <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] font-semibold text-[#60738b]">{label}</span>
      <Icon size={19} className={value>0?"text-amber-600":"text-[#7592a1]"}/>
     </div>
     <p className="mt-3 text-[32px] font-extrabold tabular-nums text-[#163047]">{value.toLocaleString("vi-VN")}</p>
     <p className="mt-1 text-[11px] text-[#8290a2]">{foot}</p>
    </div>
   )}
  </div>
  {metrics.unresolved24h>0&&<div role="status" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] leading-6 text-amber-900">
   <TriangleAlert size={19} className="mt-0.5 shrink-0"/> Có {metrics.unresolved24h} sự kiện lỗi trong 24 giờ qua chưa đánh dấu khắc phục. Kiểm tra và phân công xử lý ở danh sách bên dưới.
  </div>}
  {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] leading-6 text-rose-800">
   {error}
  </div>}

  <SystemLogInsights period={period} congressId={congressId} refreshKey={refreshKey} onSource={selectSource}/>

  <SystemIncidentsPanel key={congressId+":"+period} congressId={congressId} period={period}/>

  <section aria-label="Bộ lọc nhật ký" className="rounded-2xl border border-[#e1e7ef] bg-white p-4 sm:p-5">
   <div className="mb-4 flex items-center gap-2 text-[13px] font-extrabold text-[#30445d]"><Filter size={17}/> Bộ lọc sự kiện</div>
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
    <label className="text-[11px] font-semibold text-[#61758a]">Thời gian
     <select value={period} onChange={e=>{setPeriod(e.target.value);resetPage();}} className="field mt-1.5 w-full">
      <option value="1h">1 giờ</option><option value="24h">24 giờ</option><option value="7d">7 ngày</option><option value="30d">30 ngày</option>
     </select>
    </label>
    <label className="text-[11px] font-semibold text-[#61758a]">Mức độ
     <select value={level} onChange={e=>{setLevel(e.target.value);resetPage();}} className="field mt-1.5 w-full">
      <option value="">Tất cả</option><option value="critical">Critical</option><option value="error">Error</option>
      <option value="warning">Warning</option><option value="info">Info</option>
     </select>
    </label>
    <label className="text-[11px] font-semibold text-[#61758a]">Nguồn
     <select value={source} onChange={e=>{setSource(e.target.value);resetPage();}} className="field mt-1.5 w-full">
      <option value="">Tất cả</option><option value="auth">Xác thực</option><option value="attendance">Điểm danh</option>
      <option value="documents">Tài liệu</option><option value="seating">Sơ đồ ghế</option>
      <option value="frontend">Giao diện</option><option value="api">API</option>
     </select>
    </label>
    <label className="text-[11px] font-semibold text-[#61758a]">Xử lý
     <select value={resolution} onChange={e=>{setResolution(e.target.value);resetPage();}} className="field mt-1.5 w-full">
      <option value="">Tất cả</option><option value="open">Chưa xử lý</option>
      <option value="investigating">Đang xử lý</option><option value="resolved">Đã khắc phục</option>
     </select>
    </label>
    <label className="text-[11px] font-semibold text-[#61758a]">Đại hội
     <select value={congressId} onChange={e=>{setCongressId(e.target.value);resetPage();}} className="field mt-1.5 w-full">
      <option value="">Tất cả được phân quyền</option>
      {(payload?.congresses||[]).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
     </select>
    </label>
   </div>
   <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={e=>{
    e.preventDefault();setQuery(draft.trim());resetPage();
   }}>
    <label className="relative min-w-0 flex-1">
     <span className="sr-only">Tìm theo mã sự kiện</span>
     <Search size={17} className="pointer-events-none absolute left-3 top-3 text-[#8897a7]"/>
     <input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={60}
      className="field w-full pl-10" placeholder="Tìm mã sự kiện, ví dụ attendance.checkin_failed"/>
    </label>
    <button type="submit" className="btn btn-primary min-h-11 justify-center">Tìm sự kiện</button>
    {(query||level||source||resolution||congressId||requestId)&&<button type="button"
     onClick={()=>{setDraft("");setQuery("");setLevel("");setSource("");setResolution("");setCongressId("");setRequestId("");resetPage();}}
     className="btn btn-secondary min-h-11 justify-center">Xóa lọc</button>}
   </form>
   {requestId&&<div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#d6e7f3] bg-[#f1f8fd] px-3 py-2 text-[11px] text-[#355d7b]">
    <strong>Đang truy vết Request ID:</strong> <code className="break-all">{requestId}</code>
    <button type="button" className="ml-auto rounded border border-[#c5dbea] bg-white px-2 py-1 font-bold hover:bg-[#eaf3f8]"
     onClick={()=>{setRequestId("");resetPage();}}>Bỏ lọc</button>
   </div>}
   <p className="mt-3 text-[10px] leading-5 text-[#8193a6]">Xuất CSV theo bộ lọc hiện tại, tối đa 2.000 sự kiện/lần. Dữ liệu đã được ẩn thông tin nhạy cảm.</p>
  </section>

  <section aria-label="Danh sách nhật ký" className="overflow-hidden rounded-2xl border border-[#e1e7ef] bg-white">
   <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#edf0f5] px-4 py-4 sm:px-6">
    <div>
     <h2 className="text-[16px] font-extrabold text-[#213b54]">Dòng sự kiện</h2>
     <p className="mt-1 text-[11px] text-[#8090a2]">{payload?payload.total.toLocaleString("vi-VN"):"—"} kết quả · Theo giờ Việt Nam</p>
    </div>
    <p className="flex items-center gap-1.5 text-[11px] text-[#8798aa]"><Clock3 size={14}/> {payload?"Đồng bộ: "+time(payload.refreshedAt):"Đang kết nối"}</p>
   </header>
   {loading&&!payload?<div className="p-10 text-center text-[13px] text-[#728299]">Đang tải nhật ký kỹ thuật...</div>:
    logs.length===0?<div className="px-5 py-14 text-center">
     <CheckCircle2 size={31} className="mx-auto text-[#659d91]"/>
     <h3 className="mt-3 text-[15px] font-bold text-[#32475d]">Không có sự kiện trong bộ lọc</h3>
     <p className="mt-2 text-[12px] text-[#8694a5]">Chưa ghi nhận sự kiện phù hợp hoặc migration V36 chưa có dữ liệu.</p>
    </div>:
    <div className="divide-y divide-[#edf0f4]">
     {logs.map(item=><article key={item.id} className="px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
       <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
         <span className={"rounded-md border px-2 py-1 text-[10px] font-extrabold "+levelClass[item.level]}>{levelText[item.level]}</span>
         <span className="rounded-md bg-[#ecf1f5] px-2 py-1 text-[10px] font-semibold text-[#597189]">{item.source}</span>
         <span className="text-[11px] text-[#8b98a8]">{time(item.occurred_at)}</span>
        </div>
        <h3 className="mt-2 break-words font-mono text-[12px] font-semibold text-[#23445b]">{item.event}</h3>
        <p className="mt-1 break-words text-[12px] leading-6 text-[#5d7083]">{item.message}</p>
       </div>
       <div className="flex shrink-0 items-center gap-2">
        <span className="text-[10px] font-semibold text-[#718196]">{resolutionText[item.resolution]}</span>
        <button type="button" onClick={()=>setExpanded(expanded===item.id?"":item.id)}
         aria-expanded={expanded===item.id}
         className="min-h-9 rounded-lg border border-[#dce4eb] px-3 text-[11px] font-bold text-[#41627a] hover:bg-[#f1f5f8]">
         {expanded===item.id?"Thu gọn":"Chi tiết"}
        </button>
       </div>
      </div>
      {expanded===item.id&&<div className="mt-4 space-y-4 rounded-xl border border-[#e4eaf0] bg-[#f8fafc] p-4">
       <div className="grid gap-3 text-[11px] sm:grid-cols-2 xl:grid-cols-3">
        <div><span className="text-[#8290a1]">Mã sự kiện</span><p className="mt-1 break-all font-mono text-[#334e67]">{item.id}</p></div>
        <div><span className="text-[#8290a1]">Request ID</span>
         <div className="mt-1 flex items-center gap-2">
          <span className="break-all font-mono text-[#334e67]">{item.request_id||"—"}</span>
          {item.request_id&&<><button type="button" title="Sao chép Request ID" aria-label="Sao chép Request ID"
           onClick={()=>{void navigator.clipboard?.writeText(item.request_id||"");}} className="rounded p-1 hover:bg-[#e5ebf1]">
           <ClipboardCopy size={15}/></button>
           <button type="button" title="Truy vết các sự kiện có cùng Request ID"
            onClick={()=>{setRequestId(item.request_id||"");resetPage();}}
            className="rounded-md border border-[#cddce7] bg-white px-2 py-1 text-[10px] font-bold text-[#426780] hover:bg-[#eaf3f8]">Truy vết</button></>}
         </div>
        </div>
        <div><span className="text-[#8290a1]">HTTP / Thời gian</span>
         <p className="mt-1 text-[#334e67]">{item.status_code||"—"} · {item.duration_ms===null?"—":item.duration_ms+" ms"}</p>
        </div>
        <div><span className="text-[#8290a1]">Đại hội ID</span><p className="mt-1 break-all font-mono text-[#334e67]">{item.congress_id||"Hệ thống"}</p></div>
        <div><span className="text-[#8290a1]">Người xử lý</span><p className="mt-1 break-all font-mono text-[#334e67]">{item.handled_by||"—"}</p></div>
        <div><span className="text-[#8290a1]">Thời gian cập nhật</span><p className="mt-1 text-[#334e67]">{time(item.handled_at)}</p></div>
        <div><span className="text-[#8290a1]">Release · Môi trường</span><p className="mt-1 break-all font-mono text-[#334e67]">{item.release||"—"} · {item.environment||"—"}</p></div>
        <div><span className="text-[#8290a1]">Fingerprint</span><p className="mt-1 break-all font-mono text-[#334e67]">{item.fingerprint||"Log trước V37"}</p></div>
       </div>
       <div>
        <p className="mb-2 text-[11px] font-bold text-[#53687e]">Ngữ cảnh kỹ thuật đã ẩn dữ liệu nhạy cảm</p>
        <pre className="max-h-60 overflow-auto rounded-lg bg-[#172d42] p-4 text-[11px] leading-6 text-[#d9e8f0]">{JSON.stringify(item.context||{},null,2)}</pre>
       </div>
       <p className="rounded-lg border border-[#dce8ee] bg-white px-3 py-2.5 text-[11px] leading-6 text-[#536b80]">
        <strong>Gợi ý kiểm tra:</strong> {troubleshooting[item.source]||"Đối chiếu Request ID với runtime logs và thay đổi gần nhất của hệ thống."}
       </p>
       <div className="flex flex-wrap gap-2">
        <p className="mb-2 w-full text-[11px] leading-5 text-[#758b9c]">Trạng thái ở đây chỉ áp dụng cho dòng log. Hãy xử lý trong mục <strong>Nhóm sự cố</strong> phía trên để cập nhật cảnh báo tổng hợp.</p>
         {(["open","investigating","resolved"] as const).map(next=>
         <button key={next} type="button" disabled={updating===item.id||item.resolution===next}
          onClick={()=>void updateResolution(item.id,next)}
          className={"min-h-9 rounded-lg border px-3 text-[11px] font-semibold disabled:opacity-45 "+(next==="resolved"
           ?"border-[#b4dccb] bg-[#e8f6ef] text-[#1e7457]":"border-[#d6e0e9] bg-white text-[#456379]")}>
          {next==="open"?"Mở lại":next==="investigating"?"Đang xử lý":"Đã khắc phục"}
         </button>
        )}
       </div>
      </div>}
     </article>)}
    </div>}
   {payload&&pages>1&&<footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0f4] px-5 py-4">
    <span className="text-[11px] text-[#78899b]">Trang {page+1}/{pages} · 30 sự kiện/trang</span>
    <div className="flex gap-2">
     <button type="button" disabled={page===0} onClick={()=>{setPage(v=>Math.max(0,v-1));setExpanded("");}}
      className="btn btn-secondary min-h-9 disabled:opacity-40"><ChevronLeft size={15}/> Trước</button>
     <button type="button" disabled={page+1>=pages||page>=50}
      onClick={()=>{setPage(v=>v+1);setExpanded("");}}
      className="btn btn-secondary min-h-9 disabled:opacity-40">Tiếp <ChevronRight size={15}/></button>
    </div>
   </footer>}
  </section>
  <p className="text-[11px] leading-6 text-[#8694a5]">
   Nhật ký kỹ thuật chỉ lưu thông tin đã kiểm soát, không thu thập mật khẩu, QR, cookie hay nội dung tài liệu.
   Nhật ký này không thay thế Audit Logs hoặc hệ thống giám sát hạ tầng Vercel/Supabase.
  </p>
 </div>;
}
