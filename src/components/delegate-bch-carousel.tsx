 "use client";

 import {useEffect,useRef,useState} from "react";
 import type {PointerEvent as ReactPointerEvent,MutableRefObject} from "react";
 import Image from "next/image";
 import {SwipeableCards} from "@daformat/react-swipeable-cards";
 import {ArrowLeft,ArrowRight,GraduationCap,MapPin,Search,UserRound,Users} from "lucide-react";
 import type {BchCandidate} from "@/lib/bch-candidates";

 type Candidate=BchCandidate&{congressName:string};
 type HorizontalDirection="left"|"right";

 function normalize(value:string){
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/gi,"d").toLowerCase();
 }

 export function DelegateBchCarousel({items,initialCongressId=""}:{items:Candidate[];initialCongressId?:string}){
  const [congressId,setCongressId]=useState(initialCongressId);
  const [query,setQuery]=useState("");
  const congresses=[...new Map(items.map(item=>[item.congress_id,{id:item.congress_id,name:item.congressName}])).values()];
  const match=normalize(query).trim();
  const filtered=items.filter(item=>(!congressId||item.congress_id===congressId)&&
   (!match||normalize(item.full_name+" "+item.current_position).includes(match)));
  return <div className="space-y-4">
   <section aria-label="Lọc danh sách nhân sự" className="rounded-2xl border border-[#dae6ee] bg-white p-3 sm:p-5">
    <div className="grid gap-3 sm:grid-cols-2">
     <label className="block"><span className="mb-2 block text-[12px] font-bold text-[#486b7e]">Tìm ứng viên</span>
      <div className="relative"><Search size={18} className="pointer-events-none absolute left-3.5 top-[15px] text-[#7e9ba9]"/>
       <input type="search" value={query} onChange={event=>setQuery(event.target.value)}
        placeholder="Tên hoặc chức vụ..." className="field !min-h-12 !rounded-xl !pl-11 !text-[14px]"/>
      </div>
     </label>
     {congresses.length>1&&<label className="block"><span className="mb-2 block text-[12px] font-bold text-[#486b7e]">Đại hội</span>
      <select className="field !min-h-12 !rounded-xl !text-[14px]" value={congressId}
       onChange={event=>setCongressId(event.target.value)}>
       <option value="">Tất cả Đại hội</option>
       {congresses.map(congress=><option key={congress.id} value={congress.id}>{congress.name}</option>)}
      </select>
     </label>}
    </div>
    <p className="mt-3 text-[12px] font-semibold text-[#577c91]" role="status">{filtered.length} / {items.length} ứng viên</p>
   </section>
   {filtered.length?<BchCandidateSlides key={congressId+"_"+query} items={filtered}/>:
    <div className="rounded-2xl border border-[#dae6ee] bg-white p-7 text-center">
     <p className="text-[14px] font-bold text-[#42657a]">Không tìm thấy ứng viên phù hợp.</p>
     <button type="button" className="mt-3 min-h-11 rounded-xl border border-[#cbdfe9] px-4 text-xs font-bold text-[#176b93]"
      onClick={()=>{setQuery("");setCongressId("");}}>Xóa bộ lọc</button>
    </div>}
  </div>;
 }

 function CandidateProfile({candidate,foreground}:{candidate:Candidate;foreground:boolean}){
  const facts:[string,string][]=[
   ["Năm sinh",String(candidate.birth_year||"—")],
   ["Quê quán",candidate.hometown||"—"],
   ["Dân tộc",candidate.ethnicity||"—"],
   ["Trình độ",candidate.education_level||"—"],
   ["Năm vào Đoàn",String(candidate.union_join_year||"—")]
  ];
  return <article aria-label={"Hồ sơ "+candidate.full_name}
   className="w-full min-w-0 overflow-hidden rounded-[20px] border border-[#cbdde8] bg-white shadow-[0_12px_30px_rgba(23,59,85,.11)]">
   <header className="relative overflow-hidden bg-[#172a48] px-4 pb-11 pt-5 text-center text-white sm:px-5 sm:pt-6">
    <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full border-[25px] border-white/[.04]"/>
    <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#e2bf7f]">HỒ SƠ TRÍCH NGANG</p>
    <h2 className="mt-2 text-[14px] font-extrabold leading-6 text-white sm:text-[15px]">NHÂN SỰ GIỚI THIỆU BCH</h2>
    <p className="mx-auto mt-1 max-w-[310px] text-[10px] leading-5 text-[#bed2df]">{candidate.congressName}</p>
   </header>
   <div className="relative -mt-8 px-3 pb-5 text-center sm:px-5 sm:pb-6">
    <div className="mx-auto flex h-[152px] w-[114px] overflow-hidden rounded-[11px] border-[4px] border-white bg-[#e9f1f6] shadow-[0_8px_24px_rgba(20,50,70,.16)] sm:h-[169px] sm:w-[127px]">
     {candidate.photo_path?<Image unoptimized loading={foreground?"eager":"lazy"}
      src={"/api/bch-candidates/"+candidate.id+"/photo?w=160"}
      width={127} height={169} alt={"Ảnh nhân sự "+candidate.full_name} draggable={false}
      className="h-full w-full object-cover"/>:
      <span className="flex h-full w-full items-center justify-center text-[#a1b4c3]"><UserRound size={43}/></span>}
    </div>
    <span className="mt-3 inline-flex rounded-full bg-[#edf4f9] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.08em] text-[#276b91]">ỨNG CỬ VIÊN BCH</span>
    <h3 className="mt-2 break-words text-[clamp(21px,5vw,26px)] font-extrabold leading-[1.18] tracking-[-.03em] text-[#213b59]">{candidate.full_name}</h3>
    <p className="mt-2 min-h-[34px] text-[12px] font-semibold leading-5 text-[#54728b]">{candidate.current_position}</p>
    <dl className="mt-4 divide-y divide-[#eaf0f4] rounded-[12px] border border-[#e0e9ef] bg-[#fafcfe] px-3 text-left sm:px-4">
     {facts.map(([label,value])=><div key={label} className="grid grid-cols-[86px_minmax(0,1fr)] gap-2 py-2.5 text-[12px] sm:grid-cols-[94px_minmax(0,1fr)] sm:gap-3 sm:py-3">
      <dt className="font-semibold text-[#8397a7]">{label}</dt>
      <dd className="min-w-0 break-words font-bold leading-5 text-[#385971]">{value}</dd>
     </div>)}
    </dl>
    <div className="mt-4 flex items-center justify-between gap-2 text-[10px] font-semibold text-[#91a5b1]">
     <span className="inline-flex items-center gap-1"><MapPin size={13}/> Đại hội</span>
     <span className="inline-flex items-center gap-1"><GraduationCap size={13}/> Hồ sơ giới thiệu</span>
    </div>
   </div>
  </article>;
 }

 // The library emits onSwipe when the outgoing animation begins, but only
 // mutates its stack once the animation has finished. Change the active candidate
 // at that second point to avoid cutting off the Tinder-like fly-out.
 function AdvanceWhenSwipeFinishes({pendingRef,onComplete}:{
  pendingRef:MutableRefObject<HorizontalDirection|null>;
  onComplete:(direction:HorizontalDirection)=>void;
 }){
  const stack=SwipeableCards.useSwipeableCardsStack();
  useEffect(()=>{
   if(stack.length===1&&pendingRef.current){
    const direction=pendingRef.current;
    pendingRef.current=null;
    onComplete(direction);
   }
  },[stack.length,pendingRef,onComplete]);
  return null;
 }

 function SwipeSurface({items,active,previewDirection,onPreview}:{
  items:Candidate[];active:number;previewDirection:HorizontalDirection;
  onPreview:(direction:HorizontalDirection)=>void;
 }){
  const {dragStateRef}=SwipeableCards.useSwipeableCardsContext();
  const pointerStart=useRef<{id:number;x:number}|null>(null);
  const fallback=previewDirection==="right"?items[active-1]:items[active+1];
  const preview=fallback||items[active+1]||items[active-1];
  const candidate=items[active];
  function start(event:ReactPointerEvent<HTMLDivElement>){
   if(!(event.target instanceof Element)||!event.target.closest('[data-swipeable-cards-top-card="true"]'))return;
   pointerStart.current={id:event.pointerId,x:event.clientX};
  }
  function moving(event:ReactPointerEvent<HTMLDivElement>){
   const start=pointerStart.current;
   if(!start||start.id!==event.pointerId)return;
   const dx=event.clientX-start.x;
   if(Math.abs(dx)>14){
    if(dx<0&&active<items.length-1)onPreview("left");
    if(dx>0&&active>0)onPreview("right");
   }
  }
  function cancel(){
   pointerStart.current=null;
   // The library does not listen for pointercancel (which happens during a
   // vertical page scroll), so explicitly release any unfinished drag.
   const gesture=dragStateRef.current;
   if(gesture.element){
    gesture.element.style.translate="";
    gesture.element.style.rotate="";
    gesture.element.style.transformOrigin="";
   }
   gesture.dragging=false;
   gesture.draggingId="";
   gesture.element=null;
  }
  return <SwipeableCards.Cards visibleStackLength={2}
   onPointerDownCapture={start}
   onPointerMoveCapture={moving}
   onPointerUpCapture={()=>{pointerStart.current=null;}}
   onPointerCancelCapture={cancel}
   className="bch-swipe-stack" aria-label="Vuốt ngang để chuyển hồ sơ nhân sự">
   {(stack)=>stack.map(card=><SwipeableCards.CardWrapper key={card.id} card={card}
    aria-hidden={card.id.startsWith("preview:")?"true":undefined}
    className="bch-swipe-card" data-bch-preview={card.id.startsWith("preview:")?"true":undefined}>
    <CandidateProfile candidate={card.id.startsWith("preview:")?(preview||candidate):candidate}
     foreground={!card.id.startsWith("preview:")}/>
   </SwipeableCards.CardWrapper>)}
  </SwipeableCards.Cards>;
 }

 function BchCandidateSlides({items}:{items:Candidate[]}){
  const [active,setActive]=useState(0);
  const [previewDirection,setPreviewDirection]=useState<HorizontalDirection>("left");
  const pending=useRef<HorizontalDirection|null>(null);
  const current=items[active];
  const canPrevious=active>0;
  const canNext=active<items.length-1;
  function completed(direction:HorizontalDirection){
   setActive(index=>Math.max(0,Math.min(items.length-1,index+(direction==="left"?1:-1))));
   setPreviewDirection("left");
  }
  // The last card in the input array is the topmost card in the library.
  const cards=[
   ...(items.length>1?[{id:"preview:"+current.id,card:<CandidateProfile candidate={items[active+1]||items[active-1]} foreground={false}/>}]:[]),
   {id:"active:"+current.id,card:<CandidateProfile candidate={current} foreground/>}
  ];
  return <section aria-label="Các thẻ trích ngang nhân sự BCH" className="min-w-0 space-y-4">
   <div className="rounded-2xl border border-[#dae6ee] bg-white px-3 py-3 sm:px-6 sm:py-4">
    <div className="flex items-center justify-between gap-3">
     <div className="min-w-0">
      <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#748c9e]">HỒ SƠ NHÂN SỰ GIỚI THIỆU</p>
      <p className="mt-1 text-[16px] font-extrabold text-[#1d3f60]" aria-live="polite" aria-atomic="true">
       Nhân sự {active+1} / {items.length}
      </p>
     </div>
     <span className="shrink-0 rounded-lg bg-[#eef5f9] px-3 py-1.5 text-[11px] font-bold tabular-nums text-[#366d8c]">
      {String(active+1).padStart(2,"0")} / {String(items.length).padStart(2,"0")}
     </span>
    </div>
    <div role="progressbar" aria-label="Tiến độ xem nhân sự" aria-valuemin={1} aria-valuemax={items.length} aria-valuenow={active+1}
     className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e5eef3]">
     <div className="h-full rounded-full bg-[#176b93] transition-[width] duration-300"
      style={{width:((active+1)/items.length*100)+"%"}}/>
    </div>
    <p className="mt-2 text-[11px] leading-5 text-[#71899b]">
     Vuốt trái để xem tiếp, vuốt phải để quay lại; có thể sử dụng các nút bên dưới.
    </p>
   </div>
   <SwipeableCards.Root
    key={current.id}
    cards={cards}
    emptyView={null}
    swipeDirections={canPrevious&&canNext?"horizontal":canNext?"left":canPrevious?"right":[]}
    swipeStyle="discard"
    onSwipe={(direction,cardId)=>{
     if(cardId==="active:"+current.id&&(direction==="left"||direction==="right")){
      pending.current=direction;
     }
    }}
    className="bch-swipe-root mx-auto w-full max-w-[440px] min-w-0 px-2 pt-3 sm:px-6"
   >
    <AdvanceWhenSwipeFinishes pendingRef={pending} onComplete={completed}/>
    <SwipeSurface items={items} active={active} previewDirection={previewDirection}
     onPreview={setPreviewDirection}/>
    <div className="mt-5 flex items-center justify-between gap-3 px-1" aria-label="Điều hướng thẻ nhân sự">
     <SwipeableCards.SwipeRightButton type="button" disabled={!canPrevious}
      onClick={()=>setPreviewDirection("right")}
      aria-label="Thẻ nhân sự trước"
      className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[#cbdfe9] bg-white px-3 text-[13px] font-bold text-[#176b93] shadow-sm transition-colors hover:bg-[#f1f7fb] disabled:cursor-not-allowed disabled:opacity-35">
      <ArrowLeft size={17}/> Trước
     </SwipeableCards.SwipeRightButton>
     <SwipeableCards.SwipeLeftButton type="button" disabled={!canNext}
      onClick={()=>setPreviewDirection("left")}
      aria-label="Thẻ nhân sự tiếp theo"
      className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#176b93] px-3 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-[#105b7e] disabled:cursor-not-allowed disabled:opacity-35">
      Tiếp <ArrowRight size={17}/>
     </SwipeableCards.SwipeLeftButton>
    </div>
   </SwipeableCards.Root>
   {items.length>8&&<label className="mx-auto block w-full max-w-[420px] px-3">
    <span className="mb-1.5 block text-[12px] font-semibold text-[#57738b]">Chuyển nhanh đến nhân sự</span>
    <select className="field !min-h-12 !rounded-xl" value={active}
     onChange={event=>{pending.current=null;setActive(Number(event.target.value));setPreviewDirection("left");}}>
     {items.map((item,index)=><option key={item.id} value={index}>{index+1}. {item.full_name}</option>)}
    </select>
   </label>}
   <p className="flex items-center justify-center gap-2 text-center text-[11px] text-[#8297a7]">
    <Users size={15}/> Thông tin do Ban Tổ chức giới thiệu và cung cấp.
   </p>
   <p className="text-center text-[11px] leading-5 text-[#8398a6]">
    Thao tác vuốt chỉ để xem hồ sơ, không phải biểu quyết hay đánh giá ứng viên.
   </p>
  </section>;
 }