"use client";

import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {QRCodeSVG} from "qrcode.react";
import {BrandMark} from "@/components/brand-mark";
import {
 ArrowLeft,Check,Clock3,Copy,Download,ExternalLink,Maximize2,Minimize2,
 UserRoundCheck,QrCode,ShieldCheck,Smartphone,X
} from "lucide-react";
import type {AttendanceSession} from "@/lib/types";
import {computeLiveSummary,type LiveDashboardData} from "@/lib/attendance-live";
import {ProjectionWelcome,ProjectionSeatingMap} from "@/components/attendance-projection";
import {displayTime} from "@/lib/attendance-report";
import {getWindowStatus,getWindowLabel} from "@/lib/attendance-window";

type Props={congressId:string;sessions:AttendanceSession[];initialSessionId:string;congressName:string};
type Ticket={url:string;sessionName:string;refreshedAt:string};

export function SessionQrScreen({congressId,sessions,initialSessionId,congressName}:Props){
 const [sessionId,setSessionId]=useState(initialSessionId);
 const [ticket,setTicket]=useState<Ticket|null>(null);
 const [liveData,setLiveData]=useState<LiveDashboardData|null>(null);
 const [liveError,setLiveError]=useState("");
 const [error,setError]=useState("");
 const [clock,setClock]=useState(Date.now);
 const [full,setFull]=useState(false);
 const [downloadOpen,setDownloadOpen]=useState(false);
 const [copied,setCopied]=useState(false);
 const selectedRef=useRef(initialSessionId);
 const screen=useRef<HTMLElement>(null);
 const qrSvg=useRef<SVGSVGElement>(null);
 const base="/congresses/"+congressId+"/attendance";
 const session=sessions.find(s=>s.id===sessionId);
 const status=session?getWindowStatus(session,new Date(clock)):"not-configured";
 const allowed=Boolean(session&&(session.qr_policy==="both"||session.qr_policy==="session"));
 const visible=Boolean(ticket&&allowed);
 const canScan=visible&&status==="open";
 const summary=liveData?computeLiveSummary(liveData):null;
 const localQr=Boolean(ticket&&/https?:\/\/(?:localhost|127\.0\.0\.1)(?::|\/)/.test(ticket.url));

 const loadTicket=useCallback(async()=>{
  if(!sessionId){setTicket(null);return;}
  try{
   const q=new URLSearchParams({congressId,sessionId});
   const response=await fetch("/api/attendance/session-qr?"+q.toString(),{
    cache:"no-store",credentials:"same-origin"
   });
   const body=await response.json();
   if(!response.ok)throw new Error(body.error||"Không lấy được QR của phiên.");
   if(selectedRef.current!==sessionId)return;
   setTicket(body as Ticket);setError("");
  }catch(e){
   if(selectedRef.current!==sessionId)return;
   setTicket(null);setError(e instanceof Error?e.message:"Không cấp được QR phiên.");
  }
 },[congressId,sessionId]);
 useEffect(()=>{queueMicrotask(()=>void loadTicket());},[loadTicket]);
 useEffect(()=>{
  let mounted=true,pending=false;
  async function syncLive(){
   if(!sessionId||pending||document.visibilityState==="hidden")return;
   pending=true;
   try{
    const q=new URLSearchParams({congressId,sessionId});
    const response=await fetch("/api/attendance/live?"+q.toString(),{
     credentials:"same-origin",cache:"no-store"
    });
    const body=await response.json();
    if(!response.ok)throw new Error(body.error||"Không tải được sơ đồ điểm danh.");
    if(mounted){setLiveData(body as LiveDashboardData);setLiveError("");}
   }catch(e){
    if(mounted)setLiveError(e instanceof Error?e.message:"Không đồng bộ được sơ đồ.");
   }finally{pending=false;}
  }
  void syncLive();
  // Giảm độ trễ hiển thị flashcard sau khi đại biểu vừa quét mã.
  const timer=setInterval(()=>void syncLive(),3000);
  const onVisible=()=>{if(document.visibilityState==="visible")void syncLive();};
  document.addEventListener("visibilitychange",onVisible);
  return()=>{mounted=false;clearInterval(timer);
   document.removeEventListener("visibilitychange",onVisible);};
 },[congressId,sessionId]);
 useEffect(()=>{
  const interval=setInterval(()=>setClock(Date.now()),1000);
  return()=>clearInterval(interval);
 },[]);
 useEffect(()=>{
  const changed=()=>setFull(Boolean(document.fullscreenElement));
  document.addEventListener("fullscreenchange",changed);
  return()=>document.removeEventListener("fullscreenchange",changed);
 },[]);
 useEffect(()=>{
  if(!downloadOpen)return;
  const close=(e:KeyboardEvent)=>{if(e.key==="Escape")setDownloadOpen(false);};
  document.addEventListener("keydown",close);
  return()=>document.removeEventListener("keydown",close);
 },[downloadOpen]);

 async function toggleFullscreen(){
  try{
   if(document.fullscreenElement)await document.exitFullscreen();
   else await screen.current?.requestFullscreen();
  }catch{setError("Trình duyệt không cho phép bật chế độ toàn màn hình.");}
 }
 async function copy(){
  if(!ticket)return;
  try{
   if(!navigator.clipboard?.writeText)throw new Error("Clipboard không khả dụng");
   await navigator.clipboard.writeText(ticket.url);
   setCopied(true);window.setTimeout(()=>setCopied(false),2000);
  }catch{window.prompt("Sao chép đường dẫn điểm danh:",ticket.url);}
 }
 function save(blob:Blob,filename:string){
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=filename;a.style.display="none";
  document.body.appendChild(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1500);
 }
 async function downloadQr(format:"png"|"svg"){
  if(!visible||!qrSvg.current)return;
  try{
   const node=qrSvg.current.cloneNode(true) as SVGSVGElement;
   node.setAttribute("xmlns","http://www.w3.org/2000/svg");
   node.setAttribute("width","1200");node.setAttribute("height","1200");
   const xml=new XMLSerializer().serializeToString(node);
   const file="qr-diem-danh-"+(session?.name||"phien").normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9-]+/g,"-").slice(0,40)
    +"-"+sessionId.slice(0,8);
   if(format==="svg"){
    save(new Blob([xml],{type:"image/svg+xml;charset=utf-8"}),file+".svg");
   }else{
    const canvas=document.createElement("canvas");
    canvas.width=1200;canvas.height=1200;
    const ctx=canvas.getContext("2d");
    if(!ctx)throw new Error("Không thể xuất hình QR.");
    const img=new window.Image();
    const svgUrl=URL.createObjectURL(new Blob([xml],{type:"image/svg+xml"}));
    try{
     await new Promise<void>((resolve,reject)=>{
      img.onload=()=>resolve();img.onerror=()=>reject(new Error("Không đọc được QR."));
      img.src=svgUrl;
     });
     ctx.fillStyle="#ffffff";ctx.fillRect(0,0,1200,1200);
     ctx.drawImage(img,0,0,1200,1200);
    }finally{URL.revokeObjectURL(svgUrl);}
    const png=await new Promise<Blob>((resolve,reject)=>
     canvas.toBlob(b=>b?resolve(b):reject(new Error("Không tạo được PNG.")),"image/png"));
    save(png,file+".png");
   }
   setError("");setDownloadOpen(false);
  }catch(e){setError(e instanceof Error?e.message:"Không tải xuống được QR.");}
 }

 return <div className="mx-auto max-w-[1680px] space-y-5">
  <div className="flex flex-wrap items-start justify-between gap-4">
   <div>
    <p className="page-kicker">HỆ THỐNG ĐIỀU HÀNH ĐẠI HỘI · TRỰC TIẾP</p>
    <h1 className="page-title mt-2">Màn hình điểm danh đại biểu</h1>
    <p className="page-description mt-2">Chào đón đại biểu trên màn hình lớn, theo dõi ghế và quét QR ngay tại hội trường.</p>
   </div>
   <div className="flex flex-wrap gap-2">
    <Link className="btn btn-secondary" href={base}><ArrowLeft size={16}/> Quản lý phiên</Link>
    <Link className="btn btn-secondary" href={base+"/desk?sessionId="+sessionId}><UserRoundCheck size={16}/> Quét tại bàn BTC</Link>
   </div>
  </div>

  <div className="flex flex-wrap items-end justify-between gap-4 rounded-[16px] border border-[#dbe7ee] bg-white p-4 shadow-sm sm:px-6 sm:py-4">
   <div className="w-full min-w-0 sm:w-auto sm:min-w-[360px] sm:max-w-[600px] sm:flex-1">
    <label className="block text-xs font-bold text-[#516f81]" htmlFor="projection-session">Phiên điểm danh đang trình chiếu</label>
    <select id="projection-session" className="field mt-2 w-full" value={sessionId}
     onChange={e=>{selectedRef.current=e.target.value;setSessionId(e.target.value);
      setTicket(null);setLiveData(null);setLiveError("");setError("");setDownloadOpen(false);}}>
     {!sessions.length&&<option value="">Chưa có phiên điểm danh</option>}
     {sessions.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
   </div>
   {session&&<div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#617d8d]">
    <span><Clock3 size={14} className="mr-1 inline"/> {displayTime(session.starts_at)} – {displayTime(session.ends_at)}</span>
    <span className={"rounded-full px-3 py-1.5 font-bold "+(canScan?"bg-[#e1f7ec] text-[#167853]":"bg-[#f4f0e6] text-[#8a6a30]")}>
     {getWindowLabel(status)}
    </span>
   </div>}
  </div>

  <section ref={screen} className="projection-stage relative isolate overflow-x-hidden overflow-y-auto rounded-[24px] border border-[#31475e] bg-[#101f33] text-white shadow-[0_26px_60px_rgba(12,33,54,.2)] fullscreen:h-dvh fullscreen:rounded-none fullscreen:border-0">
   <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_1%_0%,rgba(48,103,144,.18),transparent_35%),radial-gradient(ellipse_at_99%_32%,rgba(214,171,99,.08),transparent_42%)]"/>
   <div aria-hidden="true" className="pointer-events-none absolute left-0 top-0 h-[3px] w-full bg-gradient-to-r from-[#a87334] via-[#ecd49e] to-[#3193bb]"/>
   <header className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-7 xl:px-9">
    <div className="flex min-w-0 items-center gap-3">
     <BrandMark className="!h-[50px] !w-[50px] !flex-[0_0_50px] !border-white/15 !bg-white !p-1"/>
     <div className="min-w-0">
      <p className="truncate text-[10px] font-extrabold uppercase tracking-[.13em] text-[#e0c78f]">{congressName}</p>
      <h2 className="mt-1 break-words text-[clamp(16px,1.7vw,22px)] font-extrabold tracking-tight text-white">{session?.name||"Chưa chọn phiên điểm danh"}</h2>
     </div>
    </div>
    <button type="button" onClick={()=>void toggleFullscreen()}
     className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/[.06] px-3.5 text-[12px] font-extrabold text-white hover:bg-white/15">
     {full?<Minimize2 size={16}/>:<Maximize2 size={16}/>}
     {full?"Thoát toàn màn hình":"Chiếu toàn màn hình"}
    </button>
   </header>

   <div className="relative grid grid-cols-3 gap-2 border-b border-white/10 bg-white/[.025] px-4 py-4 sm:gap-6 sm:px-7 xl:px-9" aria-label="Tình hình điểm danh">
    <div className="border-r border-white/10">
     <p className="text-[10px] font-extrabold uppercase tracking-[.07em] text-[#a8c0cf]">Tổng đại biểu</p>
     <p className="mt-1 text-[clamp(24px,3vw,39px)] font-black tabular-nums tracking-tight text-white">{summary?.total||0}</p>
    </div>
    <div className="border-r border-white/10">
     <p className="text-[10px] font-extrabold uppercase tracking-[.07em] text-[#a8c0cf]">Đã tham dự</p>
     <p className="mt-1 text-[clamp(24px,3vw,39px)] font-black tabular-nums tracking-tight text-[#90edc2]">{summary?.present||0}</p>
    </div>
    <div>
     <p className="text-[10px] font-extrabold uppercase tracking-[.07em] text-[#a8c0cf]">Tỷ lệ tham dự</p>
     <p className="mt-1 text-[clamp(24px,3vw,39px)] font-black tabular-nums tracking-tight text-white">{summary?.percentage||0}<span className="ml-1 text-sm text-[#b0d2dc]">%</span></p>
    </div>
    <div className="col-span-3 mt-1 h-[5px] overflow-hidden rounded-full bg-white/10"
     role="progressbar" aria-label="Tiến độ điểm danh"
     aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary?.percentage??0}>
     <div className="h-full rounded-full bg-gradient-to-r from-[#3dc492] to-[#e3c080] transition-[width] duration-700 motion-reduce:transition-none"
      style={{width:(summary?.percentage??0)+"%"}}/>
    </div>
   </div>
   <div className="relative mx-3 mt-4 min-w-0 sm:mx-6 sm:mt-5 xl:mx-7" data-projection-section="latest-delegate">
     <ProjectionWelcome data={liveData} congressName={congressName}/>
    </div>
    <div className="relative grid min-w-0 items-stretch gap-4 p-3 pt-4 sm:gap-5 sm:p-6 lg:grid-cols-[minmax(310px,0.78fr)_minmax(0,1.22fr)] xl:p-7" data-projection-section="attendance-operations">
    <div className="flex min-w-0 flex-col gap-4" data-projection-section="session-qr">
     <div className="flex h-full flex-col overflow-hidden rounded-[20px] border border-white/15 bg-[#1b3048] p-4 shadow-[0_12px_34px_rgba(2,13,27,.13)] sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
       <span className="flex items-center gap-2 text-[14px] font-extrabold text-white"><QrCode size={18} className="text-[#e8ca8f]"/> QR ĐIỂM DANH</span>
       <span className={"inline-flex items-center gap-1.5 text-[11px] font-semibold "+(canScan?"text-[#80e8ba]":"text-[#ead19c]")}>
        <span className={"h-2 w-2 rounded-full "+(canScan?"bg-[#50dfa7]":"bg-[#d8b46c]")}/>
        {canScan?"Đang nhận điểm danh":"Ngoài giờ điểm danh"}
       </span>
      </div>
      <div className="flex flex-1 items-center justify-center">
       <button type="button" disabled={!visible} onClick={()=>setDownloadOpen(true)}
        title="Nhấn mã QR để tải ảnh PNG hoặc SVG"
        aria-label="Mở tùy chọn tải xuống mã QR của phiên"
        className="group flex h-[min(72vw,290px)] w-[min(72vw,290px)] shrink-0 items-center justify-center rounded-[18px] border-[7px] border-[#f1eee7] bg-white p-2.5 shadow-[0_16px_40px_rgba(0,0,0,.22)] outline-offset-4 transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-default disabled:hover:translate-y-0 sm:h-[290px] sm:w-[290px] 2xl:h-[310px] 2xl:w-[310px]">
        {visible&&ticket?
         <QRCodeSVG ref={qrSvg} value={ticket.url} size={256} level="M" marginSize={2}
          className="h-full w-full" title={"QR điểm danh "+session?.name}/>:
         <div className="flex max-w-[240px] flex-col items-center gap-3 text-center text-[#7c96a3]">
          <Clock3 size={42}/>
          <p className="text-sm font-bold leading-6">Đang tải mã QR hoặc phiên chưa cho phép QR theo phiên.</p>
         </div>}
       </button>
      </div>
      <p className="mt-4 text-center text-[13px] font-extrabold text-white">{visible?"MỞ CAMERA ĐIỆN THOẠI VÀ QUÉT MÃ":"ĐANG CHỜ KÍCH HOẠT QR"}</p>
       <p className="mt-1 text-center text-[11px] leading-5 text-[#b8ccd8]">{visible?"Đăng nhập tài khoản đại biểu để hệ thống ghi nhận đúng phiên.":"Chọn phiên cho phép điểm danh bằng QR."}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
       <button type="button" disabled={!visible} onClick={()=>setDownloadOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#e7ca8e] px-3 text-xs font-extrabold text-[#263b4a] hover:bg-[#f5dca3] disabled:opacity-50">
        <Download size={16}/> Tải mã QR
       </button>
       <button type="button" disabled={!visible} onClick={()=>void copy()}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[.04] px-3 text-xs font-bold text-white hover:bg-white/15 disabled:opacity-50">
        {copied?<Check size={15}/>:<Copy size={15}/>} {copied?"Đã sao chép":"Sao chép liên kết"}
       </button>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-black/10 px-3 py-3 text-[11px] leading-5 text-[#c5d8e2]">
       <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#77e6b2]"/>
       Mã QR không thay đổi trong phiên. Hệ thống chỉ xác nhận điểm danh khi phiên mở và đại biểu đăng nhập đúng tài khoản.
      </div>
     </div>

     {error&&<p role="alert" className="rounded-lg border border-[#e6bca4]/40 bg-[#ffe8ce]/10 px-4 py-3 text-xs text-[#ffdfc6]">{error}</p>}
     {localQr&&<p role="status" className="rounded-lg bg-[#ffe8ce]/10 px-4 py-3 text-xs leading-5 text-[#ffe2b9]">
      Liên kết QR đang dùng localhost. Hãy mở trang bằng IP LAN hoặc cấu hình SESSION_QR_BASE_URL trước khi phát mã cho đại biểu.
     </p>}
    </div>
    <div className="min-w-0" data-projection-section="seat-map">
     <ProjectionSeatingMap data={liveData} congressId={congressId} compact/>
     {liveError&&<p role="status" className="mt-3 rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-xs text-[#f9e2be]">Sơ đồ chưa cập nhật: {liveError}</p>}
    </div>
   </div>
   <footer className="relative flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-white/10 px-5 py-3 text-center text-[11px] text-[#afd4dc]">
    <span className="inline-flex items-center gap-1.5"><Smartphone size={14}/> Đại biểu quét bằng điện thoại và đăng nhập tài khoản cá nhân</span>
    <span>·</span>
    <span>Sơ đồ ghế và thông tin đại biểu tự đồng bộ mỗi 3 giây</span>
   </footer>

   {downloadOpen&&visible&&<div role="presentation" onMouseDown={e=>{
    if(e.target===e.currentTarget)setDownloadOpen(false);
   }} className="fixed inset-0 z-[90] flex items-center justify-center bg-[#081f2d]/75 p-4 backdrop-blur-[3px]">
    <div role="dialog" aria-modal="true" aria-labelledby="qr-download-title"
     className="w-full max-w-[410px] rounded-[18px] border border-[#e4eef1] bg-white p-5 text-[#214a5e] shadow-[0_25px_70px_rgba(0,0,0,.24)] sm:p-6">
     <div className="flex items-start justify-between gap-4">
      <div>
       <h3 id="qr-download-title" className="text-lg font-extrabold">Tải mã QR của phiên</h3>
       <p className="mt-1 text-xs leading-5 text-[#668798]">Mã giữ nguyên trong suốt phiên, phù hợp để trình chiếu hoặc in ra giấy.</p>
      </div>
      <button type="button" aria-label="Đóng" onClick={()=>setDownloadOpen(false)}
       className="rounded-lg p-1.5 text-[#6b8997] hover:bg-[#eef4f7]"><X size={19}/></button>
     </div>
     <div className="my-5 flex justify-center rounded-xl bg-[#f3f7f8] p-4">
      {ticket&&<QRCodeSVG value={ticket.url} size={194} level="M" marginSize={2}/>}
     </div>
     <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={()=>void downloadQr("png")}
       className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0c596e] px-3 text-xs font-bold text-white hover:bg-[#0b4658]">
       <Download size={16}/> Tải PNG
      </button>
      <button type="button" onClick={()=>void downloadQr("svg")}
       className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#bdd4db] px-3 text-xs font-bold text-[#1a5c70] hover:bg-[#ecf5f7]">
       <Download size={16}/> Tải SVG
      </button>
     </div>
     {ticket&&<a href={ticket.url} target="_blank" rel="noopener noreferrer"
      className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#27819c] hover:underline">
      <ExternalLink size={14}/> Mở đường dẫn điểm danh
     </a>}
    </div>
   </div>}
  </section>
 </div>;
}