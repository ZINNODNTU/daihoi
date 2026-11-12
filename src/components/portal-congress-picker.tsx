"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {ArrowRight,Check,ChevronDown,Landmark,LoaderCircle,Search,ShieldCheck,X} from "lucide-react";
import {BrandMark} from "@/components/brand-mark";

export type CongressChoice={
 id:string;name:string;term:string;status:string;kind:"doan"|"hoi_sinh_vien";asDelegate:boolean;asGuest:boolean;
};
type Props={options:CongressChoice[];activeId:string|null;variant?:"compact"|"welcome";previewBasePath?:string};

function normalize(value:string){
 return value.toLocaleLowerCase("vi").normalize("NFD")
  .replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").trim();
}
function CongressRow({item,selected,busy,onSelect}:{item:CongressChoice;selected:boolean;busy:boolean;onSelect:()=>void}){
 return <button type="button" onClick={onSelect} disabled={busy}
  aria-current={selected?"true":undefined}
  className={"group flex w-full min-h-[86px] items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087fae] disabled:opacity-60 "+
   (selected?"border-[#4c9bbd] bg-[#edf8fc] shadow-[0_0_0_1px_rgba(19,126,166,.08)]":
    "border-[#dce7ee] bg-white hover:border-[#95c5d8] hover:bg-[#f6fbfd]")}>
  <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-xl "+
   (selected?"bg-[#d2edf6] text-[#116e91]":"bg-[#edf3f7] text-[#61869b]")}>
   <BrandMark kind={item.kind} className="!h-11 !w-11 !border-0 !bg-transparent !p-0 !shadow-none"/>
  </span>
  <span className="min-w-0 flex-1">
   <span className="block break-words text-[13px] font-extrabold leading-[1.5] text-[#244760] sm:text-[14px]">{item.name}</span>
   <span className="mt-1 block text-[11px] leading-5 text-[#718d9e]">
    {item.term?"Nhiệm kỳ "+item.term+" · ":""}{item.asDelegate?"Đại biểu":"Khách mời"}
   </span>
   {selected&&<span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#157e74]"><Check size={14}/> Đang chọn</span>}
  </span>
  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#3985a5]">
   {busy?<LoaderCircle size={19} className="animate-spin"/>:
    selected?<Check size={19}/>:<ArrowRight size={19}/>}
  </span>
 </button>;
}

