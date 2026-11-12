"use client";
import Image from "next/image";
import {congressBranding} from "@/components/brand-mark";
import {delegateTheme} from "@/lib/delegate-brand-theme";
import {useCallback,useEffect,useLayoutEffect,useRef,useState} from "react";
import Link from "next/link";
import {Armchair,ArrowUpRight,BookOpen,Camera,CheckCircle2,History,Maximize2,Minimize2,Printer,UserRound,Users,X} from "lucide-react";
import {DelegateBarcode} from "@/components/delegate-barcode";
import {getWindowStatus} from "@/lib/attendance-window";
import {calculateDelegatePassScale} from "@/lib/delegate-pass-layout";
import type {PortalDelegate,PortalSession} from "@/lib/delegate-portal";

const roleLabel:Record<PortalDelegate["delegateType"],string>={
 official:"ĐẠI BIỂU CHÍNH THỨC",alternate:"ĐẠI BIỂU DỰ KHUYẾT",guest:"KHÁCH MỜI"
};
function activeSession(sessions:PortalSession[]){
 return sessions.find(s=>getWindowStatus(s)==="open")||
  sessions.find(s=>getWindowStatus(s)==="upcoming")||
  sessions[0];
}

export function DelegatePass({item,priority}:{item:PortalDelegate;priority:boolean}){
 const theme=delegateTheme(item.kind);
 const session=activeSession(item.sessions);
 const seat=session?.seat;
 const photoUrl="/api/delegates/"+item.id+"/photo?w=160&v="+encodeURIComponent(item.photoPath||"");
 const [failedSrc,setFailedSrc]=useState<string|null>(null);
 return <article aria-label={"Thẻ định danh của "+item.fullName}
  data-congress-kind={item.kind}
  className="delegate-pass premium-delegate-id relative isolate mx-auto w-full min-w-0 max-w-[386px] overflow-hidden rounded-[24px] border border-[#e2d9d0] bg-[#fffdfa] text-[#243e53] shadow-[0_24px_56px_rgba(26,62,89,.13),0_3px_10px_rgba(26,62,89,.055)]">
  <div aria-hidden="true" className={"absolute inset-x-0 top-0 z-10 h-[7px] "+theme.stripe}/>
  <span aria-hidden="true" className="premium-id-watermark">ĐẠI HỘI</span>
  <header className={"relative overflow-hidden border-b px-5 pb-[51px] pt-8 sm:px-6 "+theme.header+" "+theme.border}>
   <div aria-hidden="true" className="pointer-events-none absolute -right-[85px] -top-[80px] h-52 w-52 rounded-full border-[34px] border-white/65"/>
   <div className="relative flex items-center gap-3.5">
    <div className="flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-[17px] border border-white bg-white p-2 shadow-[0_6px_18px_rgba(48,77,103,.1)]">
     <Image src={congressBranding[item.kind].src} alt={congressBranding[item.kind].alt}
      width={56} height={56} unoptimized priority className="h-full w-full object-contain"/>
    </div>
    <div className="min-w-0 flex-1">
     <p className={"text-[10px] font-extrabold uppercase leading-[1.45] tracking-[.095em] "+theme.accentStrong}>
      {item.kind==="hoi_sinh_vien"?"HỘI SINH VIÊN VIỆT NAM":"ĐOÀN TNCS HỒ CHÍ MINH"}
     </p>
     <p className="mt-1 text-[9px] font-bold uppercase tracking-[.15em] text-[#678397]">THẺ ĐẠI BIỂU ĐIỆN TỬ</p>
    </div>
   </div>
   <div className="relative mt-5 border-t border-[#d8e1e7]/85 pt-4 text-center">
    <p className={"text-[9px] font-extrabold uppercase tracking-[.17em] "+theme.eyebrow}>ĐẠI HỘI</p>
    <h2 className="mx-auto mt-1.5 max-w-[320px] text-[17px] font-extrabold leading-[1.4] tracking-[-.025em] text-[#233b50] sm:text-[18px]">
     {item.congressName}
    </h2>
    {item.term&&<p className="mt-1.5 text-[11px] font-semibold leading-5 text-[#577487]">Nhiệm kỳ {item.term}</p>}
   </div>
  </header>
  <div className="relative -mt-9 flex flex-col items-center px-4 pb-5 sm:px-6">
   <div className={"relative overflow-hidden rounded-[13px] border-[5px] border-white bg-[#ecf4f8] shadow-[0_9px_25px_rgba(36,67,96,.16),0_0_0_1px_rgba(89,125,151,.16)] "+(item.kind==="hoi_sinh_vien"?"ring-1 ring-[#d7eaf5]":"ring-1 ring-[#f0d9d5]")}>
    {item.photoPath&&failedSrc!==photoUrl?<Image unoptimized
     src={photoUrl} onError={()=>setFailedSrc(photoUrl)}
     loading={priority?"eager":"lazy"} fetchPriority={priority?"high":undefined}
     width={128} height={170} alt={"Ảnh chân dung "+item.fullName}
     className="h-[min(43vw,163px)] w-[min(32vw,122px)] object-cover sm:h-[170px] sm:w-[128px]"/>:
     <div className="flex h-[min(43vw,163px)] w-[min(32vw,122px)] items-center justify-center bg-[#f1f5f8] text-[#96aaba] sm:h-[170px] sm:w-[128px]">
      <UserRound size={46} strokeWidth={1.45}/>
     </div>}
   </div>
   <div className="mt-4 w-full min-w-0 text-center">
    <span className={"inline-flex min-h-[28px] items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[.09em] "+theme.chip}>
     <span className={"h-[6px] w-[6px] rounded-full "+(item.kind==="hoi_sinh_vien"?"bg-[#1686b4]":"bg-[#c42b40]")}/>
     {roleLabel[item.delegateType]}
    </span>
    <h3 className="mt-3 break-words text-[clamp(21px,6vw,27px)] font-extrabold leading-[1.3] tracking-[-.018em] text-[#1e374c]">
     {item.fullName}
    </h3>
    {item.position&&<p className="mt-2 text-[12px] font-bold leading-5 text-[#506b7f]">{item.position}</p>}
    <p className="mt-1 break-words text-[12px] leading-5 text-[#7b91a0]">{item.unit||"Chưa cập nhật đơn vị"}</p>
   </div>
   <div className={"mt-5 flex w-full min-w-0 items-center justify-between gap-3 rounded-[13px] border px-4 py-3.5 "+theme.seat}>
    <div className="min-w-0">
     <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#7890a1]">VỊ TRÍ CHỖ NGỒI</p>
     <p className={"mt-1 break-words text-[17px] font-extrabold "+theme.accent}>
      {seat?.code||"Chưa phân ghế"}
     </p>
    </div>
    <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm "+theme.accent}>
     <Armchair size={23} strokeWidth={1.65}/>
    </span>
   </div>
   <div aria-hidden="true" className="premium-id-hologram absolute bottom-[133px] right-[24px] h-8 w-8 rounded-full border border-white/70 opacity-70 sm:right-[32px]"/>
   <div className="mt-5 w-full border-t border-dashed border-[#d4e1e8] pt-4 text-center">
    <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#627f92]">MÃ VẠCH ĐỊNH DANH</p>
    {item.barcodeCode?<div className="mt-2 flex w-full min-w-0 items-center justify-center overflow-hidden rounded-xl border border-[#edf0f1] bg-white px-2 py-2.5">
     <DelegateBarcode value={item.barcodeCode} width={1.12} height={48}/>
    </div>:<p className="mt-2 rounded-xl bg-[#fff5e8] p-3 text-xs text-[#916a3b]">Chưa cấp mã vạch.</p>}
   </div>
   <div className={"mt-4 h-[3px] w-full rounded-full "+theme.stripe} aria-hidden="true"/>
   <p className="mt-3 text-center text-[10px] font-semibold leading-5 tracking-[.04em] text-[#7c91a0]">
    THẺ DÀNH RIÊNG CHO ĐẠI BIỂU · KHÔNG CHUYỂN NHƯỢNG
   </p>
  </div>
 </article>;
}

