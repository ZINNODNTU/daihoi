"use client";
import {useEffect,useMemo,useRef,useState,useTransition} from "react";
import {createPortal} from "react-dom";
import {useRouter} from "next/navigation";
import {Focus,Info,Layers3,Minus,Plus,MapPinned,RotateCw,Maximize2,X} from "lucide-react";
import {projectSeatGrid,rowLabelAt,seatGridSizeValid} from "@/lib/seating";
import type {MyHallMap,HallSeat} from "@/lib/delegate-seat-map";

type Choice={id:string;name:string;congressName:string};
const ZOOM_MIN=0.38,ZOOM_MAX=1.40;
function boundedZoom(value:number){
 return Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,Number(value.toFixed(2))));
}
function freeformBounds(seats:HallSeat[]){
 return {
  minX:Math.min(...seats.map(s=>s.x)),
  minY:Math.min(...seats.map(s=>s.y)),
  maxX:Math.max(...seats.map(s=>s.x)),
  maxY:Math.max(...seats.map(s=>s.y))
 };
}

export function DelegateSeatHall({map,choices,previewHref}:{map:MyHallMap|null;choices:Choice[];previewHref?:string}){
 const router=useRouter();
 const [pending,startTransition]=useTransition();
 const [zoom,setZoom]=useState(.58);
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
 // A single seat geometry is used by BTC, delegate portal and attendance projector.
 // Empty physical grid cells and central aisles remain visible to all three users.
 const projected=useMemo(()=>projectSeatGrid(
  {rows:layout?.grid_rows||0,columns:layout?.grid_columns||0},seats
 ),[layout?.grid_rows,layout?.grid_columns,seats]);
 const {size,cells,outside,seatNumbers}=projected;
 const valid=seatGridSizeValid(size);
 const gridVisible=valid&&(cells.size>0||seats.length===0);
 const tile=Math.max(20,Math.round(46*zoom));
 const gap=Math.max(3,Math.round(9*zoom));
 const labelWidth=Math.max(24,Math.round(36*zoom));
 const gridWidth=valid?labelWidth+size.columns*tile+size.columns*gap:380;
 const mapWidth=Math.max(320,gridWidth+30);
 const freeform=useMemo(()=>outside.length?freeformBounds(outside):null,[outside]);
 const freeformWidth=freeform?Math.max(380,Math.ceil((freeform.maxX-freeform.minX)*zoom+90)):380;
 const freeformHeight=freeform?Math.max(150,Math.ceil((freeform.maxY-freeform.minY)*zoom+110)):150;
 const found=seats.find(s=>s.id===map?.ownSeatId);
 const placed=Boolean(found&&(seatNumbers.has(found.id)||outside.some(seat=>seat.id===found.id)));
 const gridIndex=found?[...cells.entries()].find(([,seat])=>seat.id===found.id)?.[0]:undefined;
 const displayedSeatCode=found&&gridIndex!==undefined?
  found.zone+"-"+rowLabelAt("A",Math.floor(gridIndex/size.columns))+"-"+
   String(seatNumbers.get(found.id)).padStart(2,"0"):
  map?.session.seat?.code||"Chưa phân ghế";

 function focusMySeat(smooth=true){
  const area=scroller.current,seat=mine.current;
  if(!area||!seat)return;
  // Offset coordinates are invariant under the iOS CSS rotation fallback.
  // Accumulate ancestors so a freeform chair below the main grid also centers.
  let x=seat.offsetWidth/2,y=seat.offsetHeight/2;
  for(let node:HTMLElement|null=seat;node&&node!==area;node=node.offsetParent as HTMLElement|null){
   x+=node.offsetLeft;y+=node.offsetTop;
  }
  const desiredX=x-area.clientWidth/2,desiredY=y-area.clientHeight/2;
  area.scrollTo({left:Math.max(0,desiredX),top:Math.max(0,desiredY),
   behavior:smooth?"smooth":"instant"});
 }
 function fitLandscape(){
  // Fit physical columns, not min/max occupied coordinates: empty/aisle cells count.
  const available=Math.max(window.innerWidth,window.innerHeight)-80;
  const natural=gridVisible?36+size.columns*55:freeformWidth;
  setZoom(boundedZoom(available/natural));
 }
 function openLandscape(){
  setLandscapeView(true);
  fitLandscape();
  const generation=++requestGeneration.current;
  if(document.fullscreenElement||!document.documentElement.requestFullscreen)return;
  void document.documentElement.requestFullscreen().then(async()=>{
   if(generation!==requestGeneration.current){
    if(document.fullscreenElement===document.documentElement)
     await document.exitFullscreen().catch(()=>{});
    return;
   }
   ownedFullscreen.current=true;
   // CSS fallback works on iOS Safari if screen orientation lock is unavailable.
   const orientation=screen.orientation as ScreenOrientation&{lock?:(mode:"landscape")=>Promise<void>};
   try{await orientation?.lock?.("landscape");}catch{}
   if(generation!==requestGeneration.current){
    try{orientation?.unlock?.();}catch{}
    if(document.fullscreenElement===document.documentElement)
     await document.exitFullscreen().catch(()=>{});
    ownedFullscreen.current=false;
   }
  }).catch(()=>{/* CSS rotation still works. */});
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
  // Fit the complete physical hall on laptops/tablets instead of clipping its
  // last columns. Phones keep a readable zoom and use swipe/landscape mode.
  const area=scroller.current;
  if(landscapeView||!gridVisible||!area||area.clientWidth<720)return;
  const target=boundedZoom(Math.min(.88,(area.clientWidth-85)/(36+size.columns*55)));
  setZoom(target);
 },[layout?.id,size.columns,gridVisible,landscapeView]);
 useEffect(()=>{
  const frame=requestAnimationFrame(()=>focusMySeat(false));
  return()=>cancelAnimationFrame(frame);
 },[map?.session.id,zoom,landscapeView]);
 useEffect(()=>{
  if(!landscapeView)return;
  const oldOverflow=document.body.style.overflow;
  document.body.style.overflow="hidden";
  closeButton.current?.focus();
  const keydown=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){event.preventDefault();closeLandscape();}
   if(event.key!=="Tab")return;
   const items=overlay.current?.querySelectorAll<HTMLElement>('button:not([disabled]),[tabindex="0"]');
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
 },[landscapeView]);
 useEffect(()=>()=>{
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
   onClick={()=>focusMySeat()} disabled={!placed}
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
    {!landscapeView&&<p className="mt-1 text-[11px] text-[#89a0aa]">{seats.length} ghế · {valid?size.rows+" hàng × "+size.columns+" vị trí":"Sơ đồ tự do"} · Vuốt để xem toàn bộ</p>}
   </div>
   {controls}
  </div>
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-[#e8eef1] px-3 py-2.5 text-[11px] font-semibold text-[#69838e] sm:px-6">
   <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-[4px] bg-[#e5eff2] ring-1 ring-[#c4d6dd]"/> Ghế hội trường</span>
   <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-[4px] bg-[#f5ca72] ring-2 ring-[#b57b29]"/> Vị trí của bạn</span>
   <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-[4px] bg-[#f0f4f6] ring-1 ring-[#e0e8ed]"/> Lối đi / ô trống</span>
   <span className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-[4px] bg-[#a9bbc2]"/> Không sử dụng</span>
  </div>
  <div className="delegate-seat-scroll-region bg-[#eaf0f2] px-2 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
   <div ref={scroller} tabIndex={0} aria-label="Sơ đồ hội trường đầy đủ; cuộn ngang hoặc dọc để xem vị trí ghế"
    className="delegate-seat-scroller relative h-[min(55dvh,530px)] min-h-[290px] max-h-[610px] overflow-auto overscroll-contain rounded-[13px] border border-[#d2e1e6] bg-white p-2 shadow-inner sm:p-4">
    {gridVisible&&<div className="relative mx-auto pb-5" style={{width:mapWidth,minWidth:mapWidth}}>
     <div className="mx-auto mb-7 flex h-11 w-[min(46%,300px)] items-center justify-center rounded-b-xl border-x border-b border-[#bed4df] bg-[#deecf2] px-3 text-center text-[11px] font-extrabold uppercase tracking-[.12em] text-[#38687c] shadow-sm">
      {layout.stage_label||"SÂN KHẤU"}
     </div>
     <div data-physical-seat-grid className="relative grid" style={{
      width:gridWidth,
      gridTemplateColumns:labelWidth+"px repeat("+size.columns+", "+tile+"px)",
      columnGap:gap,rowGap:Math.max(5,Math.round(14*zoom))
     }}>
      {Array.from({length:size.rows},(_,r)=><div key={r} className="contents">
       <span className="flex items-center justify-center text-[10px] font-extrabold text-[#7592a2]">{rowLabelAt("A",r)}</span>
       {Array.from({length:size.columns},(_,c)=>{
        const seat=cells.get(r*size.columns+c);
        if(!seat)return <span key={c} title="Lối đi / ô trống" aria-hidden="true"
         className="rounded-[5px] border border-[#ecf0f2] bg-[#f0f4f6]" style={{height:tile,width:tile}}/>;
        const highlighted=seat.id===map.ownSeatId;
        const displayNumber=seatNumbers.get(seat.id)??seat.seat_number;
        return <div key={seat.id} ref={highlighted?mine:undefined}
         data-my-seat={highlighted?"true":undefined}
         title={highlighted?"Ghế của bạn — hàng "+rowLabelAt("A",r)+", số "+displayNumber:"Hàng "+rowLabelAt("A",r)+" · Ghế "+displayNumber}
         aria-label={highlighted?"Vị trí của bạn: hàng "+rowLabelAt("A",r)+", ghế "+displayNumber:undefined}
         className={"relative flex items-center justify-center rounded-[5px] border text-center font-extrabold tabular-nums shadow-sm "+(
          highlighted?"z-10 border-[#a06b25] bg-[#f4c666] text-[#62410c] ring-[2px] ring-[#ffdf96] shadow-[0_0_0_4px_rgba(212,146,35,.25)]":
          seat.blocked?"border-[#9cb1bb] bg-[#a9bdc5] text-[#647982]":
          "border-[#c8dce2] bg-[#e7f0f3] text-[#4c7182]"+
          (seat.seat_type==="guest"?" ring-1 ring-inset ring-[#ab91b9]":"")
         )} style={{width:tile,height:tile,fontSize:Math.max(9,Math.round(11*zoom))}}>
         {seat.blocked?"×":displayNumber}
        </div>;
       })}
      </div>)}
     </div>
     <p className="mt-6 text-center text-[9px] font-extrabold uppercase tracking-[.16em] text-[#8ba1ab]">LỐI VÀO · CUỐI HỘI TRƯỜNG</p>
    </div>}
    {outside.length>0&&<div className="relative mx-auto mt-4 border-t border-[#e5ecef] pt-5"
     style={{width:gridVisible?Math.max(mapWidth,freeformWidth):freeformWidth}}>
     <p className="mb-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#718c9a]">
      {gridVisible?"Khu ghế bố trí ngoài lưới":"Sơ đồ ghế bố trí tự do"} · {outside.length} ghế
     </p>
     {!gridVisible&&<div className="mx-auto mb-5 flex h-11 w-[min(46%,300px)] items-center justify-center rounded-b-xl border-x border-b border-[#bed4df] bg-[#deecf2] px-3 text-center text-[11px] font-extrabold uppercase tracking-[.12em] text-[#38687c]">{layout.stage_label||"SÂN KHẤU"}</div>}
     {freeform&&<div className="relative rounded-xl border border-[#dce7ec] bg-[#f9fcfd]" style={{height:freeformHeight,width:freeformWidth}}>
      {outside.map(seat=>{
       const highlighted=seat.id===map.ownSeatId;
       return <div key={seat.id} ref={highlighted?mine:undefined}
        data-my-seat={highlighted?"true":undefined}
        title={highlighted?"Ghế của bạn: "+seat.code:"Ghế "+seat.code}
        className={"absolute flex items-center justify-center rounded-[5px] border text-[10px] font-extrabold "+(
         highlighted?"z-10 border-[#a06b25] bg-[#f4c666] text-[#62410c] ring-[2px] ring-[#ffdf96]":
         seat.blocked?"border-[#9cb1bb] bg-[#a9bdc5] text-[#647982]":
         seat.seat_type==="guest"?"border-[#ab91b9] bg-[#eee7f8] text-[#76569c]":
         "border-[#c8dce2] bg-[#e7f0f3] text-[#4c7182]"
        )} style={{
         left:25+(seat.x-freeform.minX)*zoom,
         top:30+(seat.y-freeform.minY)*zoom,
         width:tile,height:tile
        }}>{seat.blocked?"×":seat.seat_number}</div>;
      })}
     </div>}
    </div>}
   </div>
  </div>
  <div className="delegate-seat-hint flex items-start gap-2 border-t border-[#e2ebee] bg-[#fbfcfc] px-4 py-3 text-[11px] leading-5 text-[#718d9a] sm:px-6">
   <Info size={16} className="mt-0.5 shrink-0 text-[#57909a]"/>
   <span>Sơ đồ giữ nguyên lối đi và ô trống như trong trang quản trị. Ghế vàng là vị trí của bạn. Chọn <strong>Tìm ghế</strong> để định vị hoặc <strong>Xem ngang</strong> trên điện thoại.</span>
  </div>
 </section>:null;

 return <section className="min-w-0 space-y-4">
  <div className="flex flex-col gap-3 rounded-2xl border border-[#dce7eb] bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-5">
   <div className="min-w-0 flex-1">
    <label htmlFor="my-seat-session" className="text-[11px] font-extrabold uppercase tracking-[.1em] text-[#628293]">
     Sơ đồ hội trường theo phiên
    </label>
    <select id="my-seat-session" value={map?.session.id||""} disabled={pending||!choices.length}
     onChange={e=>startTransition(()=>router.replace((previewHref||"/my-card/seats?sessionId=")+encodeURIComponent(e.target.value),{scroll:false}))}
     className="field mt-2 !min-h-[49px] w-full !rounded-xl">
     {choices.map(s=><option key={s.id} value={s.id}>{s.name} · {s.congressName}</option>)}
    </select>
    <p className="mt-2 text-[11px] text-[#7895a2]">{pending?"Đang tải sơ đồ phiên...":map?.congressName||"Chưa có phiên"}</p>
   </div>
   {map&&<div className="flex items-center gap-2 rounded-xl border border-[#cbddea] bg-[#edf4f9] px-4 py-2.5">
    <MapPinned size={21} className="shrink-0 text-[#1b7fa2]"/>
    <div>
     <p className="text-[10px] font-bold uppercase tracking-[.08em] text-[#53869d]">GHẾ CỦA BẠN</p>
     <p className="text-[17px] font-extrabold text-[#19759d]">{displayedSeatCode}</p>
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