export function PortalCongressPicker({options,activeId,variant="compact",previewBasePath}:Props){
 const router=useRouter();
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const triggerRef=useRef<HTMLButtonElement>(null);
 const searchRef=useRef<HTMLInputElement>(null);
 const active=options.find(option=>option.id===activeId)||null;
 const filtered=useMemo(()=>{
  const term=normalize(query);
  return term?options.filter(option=>normalize(option.name+" "+option.term+
   " "+(option.asDelegate?"đại biểu":"khách mời")).includes(term)):options;
 },[options,query]);
 useEffect(()=>{
  if(!open)return;
  const prev=document.body.style.overflow;
  document.body.style.overflow="hidden";
  const focusId=window.setTimeout(()=>searchRef.current?.focus(),40);
  const onEscape=(event:KeyboardEvent)=>{
   if(event.key==="Escape"&&!busy){setOpen(false);triggerRef.current?.focus();return;}
   if(event.key!=="Tab")return;
   const container=document.getElementById("congress-select-dialog");
   if(!container)return;
   const focusable=[...container.querySelectorAll<HTMLElement>(
    'button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'
   )].filter(element=>element.getClientRects().length>0);
   if(!focusable.length)return;
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  document.addEventListener("keydown",onEscape);
  return()=>{
   window.clearTimeout(focusId);
   document.body.style.overflow=prev;
   document.removeEventListener("keydown",onEscape);
  };
 },[open,busy]);
 async function choose(congressId:string){
  if(!congressId||busy)return;
  if(congressId===activeId&&variant==="compact"){
   setOpen(false);return;
  }
  if(previewBasePath){
    setOpen(false);setQuery("");
    router.push(previewBasePath+"?congressId="+encodeURIComponent(congressId)+"&view=overview");
    return;
   }
   setBusy(true);setError("");
  try{
   const response=await fetch("/api/my-card/congress",{
    method:"POST",headers:{"Content-Type":"application/json"},
    credentials:"same-origin",cache:"no-store",body:JSON.stringify({congressId})
   });
   const data=await response.json().catch(()=>null);
   if(!response.ok||!data?.ok)throw new Error(data?.error||"Không thể chọn Đại hội.");
   setOpen(false);setQuery("");
   router.replace("/my-card");
   router.refresh();
  }catch(reason){
   setError(reason instanceof Error?reason.message:"Không thể kết nối máy chủ.");
  }finally{setBusy(false);}
 }
 const rows=<div className="grid gap-2.5 sm:grid-cols-2">
  {filtered.map(item=><CongressRow key={item.id} item={item} selected={activeId===item.id}
   busy={busy} onSelect={()=>void choose(item.id)}/>)}
  {!filtered.length&&<div className="col-span-full rounded-xl border border-dashed border-[#cddfe8] bg-[#f7fafc] p-6 text-center text-[13px] text-[#748e9c]">
   Không có Đại hội phù hợp với từ khóa. Hãy thử tìm theo tên hoặc nhiệm kỳ.
  </div>}
 </div>;
 const search=<label className="relative block">
  <span className="sr-only">Tìm kiếm Đại hội</span>
  <Search size={19} className="pointer-events-none absolute left-3.5 top-[15px] text-[#7e9baa]"/>
  <input ref={searchRef} value={query} onChange={event=>setQuery(event.target.value)}
   type="search" placeholder="Tìm tên Đại hội, nhiệm kỳ..."
   className="h-12 w-full rounded-xl border border-[#ccdfeb] bg-[#f8fbfd] pl-11 pr-4 text-[16px] text-[#254a62] outline-none focus:border-[#3996bb] focus:ring-2 focus:ring-[#d7f1fc]"/>
 </label>;
 if(variant==="compact"){
  return <div className="w-full min-w-0">
   <button ref={triggerRef} type="button" onClick={()=>{setOpen(true);setError("");setQuery("");}}
    aria-haspopup="dialog" aria-expanded={open} aria-controls="congress-select-dialog"
    className="portal-congress-button group flex min-h-[72px] w-full items-center gap-3 rounded-2xl border border-[#d1e2ed] bg-white px-3.5 py-3 text-left shadow-[0_4px_15px_rgba(27,70,101,.045)] transition hover:border-[#85b8cf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1786b0] sm:min-h-[76px] sm:px-4">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e9f3f9] text-[#1b799f]">{active?<BrandMark kind={active.kind} className="!h-11 !w-11 !border-0 !bg-transparent !p-0 !shadow-none"/>:<Landmark size={22}/>}</span>
    <span className="min-w-0 flex-1">
     <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-[.1em] text-[#416478]">ĐẠI HỘI ĐANG XEM</span>
     <span className="block break-words text-[13px] font-extrabold leading-[1.4] text-[#25485f] line-clamp-2 sm:text-[14px]">{active?.name||"Chọn Đại hội để bắt đầu"}</span>
    </span>
    <span className="flex min-h-10 shrink-0 items-center gap-1 rounded-xl bg-[#ecf5fa] px-2.5 text-[12px] font-extrabold text-[#1c729b] sm:px-3">
     Đổi <ChevronDown size={16}/>
    </span>
   </button>
   {error&&!open&&<p role="alert" className="mt-1.5 rounded-lg bg-red-50 p-2 text-[12px] text-red-700">{error}</p>}
   {open&&<>
    <button type="button" aria-label="Đóng bảng chọn Đại hội" className="fixed inset-0 z-[69] bg-[#132d42]/55 backdrop-blur-[2px]"
     onClick={()=>{if(!busy)setOpen(false);}}/>
    <section id="congress-select-dialog" role="dialog" aria-modal="true" aria-labelledby="congress-select-title"
     className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[min(89dvh,820px)] flex-col overflow-hidden rounded-t-[26px] border border-[#d2e2eb] bg-white shadow-[0_-18px_70px_rgba(11,37,58,.20)] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(710px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
     <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-[#d5e2e9] sm:hidden"/>
     <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e3edf3] px-4 pb-4 pt-5 sm:px-6">
      <div className="min-w-0">
       <p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#448baa]">CỔNG ĐẠI BIỂU</p>
       <h2 id="congress-select-title" className="mt-1 text-[21px] font-extrabold leading-[1.35] text-[#1a3d58]">Chọn Đại hội</h2>
       <p className="mt-1 text-[12px] text-[#738e9e]">{options.length} Đại hội có quyền truy cập</p>
      </div>
      <button type="button" disabled={busy} aria-label="Đóng chọn Đại hội"
       onClick={()=>{setOpen(false);triggerRef.current?.focus();}}
       className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#dbe6ed] bg-[#f7fafc] text-[#507388]"><X size={21}/></button>
     </div>
     <div className="shrink-0 px-4 pt-4 sm:px-6">{search}</div>
     {error&&<p role="alert" className="mx-4 mt-3 rounded-lg bg-red-50 p-3 text-[12px] text-red-700 sm:mx-6">{error}</p>}
     <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
      {rows}
     </div>
    </section>
   </>}
  </div>;
 }
 return <section className="mx-auto max-w-[920px]">
  <div className="rounded-3xl border border-[#d6e5ec] bg-white px-4 py-6 shadow-[0_8px_35px_rgba(25,56,82,.065)] sm:p-8">
   <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7f3f9] text-[#167ca3]"><Landmark size={27}/></span>
   <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#3286a9]">CỔNG ĐẠI BIỂU · KHÁCH MỜI</p>
   <h1 className="mt-2 text-[clamp(25px,5vw,35px)] font-extrabold leading-[1.35] tracking-[-.018em] text-[#1b3b57]">Chọn Đại hội của bạn</h1>
   <p className="mt-2 max-w-[700px] text-[13px] leading-6 text-[#688699]">
    Thẻ, vị trí ghế, tài liệu và BCH sẽ theo Đại hội đã chọn. Điểm danh, thông tin cá nhân và lịch sử dùng chung tài khoản.
   </p>
   <div className="mt-5">{search}</div>
   {error&&<p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-[12px] font-semibold text-red-700">{error}</p>}
   <div className="mt-4">{rows}</div>
   <p className="mt-5 flex items-center gap-2 text-[11px] leading-5 text-[#708a99]"><ShieldCheck size={16} className="shrink-0"/> Chỉ hiển thị Đại hội tài khoản của bạn có quyền tham dự.</p>
  </div>
 </section>;
}