/**
 * Fit-to-screen mode always shows the complete portrait, text and barcode.
 * Readable mode preserves original print-quality dimensions for zoom/scroll.
 */
function FullDelegatePassViewer({item,onClose}:{item:PortalDelegate;onClose:()=>void}){
 const [readable,setReadable]=useState(false);
 const [scale,setScale]=useState(1);
 const [measured,setMeasured]=useState(false);
 const stageRef=useRef<HTMLDivElement>(null);
 const cardRef=useRef<HTMLDivElement>(null);
 const closeRef=useRef<HTMLButtonElement>(null);

 useEffect(()=>{
  const previous=document.body.style.overflow;
  document.body.style.overflow="hidden";
  closeRef.current?.focus();
  const onKey=(e:KeyboardEvent)=>{
   if(e.key==="Escape"){e.preventDefault();onClose();}
  };
  window.addEventListener("keydown",onKey);
  return()=>{
   document.body.style.overflow=previous;
   window.removeEventListener("keydown",onKey);
  };
 },[onClose]);

 useLayoutEffect(()=>{
  if(readable)return;
  const stage=stageRef.current;
  const card=cardRef.current;
  if(!stage||!card)return;
  const recalculate=()=>{
   if(!card.offsetWidth||!card.offsetHeight)return;
   const next=calculateDelegatePassScale(stage.clientWidth,stage.clientHeight,
    card.offsetWidth,card.offsetHeight);
   setScale(previous=>Math.abs(previous-next)<0.002?previous:next);
   setMeasured(true);
  };
  const observer=new ResizeObserver(recalculate);
  observer.observe(stage);
  observer.observe(card);
  recalculate();
  return()=>observer.disconnect();
 },[item.id,readable]);

 return <div role="dialog" aria-modal="true" aria-labelledby="delegate-pass-viewer-title"
  className="fixed inset-0 z-[100] flex h-dvh flex-col overflow-hidden bg-[#e8eef4] print:hidden">
  <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#d1e0ea] bg-white px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] sm:px-6">
   <div className="min-w-0">
    <p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#4683a4]">THẺ ĐẠI BIỂU</p>
    <h2 id="delegate-pass-viewer-title" className="truncate text-[14px] font-extrabold text-[#203c5b]">{item.fullName}</h2>
   </div>
   <div className="flex shrink-0 items-center gap-2">
    <button type="button" aria-pressed={readable} onClick={()=>{setReadable(!readable);setMeasured(false);}}
     className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#cfdfe9] bg-[#f4f9fb] px-3 text-[11px] font-extrabold text-[#2a6686]">
     {readable?<Minimize2 size={16}/>:<Maximize2 size={16}/>}
     {readable?"Vừa màn hình":"Xem rõ"}
    </button>
    <button ref={closeRef} type="button" onClick={onClose} aria-label="Đóng chế độ xem toàn bộ thẻ"
     className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#1c3757] text-white">
     <X size={20}/>
    </button>
   </div>
  </div>
  {readable?
   <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-5 pb-[max(24px,env(safe-area-inset-bottom))] sm:px-5">
    <DelegatePass item={item} priority/>
   </div>:
   <div ref={stageRef} aria-label="Toàn bộ thẻ đại biểu, hiển thị trọn vẹn trên màn hình"
    className="relative min-h-0 w-full flex-1 overflow-hidden">
    <div ref={cardRef} className="absolute left-1/2 top-1/2 w-[386px] max-w-none"
     style={{
      transform:`translate(-50%, -50%) scale(${scale})`,
      transformOrigin:"center center",
      opacity:measured?1:0
     }}>
     <DelegatePass item={item} priority/>
    </div>
   </div>}
  <p className="shrink-0 border-t border-[#d1e0ea] bg-white px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 text-center text-[11px] leading-5 text-[#627d93]">
   {readable?"Cuộn dọc để đọc thông tin và quét barcode rõ hơn.":"Toàn bộ thẻ đã được thu vừa màn hình. Bấm Xem rõ để phóng to."}
  </p>
 </div>;
}

