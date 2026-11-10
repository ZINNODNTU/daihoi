"use client";
import {useEffect,useMemo,useRef,useState,useTransition} from "react";
import {createPortal} from "react-dom";
import {useRouter} from "next/navigation";
import {Focus,Info,Layers3,Minus,Plus,MapPinned,RotateCw,Maximize2,X} from "lucide-react";
import type {MyHallMap,HallSeat} from "@/lib/delegate-seat-map";

type Choice={id:string;name:string;congressName:string};
const ZOOM_MIN=0.48,ZOOM_MAX=1.32;
function mapBounds(seats:HallSeat[]){
 if(!seats.length)return {minX:0,minY:0,maxX:1000,maxY:450};
 return {
  minX:Math.min(...seats.map(s=>s.x)),minY:Math.min(...seats.map(s=>s.y)),
  maxX:Math.max(...seats.map(s=>s.x)),maxY:Math.max(...seats.map(s=>s.y))
 };
}
function boundedZoom(value:number){
 return Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,Number(value.toFixed(2))));
}

export function DelegateSeatHall({map,choices}:{map:MyHallMap|null;choices:Choice[]}){
 const router=useRouter();
 const [pending,startTransition]=useTransition();
 const [zoom,setZoom]=useState(0.84);
 const [landscapeView,setLandscapeView]=useState(false);
 const scroller=useRef<HTMLDivElement>(null);
 const mine=useRef<HTMLDivElement>(null);
 const openButton=useRef<HTMLButtonElement>(null);
 const closeButton=useRef<HTMLButtonElement>(null);
 const overlay=useRef<HTMLDivElement>(null);
 const requestGeneration=useRef(0);
 const ownedFullscreen=useRef(false);
 const seats=useMemo(()=>map?.seats||[],[map]);
 const layout=map?.layout;
 const bounds=useMemo(()=>mapBounds(seats),[seats]);
 const positioned=useMemo(()=>seats.map(seat=>({
  ...seat,
  left:40+(seat.x-bounds.minX)*zoom,
  top:123+(seat.y-bounds.minY)*zoom
 })),[seats,bounds,zoom]);
 const tile=Math.max(25,Math.round(46*zoom));
 const mapWidth=Math.max(360,Math.ceil(40+(bounds.maxX-bounds.minX)*zoom+tile+35));
 const mapHeight=Math.max(290,Math.ceil(123+(bounds.maxY-bounds.minY)*zoom+tile+65));
 const found=seats.find(s=>s.id===map?.ownSeatId);
 const rowMarkers=useMemo(()=>{
  const unique=new Map<string,number>();
  for(const seat of positioned){
   if(!seat.row_label||unique.has(seat.row_label))continue;
   unique.set(seat.row_label,seat.top);
  }
  return [...unique.entries()].map(([label,top])=>({label,top}));
 },[positioned]);

 function focusMySeat(smooth=true){
  const area=scroller.current,seat=mine.current;
  if(!area||!seat)return;
  // Offset coordinates stay correct even when the mobile viewer is rotated with CSS.
  const drawing=seat.offsetParent as HTMLElement|null;
  const desiredX=(drawing?.offsetLeft||0)+seat.offsetLeft-area.clientWidth/2+seat.offsetWidth/2;
  const desiredY=(drawing?.offsetTop||0)+seat.offsetTop-area.clientHeight/2+seat.offsetHeight/2;
  area.scrollTo({left:Math.max(0,desiredX),top:Math.max(0,desiredY),
   behavior:smooth?"smooth":"instant"});
 }
 function fitLandscape(){
  const available=Math.max(window.innerWidth,window.innerHeight)-64;
  const span=bounds.maxX-bounds.minX;
  setZoom(boundedZoom(available/(span+130)));
 }
 function openLandscape(){
  setLandscapeView(true);
  fitLandscape();
  const generation=++requestGeneration.current;
  // iPhone Safari doesn't expose orientation.lock/fullscreen for arbitrary elements.
  // The CSS rotation is the reliable path, native landscape is progressive enhancement.
  if(document.fullscreenElement||!document.documentElement.requestFullscreen)return;
  void document.documentElement.requestFullscreen().then(async()=>{
   if(generation!==requestGeneration.current){
    if(document.fullscreenElement===document.documentElement)
     await document.exitFullscreen().catch(()=>{});
    return;
   }
   ownedFullscreen.current=true;
   const orientation=screen.orientation as ScreenOrientation & {
    lock?:(mode:"landscape")=>Promise<void>;
   };
   try{await orientation?.lock?.("landscape");}catch{/* CSS fallback works. */}
   if(generation!==requestGeneration.current){
    try{orientation?.unlock?.();}catch{}
    if(document.fullscreenElement===document.documentElement)
     await document.exitFullscreen().catch(()=>{});
    ownedFullscreen.current=false;
   }
  }).catch(()=>{/* CSS rotated landscape remains available. */});
 }
 function closeLandscape(){
  ++requestGeneration.current;
  setLandscapeView(false);
  try{screen.orientation?.unlock?.();}catch{}
  if(ownedFullscreen.current&&document.fullscreenElement===document.documentElement)
   void document.exitFullscreen().catch(()=>{});
  ownedFullscreen.current=false;
  requestAnimationFrame(()=>openButton.current?.focus());
 }
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>focusMySeat(false));
  return()=>cancelAnimationFrame(frame);
 // Center on the authenticated person's chair when changing layout, zoom or viewer mode.
 },[map?.session.id,zoom,landscapeView]);
 useEffect(()=>{
  if(!landscapeView)return;
  const oldOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  closeButton.current?.focus();
  const keydown=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){event.preventDefault();closeLandscape();}
   if(event.key!=="Tab")return;
   const items=overlay.current?.querySelectorAll<HTMLElement>(
    'button:not([disabled]),[tabindex="0"]'
   );
   if(!items?.length)return;
   const first=items[0],last=items[items.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  document.addEventListener("keydown",keydown);
  return()=>{
   document.body.style.overflow=oldOverflow;
   document.removeEventListener("keydown",keydown);
  };
 // The closing callback reads refs and current browser state, not React state.
 },[landscapeView]);
 useEffect(()=>()=> {
  ++requestGeneration.current;
  if(ownedFullscreen.current){
   try{screen.orientation?.unlock?.();}catch{}
   if(document.fullscreenElement===document.documentElement)
    void document.exitFullscreen().catch(()=>{});
   ownedFullscreen.current=false;
  }
 },[]);

 const controls=<div className="flex min-w-0 flex-wrap items-center gap-1.5">
  <button type="button" title="Thu nhỏ" aria-label="Thu nhỏ sơ đồ"
   onClick={()=>setZoom(z=>boundedZoom(z-0.12))} disabled={zoom<=ZOOM_MIN}
   className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d6e5e9] bg-white text-[#3c6676] disabled:opacity-40">
   <Minus size={17}/>
  </button>
  <span className="w-10 text-center text-[11px] font-extrabold tabular-nums text-[#6b8695]">{Math.round(zoom*100)}%</span>
  <button type="button" title="Phóng to" aria-label="Phóng to sơ đồ"
   onClick={()=>setZoom(z=>boundedZoom(z+0.12))} disabled={zoom>=ZOOM_MAX}
   className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d6e5e9] bg-white text-[#3c6676] disabled:opacity-40">
   <Plus size={17}/>
  </button>
  <button type="button" title="Định vị ghế của tôi" aria-label="Đưa ghế của tôi vào giữa màn hình"
   onClick={()=>focusMySeat()} disabled={!found}
   className="flex min-h-10 items-center gap-1.5 rounded-lg bg-[#007fae] px-3 text-xs font-extrabold text-white disabled:bg-[#b5c8cd]">
   <Focus size={16}/><span>Tìm ghế</span>
  </button>
  {landscapeView?
   <button ref={closeButton} type="button" onClick={closeLandscape} aria-label="Đóng chế độ xem ngang"
    className="flex min-h-10 items-center gap-1.5 rounded-lg border border-[#cbdfe7] bg-white px-3 text-xs font-extrabold text-[#31566d]">
    <X size={17}/> Đóng
   </button>:
   <button ref={openButton} type="button" onClick={openLandscape}
    aria-label="Xem ngang sơ đồ ghế toàn màn hình" title="Xem ngang toàn màn hình"
    className="flex min-h-10 items-center gap-1.5 rounded-lg border border-[#bbd7e7] bg-[#e9f5fa] px-3 text-xs font-extrabold text-[#126986] lg:hidden">
    <RotateCw size={16}/> Xem ngang <Maximize2 size={14}/>
   </button>}
 </div>;
 const hallPanel=layout?<section data-delegate-seat-map
  className="delegate-seat-panel overflow-hidden rounded-[20px] border border-[#d2e1e6] bg-white shadow-[0_15px_40px_rgba(17,58,73,.08)]">
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4ecef] bg-[#f9fbfc] px-3 py-3 sm:px-6 sm:py-4">
   <div className="min-w-0 flex-1">
    <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#469087]">BẢN ĐỒ HỘI TRƯỜNG</p>
    <h2 className="mt-1 truncate text-[16px] font-extrabold tracking-tight text-[#214759]">{layout.title}</h2>
    {!landscapeView&&<p className="mt-1 text-[11px] text-[#89a0aa]">{seats.length} vị trí · Vuốt ngang và dọc để xem sơ đồ</p>}
   </div>
   {controls}
  </div>
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#e8eef1] px-3 py-2.5 text-[11px] font-semibold text-[#69838e] sm:px-6">
   <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-[4px] bg-[#e5eff2] ring-1 ring-[#c4d6dd]"/> Ghế hội trường</span>
   <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-[4px] bg-[#f5ca72] ring-2 ring-[#b57b29]"/> Vị trí của bạn</span>
   <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-[4px] bg-[#a9bbc2]"/> Không sử dụng</span>
  </div>
  <div className="delegate-seat-scroll-region bg-[#eaf0f2] px-2 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
   <div ref={scroller} tabIndex={0} aria-label="Sơ đồ hội trường đầy đủ; cuộn ngang hoặc dọc để xem vị trí ghế"
    className="delegate-seat-scroller h-[min(55dvh,530px)] min-h-[290px] max-h-[610px] overflow-auto overscroll-contain rounded-[13px] border border-[#d2e1e6] bg-white p-2 shadow-inner sm:p-4">
    <div className="relative mx-auto" style={{width:mapWidth,height:mapHeight,minWidth:mapWidth}}>
     <div className="absolute left-1/2 top-4 flex h-12 w-[min(45%,300px)] -translate-x-1/2 items-center justify-center rounded-b-2xl border-x border-b border-[#bed4df] bg-[#deecf2] px-5 text-center text-[11px] font-extrabold uppercase tracking-[.14em] text-[#38687c] shadow-sm">
      {layout.stage_label||"SÂN KHẤU"}
     </div>
     <div className="absolute inset-x-8 top-[92px] h-px bg-gradient-to-r from-transparent via-[#dbe6e9] to-transparent"/>
     {rowMarkers.map(row=><span key={row.label}
      className="absolute left-0 flex h-8 w-8 items-center justify-center text-[10px] font-extrabold text-[#9aafb8]"
      style={{top:row.top}}>{row.label}</span>)}
     {positioned.map(seat=>{
      const highlighted=seat.id===map.ownSeatId;
      return <div key={seat.id} ref={highlighted?mine:undefined}
       data-my-seat={highlighted?"true":undefined}
       title={highlighted?"Ghế của bạn: "+seat.code:"Ghế "+seat.code}
       aria-label={highlighted?"Vị trí của bạn "+seat.code:undefined}
       className={"absolute flex items-center justify-center rounded-[5px] border text-center font-extrabold shadow-sm transition-colors "+(
        highlighted?"z-10 border-[#9a6621] bg-[#f4c666] text-[#62410c] ring-[3px] ring-[#ffdf96] shadow-[0_0_0_5px_rgba(212,146,35,.28)]":
        seat.blocked?"border-[#9cb1bb] bg-[#a9bdc5] text-[#647982]":
        "border-[#c8dce2] bg-[#e7f0f3] text-[#4c7182]"+
        (seat.seat_type==="guest"?" ring-1 ring-inset ring-[#ab91b9]":"")
       )} style={{left:seat.left,top:seat.top,width:tile,height:tile,
        fontSize:Math.max(9,Math.round(11*zoom))}}>
       {seat.blocked?"×":seat.seat_number}
      </div>;
     })}
    </div>
   </div>
  </div>
  <div className="delegate-seat-hint flex items-start gap-2 border-t border-[#e2ebee] bg-[#fbfcfc] px-4 py-3 text-[11px] leading-5 text-[#718d9a] sm:px-6">
   <Info size={16} className="mt-0.5 shrink-0 text-[#57909a]"/>
   <span>Ghế màu vàng là vị trí của bạn. Dùng <strong>Tìm ghế</strong> để định vị; dùng <strong>Xem ngang</strong> để mở sơ đồ toàn màn hình trên điện thoại.</span>
  </div>
 </section>:null;

 return <section className="min-w-0 space-y-4">
  <div className="flex flex-col gap-3 rounded-2xl border border-[#dce7eb] bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-5">
   <div className="min-w-0 flex-1">
    <label htmlFor="my-seat-session" className="text-[11px] font-extrabold uppercase tracking-[.1em] text-[#628293]">
     Sơ đồ hội trường theo phiên
    </label>
    <select id="my-seat-session" value={map?.session.id||""} disabled={pending||!choices.length}
     onChange={e=>startTransition(()=>router.replace("/my-card/seats?sessionId="+encodeURIComponent(e.target.value),{scroll:false}))}
     className="field mt-2 !min-h-[49px] w-full !rounded-xl">
     {choices.map(s=><option key={s.id} value={s.id}>{s.name} · {s.congressName}</option>)}
    </select>
    <p className="mt-2 text-[11px] text-[#7895a2]">{pending?"Đang tải sơ đồ phiên...":map?.congressName||"Chưa có phiên"}</p>
   </div>
   {map&&<div className="flex items-center gap-2 rounded-xl border border-[#cbddea] bg-[#edf4f9] px-4 py-2.5">
    <MapPinned size={21} className="shrink-0 text-[#1b7fa2]"/>
    <div>
     <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#53869d]">GHẾ CỦA BẠN</p>
     <p className="text-[17px] font-extrabold text-[#19759d]">{map.session.seat?.code||"Chưa phân ghế"}</p>
    </div>
   </div>}
  </div>
  {!layout?<div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-[#dbe7eb] bg-white px-6 text-center">
   <Layers3 size={36} className="text-[#9bb4bc]"/>
   <h2 className="mt-4 text-[17px] font-extrabold text-[#416679]">Phiên chưa có sơ đồ hội trường</h2>
   <p className="mt-2 max-w-[360px] text-[12px] leading-6 text-[#89a0ac]">Ban Tổ chức sẽ công bố vị trí ghế sau khi hoàn tất bố trí hội trường.</p>
  </div>:
   landscapeView?createPortal(
    <div ref={overlay} role="dialog" aria-modal="true" aria-label="Xem ngang sơ đồ ghế"
     className="delegate-seat-landscape">{hallPanel}</div>,document.body):
    hallPanel}
 </section>;
}
