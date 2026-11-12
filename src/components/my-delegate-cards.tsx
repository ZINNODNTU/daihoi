"use client";
import Image from "next/image";
import {congressBranding} from "@/components/brand-mark";
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

function DelegatePass({item,priority}:{item:PortalDelegate;priority:boolean}){
 const session=activeSession(item.sessions);
 const seat=session?.seat;
 const photoUrl="/api/delegates/"+item.id+"/photo?w=160";
 const [failedSrc,setFailedSrc]=useState<string|null>(null);
 return <article aria-label={"Thẻ định danh của "+item.fullName}
  className="delegate-pass premium-delegate-id relative isolate mx-auto w-full min-w-0 max-w-[386px] overflow-hidden rounded-[23px] border border-[#c7d4e1] bg-[#fffefa] shadow-[0_26px_58px_rgba(22,50,83,.19),0_3px_9px_rgba(22,50,83,.07)]">
  <div aria-hidden="true" className="absolute inset-x-0 top-0 z-20 h-[5px] bg-gradient-to-r from-[#c93234] via-[#ddbd78] to-[#1882af]"/>
  <div aria-hidden="true" className="absolute left-1/2 top-[11px] z-20 h-[7px] w-[51px] -translate-x-1/2 rounded-full border border-white/40 bg-[#0c1930] shadow-inner"/>
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] bg-[linear-gradient(116deg,transparent_0%,rgba(255,255,255,.07)_23%,transparent_46%)] opacity-70"/>
  <span aria-hidden="true" className="premium-id-watermark">ĐẠI HỘI</span>
  <div className="relative overflow-hidden bg-[#17263f] px-4 pb-[46px] pt-8 text-white sm:px-6 sm:pb-[54px] sm:pt-9">
   <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full border-[44px] border-white/[.035]"/>
   <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-14 h-52 w-52 rounded-full border-[1px] border-white/15"/>
   <div className="relative flex items-center gap-3">
    <div className="flex h-[50px] w-[50px] shrink-0 sm:h-[56px] sm:w-[56px] items-center justify-center rounded-[10px] border border-white/15 bg-white p-1.5 shadow-[0_6px_18px_rgba(0,0,0,.12)]">
     <Image src={congressBranding[item.kind].src} alt={congressBranding[item.kind].alt}
      width={43} height={47} unoptimized priority className="h-full w-full object-contain"/>
    </div>
    <div className="min-w-0 flex-1">
     <p className="text-[10px] font-extrabold uppercase leading-[1.55] tracking-[.1em] text-[#eff9f8]">{item.kind==="hoi_sinh_vien"?"HỘI SINH VIÊN VIỆT NAM":"ĐOÀN TNCS HỒ CHÍ MINH"}</p>
     <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[.17em] text-[#a9cdd8]">THẺ ĐẠI BIỂU</p>
    </div>
   </div>
   <div className="relative mt-4 border-t border-white/20 pt-3 text-center">
    <h2 className="mx-auto max-w-[300px] text-[16px] font-extrabold leading-[1.34] tracking-[-.025em] text-white sm:text-[17px]">{item.congressName}</h2>
    {item.term&&<p className="mt-1 text-[10px] font-semibold text-[#b9d4dc]">Nhiệm kỳ {item.term}</p>}
   </div>
  </div>
  <div className="relative -mt-9 flex flex-col items-center px-3 pb-4 sm:px-6 sm:pb-5">
   <div className="overflow-hidden rounded-[9px] border-[5px] border-[#fffefa] bg-[#e6f1f3] shadow-[0_7px_22px_rgba(19,58,75,.15),0_0_0_1px_#cbdde3]">
    {item.photoPath&&failedSrc!==photoUrl?<Image unoptimized
     src={photoUrl} onError={()=>setFailedSrc(photoUrl)}
     loading={priority?"eager":"lazy"} fetchPriority={priority?"high":undefined}
     width={128} height={170} alt={"Ảnh chân dung "+item.fullName}
     className="h-[min(40vw,158px)] w-[min(30vw,119px)] object-cover sm:h-[168px] sm:w-[126px]"/>:
     <div className="flex h-[min(40vw,158px)] w-[min(30vw,119px)] items-center justify-center text-[#8da6b2] sm:h-[168px] sm:w-[126px]"><UserRound size={46} strokeWidth={1.5}/></div>}
   </div>
   <div className="mt-3 w-full min-w-0 text-center sm:mt-4">
    <span className="inline-flex items-center gap-1.5 border-b border-[#d7b17a] pb-1.5 text-[10px] font-extrabold tracking-[.1em] text-[#b53730]">
     {roleLabel[item.delegateType]}
    </span>
    <h3 className="mt-2.5 break-words text-[clamp(21px,6vw,27px)] font-extrabold leading-[1.3] tracking-[-.018em] text-[#192d49]">{item.fullName}</h3>
    {item.position&&<p className="mt-2 text-[11px] font-bold leading-5 text-[#4c6474]">{item.position}</p>}
    <p className="mt-1 break-words text-[11px] leading-5 text-[#7b909a]">{item.unit||"Chưa cập nhật đơn vị"}</p>
   </div>
   <div className="mt-3 flex w-full items-center sm:mt-4 justify-between gap-3 rounded-[9px] border border-[#e0e8e7] bg-[#f2f6fa] px-3.5 py-2.5">
    <div className="min-w-0">
     <p className="text-[9px] font-bold uppercase tracking-[.11em] text-[#8b9d9f]">CHỖ NGỒI</p>
     <p className="mt-0.5 text-[14px] font-extrabold text-[#176c99]">{seat?.code||"Chưa phân ghế"}</p>
    </div>
    <Armchair size={22} strokeWidth={1.6} className="shrink-0 text-[#197caa]"/>
   </div>
   <div aria-hidden="true" className="premium-id-hologram absolute bottom-[118px] right-[16px] h-9 w-9 rounded-full border border-[#aac1d4] opacity-75 sm:right-[24px]"/>
   <div className="mt-3 w-full border-t border-dashed sm:mt-4 border-[#cbd8dc] pt-4 text-center">
    <p className="text-[9px] font-extrabold uppercase tracking-[.18em] text-[#80939d]">BARCODE ĐỊNH DANH</p>
    {item.barcodeCode?<div className="mt-2 w-full min-w-0 overflow-hidden bg-white py-2">
     <DelegateBarcode value={item.barcodeCode} width={1.12} height={48}/>
    </div>:<p className="mt-2 rounded-lg bg-[#fff4e8] p-3 text-xs text-[#916a3b]">Chưa cấp mã vạch.</p>}
   </div>
   <div className="mt-3 h-[3px] w-full rounded-full bg-gradient-to-r from-[#d83129] via-[#dbb45d] to-[#187a56]"/>
   <p className="mt-2 text-center text-[9px] font-semibold tracking-[.04em] text-[#9aa9ad]">THẺ DÀNH RIÊNG CHO ĐẠI BIỂU · KHÔNG CHUYỂN NHƯỢNG</p>
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

export function MyDelegateCards({items}:{items:PortalDelegate[]}){
 const [viewer,setViewer]=useState<PortalDelegate|null>(null);
  const [selectedId,setSelectedId]=useState(items[0]?.id||"");
  const visible=items.filter(item=>item.id===selectedId);
 const closeViewer=useCallback(()=>setViewer(null),[]);
 const present=visible.reduce((sum,item)=>sum+item.history.length,0);
  const currentDelegate=visible[0];
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
     <Link href="/my-card/checkin" prefetch={false} className="flex min-h-[72px] items-center gap-3 rounded-xl bg-[#087fae] px-3.5 text-white shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15"><Camera size={21}/></span>
      <span className="min-w-0"><span className="block text-[13px] font-bold">Điểm danh</span><span className="mt-0.5 block text-[11px] text-[#d9eef8]">Quét QR phiên</span></span>
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
    <button type="button" onClick={()=>setViewer(item)}
     aria-label={"Xem toàn bộ thẻ đại biểu của "+item.fullName}
     className="mx-auto mb-3 flex min-h-11 w-full max-w-[386px] items-center justify-center gap-2 rounded-xl border border-[#cbdfea] bg-white px-4 text-[12px] font-extrabold text-[#246d91] shadow-sm transition hover:bg-[#eff7fc]">
     <Maximize2 size={17}/> Xem toàn bộ thẻ vừa màn hình
    </button>
    <DelegatePass item={item} priority={index===0}/>
   </div>)}
  </div>
  <aside className="min-w-0 space-y-5 print:hidden lg:sticky lg:top-28">
   <div className="flex items-center justify-between gap-3">
    <div>
     <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#3e87a8]">CỔNG ĐẠI BIỂU</p>
     <h2 className="mt-1 text-[23px] font-extrabold tracking-[-.04em] text-[#1d4253]">Tiện ích tham dự</h2>
    </div>
    <button type="button" onClick={()=>window.print()} aria-label="In thẻ đại biểu"
     className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d7e6e9] bg-white text-[#527889] hover:bg-[#f2f7f7]">
     <Printer size={19}/>
    </button>
   </div>
   <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
    {actions.map(({href,icon:Icon,label,detail},index)=><Link key={href} href={href} prefetch={false}
     className={"group flex min-h-[78px] items-center gap-3.5 rounded-[14px] border px-4 py-3.5 transition hover:-translate-y-0.5 hover:shadow-md "+
      (index===0?"border-[#0d719d] bg-[#0d719d] text-white shadow-[0_12px_28px_rgba(16,113,106,.17)]":
       "border-[#d7e4e8] bg-white text-[#284e60] shadow-sm")}>
     <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-xl "+(index===0?"bg-white/15":"bg-[#eaf2f9] text-[#0c789d]")}>
      <Icon size={21} strokeWidth={1.85}/>
     </span>
     <span className="min-w-0 flex-1">
      <span className="block text-[14px] font-extrabold">{label}</span>
      <span className={"mt-1 block text-[11px] font-medium "+(index===0?"text-[#cbefea]":"text-[#819ba7]")}>{detail}</span>
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