const actions=[
 {href:"/my-card/checkin",icon:Camera,label:"Điểm danh",detail:"Quét QR phiên"},
 {href:"/my-card/seats",icon:Armchair,label:"Chỗ ngồi",detail:"Sơ đồ hội trường"},
 {href:"/my-card/history",icon:History,label:"Lịch sử",detail:"Các lượt tham dự"},
 {href:"/my-card/documents",icon:BookOpen,label:"Tài liệu",detail:"Văn kiện Đại hội"},
 {href:"/my-card/bch",icon:Users,label:"Nhân sự BCH",detail:"Hồ sơ trích ngang"}
] as const;

export function MyDelegateCards({items,readOnly=false}:{items:PortalDelegate[];readOnly?:boolean}){
 const [viewer,setViewer]=useState<PortalDelegate|null>(null);
  const [selectedId,setSelectedId]=useState(items[0]?.id||"");
  const visible=items.filter(item=>item.id===selectedId);
 const closeViewer=useCallback(()=>setViewer(null),[]);
 const present=visible.reduce((sum,item)=>sum+item.history.length,0);
  const currentDelegate=visible[0];
  const selectedTheme=delegateTheme(currentDelegate?.kind||"doan");
  const currentSession=currentDelegate?activeSession(currentDelegate.sessions):undefined;
  const selectedCongressId=currentDelegate?.congressId||"";
  const selectedQuery="?congressId="+encodeURIComponent(selectedCongressId);
 return <div className="mx-auto grid w-full max-w-[970px] items-start gap-8 lg:grid-cols-[minmax(0,430px)_minmax(300px,1fr)] lg:gap-14">
  <div className="min-w-0 space-y-7">
    {items.length>1&&<label className="block rounded-xl border border-[#d7e4eb] bg-white p-4 shadow-sm">
     <span className="mb-2 block text-[12px] font-extrabold text-[#386480]">Chọn Đại hội để xem thẻ</span>
     <select className="field" value={selectedId} onChange={event=>setSelectedId(event.target.value)}>
      {items.map(item=><option key={item.id} value={item.id}>{item.congressName}</option>)}
     </select>
    </label>}
   {currentDelegate&&<section aria-label="Thao tác nhanh đại biểu" className="grid grid-cols-2 gap-2.5 lg:hidden print:hidden">
     <Link href="/my-card/checkin" prefetch={false} className={"flex min-h-[72px] items-center gap-3 rounded-xl px-3.5 font-semibold shadow-sm transition "+selectedTheme.cta}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15"><Camera size={21}/></span>
      <span className="min-w-0"><span className="block text-[13px] font-bold">Điểm danh</span><span className="mt-0.5 block text-[11px] text-white/85">Quét QR phiên</span></span>
     </Link>
     <Link href={"/my-card/seats"+(currentSession?"?sessionId="+encodeURIComponent(currentSession.id):"")}
      prefetch={false} className="flex min-h-[72px] items-center gap-3 rounded-xl border border-[#cbdfe9] bg-white px-3.5 text-[#235c77] shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e9f3f9]"><Armchair size={21}/></span>
      <span className="min-w-0"><span className="block text-[13px] font-bold">Ghế của tôi</span><span className="mt-0.5 block truncate text-[11px] text-[#6d8ea0]">{currentSession?.seat?.code||"Xem sơ đồ"}</span></span>
     </Link>
     <div className="col-span-2 grid grid-cols-3 gap-2 rounded-xl border border-[#dce7eb] bg-white p-2">
      {([{href:"/my-card/documents"+selectedQuery,label:"Tài liệu",icon:BookOpen},
        {href:"/my-card/bch"+selectedQuery,label:"Ứng viên BCH",icon:Users},
        {href:"/my-card/history",label:"Lịch sử",icon:History}] as const)
       .map(({href,label,icon:Icon})=><Link key={href} href={href} prefetch={false}
        className="flex min-h-[64px] min-w-0 flex-col items-center justify-center gap-1.5 rounded-lg bg-[#f4f8fb] px-1 text-center text-[11px] font-bold leading-[1.35] text-[#365d74]">
        <Icon size={19} strokeWidth={1.8}/><span>{label}</span>
       </Link>)}
     </div>
    </section>}
    {visible.map((item,index)=><div key={item.id} className="min-w-0">
    <div className="mx-auto mb-3 flex w-full max-w-[386px] items-stretch gap-2">
     <button type="button" onClick={()=>setViewer(item)}
      aria-label={"Xem toàn bộ thẻ vừa màn hình của "+item.fullName}
      className="flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-[#cbdfea] bg-white px-3 text-[12px] font-bold text-[#246d91] hover:bg-[#eff7fc]">
      <Maximize2 size={17}/> Xem toàn bộ thẻ
     </button>
     {!readOnly&&<Link href={"/print/delegate/"+item.id} target="_blank" rel="noopener noreferrer"
      aria-label={"Mở trang in thẻ đại biểu của "+item.fullName}
      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#cbdfea] bg-white px-3 text-[12px] font-bold text-[#246d91] hover:bg-[#eff7fc]">
      <Printer size={17}/> In thẻ
     </Link>}
    </div>
    <DelegatePass item={item} priority={index===0}/>
   </div>)}
  </div>
  <aside className="min-w-0 space-y-5 print:hidden lg:sticky lg:top-28">
   <div className="flex items-center justify-between gap-3">
    <div>
     <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#3e87a8]">CỔNG ĐẠI BIỂU</p>
     <h2 className="mt-1 text-[23px] font-extrabold tracking-[-.04em] text-[#1d4253]">Tiện ích tham dự</h2>
    </div>
    {currentDelegate&&!readOnly&&<Link href={"/print/delegate/"+currentDelegate.id} target="_blank" rel="noopener noreferrer"
     aria-label="In thẻ đại biểu" title="Mở trang in riêng một thẻ"
     className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d7e6e9] bg-white text-[#527889] hover:bg-[#f2f7f7]">
     <Printer size={19}/>
    </Link>}
   </div>
   <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
    {actions.map(({href,icon:Icon,label,detail},index)=><Link key={href} href={href} prefetch={false}
     className={"group flex min-h-[78px] items-center gap-3.5 rounded-[14px] border px-4 py-3.5 transition hover:-translate-y-0.5 hover:shadow-md "+
      (index===0?"border-transparent shadow-[0_12px_28px_rgba(16,113,106,.12)] "+selectedTheme.cta:
       "border-[#d7e4e8] bg-white text-[#284e60] shadow-sm")}>
     <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-xl "+(index===0?"bg-white/15":"bg-[#eaf2f9] text-[#0c789d]")}>
      <Icon size={21} strokeWidth={1.85}/>
     </span>
     <span className="min-w-0 flex-1">
      <span className="block text-[14px] font-extrabold">{label}</span>
      <span className={"mt-1 block text-[11px] font-medium "+(index===0?"text-white/85":"text-[#819ba7]")}>{detail}</span>
     </span>
     <ArrowUpRight size={18} className={index===0?"text-white/80":"text-[#94aab4] group-hover:text-[#187b71]"}/>
    </Link>)}
   </div>
   {present>0&&<div className="flex items-center gap-3 rounded-xl border border-[#d7e9e1] bg-[#eef5fa] px-4 py-3 text-[#23759a]">
    <CheckCircle2 size={19} className="shrink-0"/>
    <p className="text-[12px] font-bold">Đã có {present} lượt tham dự được ghi nhận.</p>
   </div>}
  </aside>
  {viewer&&<FullDelegatePassViewer item={viewer} onClose={closeViewer}/>}
 </div>;
}