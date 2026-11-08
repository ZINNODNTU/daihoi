"use client";
import {useEffect,useRef,useState} from "react";
import Image from "next/image";
import {ArrowLeft,ArrowRight,GraduationCap,MapPin,UserRound,Users} from "lucide-react";
import type {BchCandidate} from "@/lib/bch-candidates";

type Candidate=BchCandidate&{congressName:string};

export function DelegateBchCarousel({items}:{items:Candidate[]}){
 const scroller=useRef<HTMLDivElement>(null);
 const [active,setActive]=useState(0);

 // Each slide occupies exactly one viewport width. This guarantees that
 // the first/last card are centered on small screens, unlike snap-center
 // applied to cards narrower than the scrollable row.
 function move(index:number){
  const viewport=scroller.current;
  if(!viewport||!items.length)return;
  const next=Math.max(0,Math.min(index,items.length-1));
  setActive(next);
  viewport.scrollTo({left:next*viewport.clientWidth,behavior:"smooth"});
 }
 function scrollChanged(){
  const viewport=scroller.current;
  if(!viewport||!viewport.clientWidth)return;
  const next=Math.max(0,Math.min(items.length-1,
   Math.round(viewport.scrollLeft/viewport.clientWidth)));
  setActive(previous=>previous===next?previous:next);
 }
 useEffect(()=>{
  const onResize=()=>{
   const viewport=scroller.current;
   if(viewport)viewport.scrollTo({left:active*viewport.clientWidth,behavior:"instant"});
  };
  window.addEventListener("resize",onResize);
  return()=>window.removeEventListener("resize",onResize);
 },[active]);

 if(!items.length)return null;

 return <section aria-label="Các thẻ trích ngang nhân sự BCH" className="min-w-0 space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dae6ee] bg-white px-4 py-4 sm:px-6">
   <div className="min-w-0">
    <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#748c9e]">HỒ SƠ NHÂN SỰ GIỚI THIỆU</p>
    <p className="mt-1 text-[16px] font-extrabold text-[#1d3f60]" aria-live="polite" aria-atomic="true">
     Nhân sự {active+1} / {items.length}
    </p>
    <p className="mt-1 text-[11px] text-[#8296a6]">Vuốt ngang hoặc nhấn mũi tên để xem nhân sự khác</p>
   </div>
   <div className="hidden items-center gap-2 sm:flex">
    <button type="button" aria-label="Xem nhân sự trước" disabled={active===0} onClick={()=>move(active-1)}
     className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d4e3ea] bg-[#f7fafc] text-[#3a7190] transition hover:bg-[#edf4f9] disabled:cursor-not-allowed disabled:opacity-35">
     <ArrowLeft size={19}/>
    </button>
    <button type="button" aria-label="Xem nhân sự tiếp theo" disabled={active===items.length-1} onClick={()=>move(active+1)}
     className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#176b93] text-white transition hover:bg-[#0f587e] disabled:cursor-not-allowed disabled:opacity-35">
     <ArrowRight size={19}/>
    </button>
   </div>
  </div>

  <div className="relative mx-auto w-full max-w-[510px] min-w-0">
   <div ref={scroller} onScroll={scrollChanged} tabIndex={0}
    onKeyDown={e=>{
     if(e.key==="ArrowLeft"){e.preventDefault();move(active-1);}
     if(e.key==="ArrowRight"){e.preventDefault();move(active+1);}
    }}
    aria-label="Bộ thẻ nhân sự BCH. Dùng mũi tên trái và phải hoặc vuốt ngang."
    aria-roledescription="bộ thẻ vuốt ngang"
    className="flex w-full min-w-0 snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth pb-5 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    {items.map((item,index)=><div key={item.id} role="group" aria-roledescription="thẻ"
     aria-label={"Nhân sự "+(index+1)+" trong "+items.length}
     className="flex w-full min-w-0 shrink-0 snap-center justify-center px-2 sm:px-12">
     <article aria-label={"Hồ sơ "+item.full_name}
      className="w-full max-w-[390px] min-w-0 overflow-hidden rounded-[20px] border border-[#cbdde8] bg-white shadow-[0_12px_30px_rgba(23,59,85,.09)]">
      <header className="relative overflow-hidden bg-[#172a48] px-4 pb-12 pt-6 text-center text-white sm:px-5">
       <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full border-[25px] border-white/[.04]"/>
       <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#e2bf7f]">HỒ SƠ TRÍCH NGANG</p>
       <h2 className="mt-2 text-[15px] font-extrabold leading-6 text-white">NHÂN SỰ GIỚI THIỆU BCH</h2>
       <p className="mx-auto mt-1 max-w-[310px] text-[10px] leading-5 text-[#bed2df]">{item.congressName}</p>
      </header>
      <div className="relative -mt-9 px-4 pb-6 text-center sm:px-5">
       <div className="mx-auto flex h-[169px] w-[127px] overflow-hidden rounded-[11px] border-[4px] border-white bg-[#e9f1f6] shadow-[0_8px_24px_rgba(20,50,70,.16)]">
        {item.photo_path?<Image unoptimized loading={index===0?"eager":"lazy"}
         src={"/api/bch-candidates/"+item.id+"/photo"}
         width={127} height={169} alt={"Ảnh nhân sự "+item.full_name} className="h-full w-full object-cover"/>:
         <span className="flex h-full w-full items-center justify-center text-[#a1b4c3]"><UserRound size={43}/></span>}
       </div>
       <span className="mt-4 inline-flex rounded-full bg-[#edf4f9] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.08em] text-[#276b91]">ỨNG CỬ VIÊN BCH</span>
       <h3 className="mt-2 break-words text-[clamp(22px,5vw,26px)] font-extrabold leading-[1.18] tracking-[-.03em] text-[#213b59]">{item.full_name}</h3>
       <p className="mt-2 min-h-[34px] text-[12px] font-semibold leading-5 text-[#54728b]">{item.current_position}</p>
       <dl className="mt-5 divide-y divide-[#eaf0f4] rounded-[12px] border border-[#e0e9ef] bg-[#fafcfe] px-3 text-left sm:px-4">
        {([
         ["Năm sinh",String(item.birth_year)],["Quê quán",item.hometown],["Dân tộc",item.ethnicity],
         ["Trình độ",item.education_level],["Năm vào Đoàn",String(item.union_join_year)]
        ] as [string,string][]).map(([label,value])=><div key={label} className="grid grid-cols-[82px_minmax(0,1fr)] gap-3 py-3 text-[12px] sm:grid-cols-[94px_minmax(0,1fr)]">
         <dt className="font-semibold text-[#8397a7]">{label}</dt>
         <dd className="min-w-0 break-words font-bold leading-5 text-[#385971]">{value}</dd>
        </div>)}
       </dl>
       <div className="mt-4 flex items-center justify-between gap-2 text-[10px] font-semibold text-[#91a5b1]">
        <span className="inline-flex items-center gap-1"><MapPin size={13}/> Đại hội</span>
        <span className="inline-flex items-center gap-1"><GraduationCap size={13}/> Hồ sơ giới thiệu</span>
       </div>
      </div>
     </article>
    </div>)}
   </div>

   {/* These remain alongside the actual flashcard when the page header scrolls away. */}
   <button type="button" onClick={()=>move(active-1)} disabled={active===0}
    aria-label="Thẻ nhân sự trước" title="Nhân sự trước"
    className="absolute left-0 top-[170px] z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#d4e4ef] bg-white/95 text-[#176b93] shadow-[0_5px_18px_rgba(19,48,80,.16)] backdrop-blur-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 sm:top-[200px] sm:h-12 sm:w-12">
    <ArrowLeft size={20} strokeWidth={2.3}/>
   </button>
   <button type="button" onClick={()=>move(active+1)} disabled={active===items.length-1}
    aria-label="Thẻ nhân sự tiếp theo" title="Nhân sự tiếp theo"
    className="absolute right-0 top-[170px] z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#176b93] bg-[#176b93] text-white shadow-[0_5px_18px_rgba(19,48,80,.2)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 sm:top-[200px] sm:h-12 sm:w-12">
    <ArrowRight size={20} strokeWidth={2.3}/>
   </button>
  </div>

  <div className="mx-auto flex w-full max-w-[420px] items-center justify-between gap-3 px-2">
   <button type="button" onClick={()=>move(active-1)} disabled={active===0}
    className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-bold text-[#356f91] hover:bg-[#e8f2f8] disabled:cursor-not-allowed disabled:opacity-30">
    <ArrowLeft size={17}/> Trước
   </button>
   <span className="text-[12px] font-bold tabular-nums text-[#57738b]">{String(active+1).padStart(2,"0")} / {String(items.length).padStart(2,"0")}</span>
   <button type="button" onClick={()=>move(active+1)} disabled={active===items.length-1}
    className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-bold text-[#356f91] hover:bg-[#e8f2f8] disabled:cursor-not-allowed disabled:opacity-30">
    Tiếp <ArrowRight size={17}/>
   </button>
  </div>
  <div className="flex flex-wrap justify-center gap-2" aria-label="Chọn thẻ nhân sự">
   {items.map((item,i)=><button type="button" key={item.id} onClick={()=>move(i)}
    aria-label={"Xem nhân sự "+(i+1)} aria-current={i===active?"true":undefined}
    className={"h-2.5 rounded-full transition-all "+(i===active?"w-9 bg-[#1a739a]":"w-2.5 bg-[#c2d3df]")}/>)}
  </div>
  <p className="flex items-center justify-center gap-2 text-center text-[11px] text-[#8297a7]">
   <Users size={15}/> Thông tin do Ban Tổ chức giới thiệu và cung cấp.
  </p>
 </section>;
}
