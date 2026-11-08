 "use client";

 import Image from "next/image";
 import Link from "next/link";
 import {Armchair,CheckCircle2,Clock3,MapPin,Users,UserRound,LayoutGrid} from "lucide-react";
 import {classifySeat,computeLiveSummary,type LiveDashboardData,type LiveSeat,type LiveSeatState} from "@/lib/attendance-live";
 import {rowLabelAt,seatGridCellIndex,seatGridSizeValid} from "@/lib/seating";
 import {displayTime} from "@/lib/attendance-report";
 import {useMemo} from "react";

 const colors:Record<LiveSeatState,string>={
  present:"border-[#62cb9e] bg-[#b9ecd5] text-[#0b644b]",
  absent:"border-[#f0c075] bg-[#ffefce] text-[#8b622e]",
  unassigned:"border-[#cfdde4] bg-[#e7eef2] text-[#647e8e]",
  blocked:"border-[#536e7a] bg-[#42606a] text-[#a8c2cb]"
 };

 export function ProjectionWelcome({data,congressName}:{data:LiveDashboardData|null;congressName:string}){
 const latest=data?.checkins[0];
 const person=latest?data?.delegates.find(x=>x.id===latest.delegate_id):null;
 const seat=person?data?.seats.find(s=>
  data.assignments.some(a=>a.seat_id===s.id&&a.delegate_id===person.id)):null;
 const role=person?.delegate_type==="official"?"ĐẠI BIỂU CHÍNH THỨC":
  person?.delegate_type==="alternate"?"ĐẠI BIỂU DỰ KHUYẾT":"KHÁCH MỜI";
 return <section aria-label="Đại biểu vừa điểm danh"
  className="projection-welcome relative isolate min-w-0 overflow-hidden rounded-[22px] border border-[#416184] bg-[#152943] text-white shadow-[0_18px_48px_rgba(0,11,27,.22)]">
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_90%_10%,rgba(57,110,144,.34),transparent_42%),radial-gradient(ellipse_at_10%_98%,rgba(223,184,107,.11),transparent_45%)]"/>
  <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-32 h-[360px] w-[360px] rounded-full border-[44px] border-white/[.035]"/>
  <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#a87b37] via-[#e7cc89] to-[#318aaa]"/>
  <header className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5 sm:px-7">
   <span className="inline-flex items-center gap-2.5 text-[11px] font-extrabold uppercase tracking-[.14em] text-[#e9c98d]">
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d8b775]/45 bg-[#d2a75e]/10">
     <CheckCircle2 size={15} strokeWidth={2.4}/>
    </span>
    Chào mừng đại biểu
   </span>
   <span className="inline-flex items-center gap-2 rounded-full border border-[#77bdab]/25 bg-[#15785b]/20 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#9be7c7]">
    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#5de4af]"/> Theo thời gian thực
   </span>
  </header>
  {!person||!latest?
   <div className="relative flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 py-10 text-center sm:min-h-[270px]">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#ccaa70]/30 bg-white/[.07] text-[#e5c88e]">
     <Users size={31} strokeWidth={1.6}/>
    </div>
    <h3 className="mt-2 text-[clamp(20px,2.4vw,30px)] font-extrabold tracking-tight text-white">
     Trân trọng chào mừng đại biểu đến dự Đại hội
    </h3>
    <p className="max-w-[510px] text-[12px] leading-6 text-[#b1cbdb]">
     Khi có lượt điểm danh, chân dung, họ tên, đơn vị và vị trí ghế của đại biểu sẽ xuất hiện tại đây.
    </p>
   </div>:
   <div key={latest.id} className="projection-arrival relative grid min-h-[255px] items-center gap-5 px-5 py-5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-7 sm:px-7 sm:py-6 xl:grid-cols-[172px_minmax(0,1fr)] xl:gap-9">
    <div className="relative mx-auto w-[132px] sm:w-[150px] xl:w-[172px]">
     <div aria-hidden="true" className="absolute -inset-2 rounded-[22px] border border-[#dfbc7b]/30"/>
     <div className="relative aspect-[3/4] overflow-hidden rounded-[16px] border-[4px] border-[#e9d49f] bg-[#e8f1f5] shadow-[0_18px_32px_rgba(0,0,0,.25)]">
      {person.photo_path?<Image unoptimized
       src={"/api/delegates/"+person.id+"/photo?w=160"}
       width={172} height={228} loading="eager" fetchPriority="high"
       alt={"Ảnh chân dung "+person.full_name} className="h-full w-full object-cover"/>:
       <span className="flex h-full w-full items-center justify-center text-[#9db2be]">
        <UserRound size={50} strokeWidth={1.4}/>
       </span>}
     </div>
    </div>
    <div className="min-w-0 text-center sm:text-left">
     <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#e6bf7b]">
      <span className="h-px w-6 bg-[#d9b47c]"/> {role}
     </div>
     <h3 className="break-words text-[clamp(26px,3.9vw,55px)] font-black leading-[1.11] tracking-[-.045em] text-white [text-wrap:balance]">
      {person.full_name}
     </h3>
     <p className="mt-2 text-[12px] font-semibold leading-6 text-[#bcd3e1] sm:text-[14px]">
      Trân trọng chào mừng đến dự {congressName}
     </p>
     <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
      <span className="inline-flex max-w-full items-center gap-2 rounded-xl border border-white/15 bg-white/[.09] px-3.5 py-2.5 text-[12px] font-semibold text-[#e1edf3]">
       <Users size={16} className="shrink-0 text-[#e8c48a]"/>
       <span className="min-w-0 break-words">{person.unit||"Chưa cập nhật đơn vị"}</span>
      </span>
      <span className="inline-flex items-center gap-2 rounded-xl border border-[#e0b96e]/35 bg-[#d1a65e]/15 px-3.5 py-2.5 text-[12px] font-extrabold text-[#f0d493]">
       <MapPin size={16}/> Ghế {seat?seat.code:"chưa phân"}
      </span>
     </div>
     <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-[#aecad7] sm:justify-start">
      <span className="inline-flex items-center gap-1.5 font-bold text-[#9be7c6]"><CheckCircle2 size={16}/> Đã ghi nhận điểm danh</span>
      <span className="inline-flex items-center gap-1.5"><Clock3 size={14}/> {displayTime(latest.checked_in_at)}</span>
     </div>
    </div>
   </div>}
 </section>;
}

export function ProjectionSeatingMap({data,congressId,compact=false}:{
  data:LiveDashboardData|null;congressId:string;compact?:boolean
 }){
  const summary=data?computeLiveSummary(data):null;
  const layout=data?.layout;
  const size={rows:layout?.grid_rows||0,columns:layout?.grid_columns||0};
  const valid=seatGridSizeValid(size);
  const cells=useMemo(()=>{
   const m=new Map<number,LiveSeat>();
   if(!data?.layout||!seatGridSizeValid({
    rows:data.layout.grid_rows,columns:data.layout.grid_columns
   }))return m;
   for(const seat of data.seats){
    const i=seatGridCellIndex(seat,{
     rows:data.layout.grid_rows,columns:data.layout.grid_columns
    });
    if(i!==null)m.set(i,seat);
   }
   return m;
  },[data]);
  const assigned=new Map((data?.assignments||[]).map(a=>[a.seat_id,a.delegate_id]));
  const checked=new Set((data?.checkins||[]).map(c=>c.delegate_id));
  const lastDelegateId=data?.checkins[0]?.delegate_id||"";
  const latestSeatId=data?.assignments.find(a=>a.delegate_id===lastDelegateId)?.seat_id||"";
  const people=new Map((data?.delegates||[]).map(d=>[d.id,d]));
  const gridSeatIds=new Set([...cells.values()].map(s=>s.id));
   const outside=(data?.seats||[]).filter(s=>!gridSeatIds.has(s.id));
  return <section className="h-full min-w-0 overflow-hidden rounded-[20px] border border-white/15 bg-[#1b3048] shadow-[0_12px_34px_rgba(2,13,27,.13)]">
   <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
    <div>
     <h3 className="flex items-center gap-2 text-[16px] font-extrabold text-white"><LayoutGrid size={18} className="text-[#e4c58c]"/> SƠ ĐỒ HỘI TRƯỜNG</h3>
     <p className="mt-1 text-[11px] text-[#a5c8d0]">{layout?layout.title:"Chưa chọn sơ đồ ghế riêng cho phiên này"}</p>
    </div>
    <div className="flex flex-wrap items-center gap-3">
     <span className="rounded-full border border-[#6bc9a6]/25 bg-[#174d49] px-3 py-1.5 text-[12px] font-extrabold text-[#9af0c5]">
      {summary?.present||0} / {summary?.total||0} đại biểu có mặt
     </span>
     <span className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-extrabold text-white">{summary?.percentage||0}%</span>
    </div>
   </div>
   <div className="flex flex-wrap gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
    {([
     ["present","Đã đến"],["absent","Chưa đến"],
     ["unassigned","Ghế trống"],["blocked","Không sử dụng"]
    ] as [LiveSeatState,string][]).map(([key,label])=>
     <span key={key} className="flex items-center gap-1.5 text-[11px] text-[#d3e7ed]">
      <span className={"h-3.5 w-3.5 rounded-[4px] border "+colors[key]}/>{label}
     </span>)}
    <span className="text-[11px] text-[#a9c4ce]">Viền tím: khách mời</span>
   </div>
   {!layout?<div className="flex flex-col items-center justify-center gap-3 px-5 py-12 text-center text-[#bed4dc]">
    <Armchair size={34}/>
    <p className="text-[13px] font-semibold">Phiên này chưa được gắn sơ đồ hội trường.</p>
    <Link className="rounded-lg bg-white px-4 py-2 text-xs font-bold text-[#15516a]"
     href={"/congresses/"+congressId+"/attendance"}>Gắn sơ đồ trong Quản lý phiên →</Link>
   </div>:!valid?<p className="px-6 py-7 text-sm text-[#fad4b8]">Kích thước sơ đồ không hợp lệ. Kiểm tra trong mục Sơ đồ ghế.</p>:
   <div className="overflow-x-auto px-3 pb-5 sm:px-6" tabIndex={0}
    aria-label="Lưới sơ đồ ghế theo lượt điểm danh">
    <div className="mx-auto rounded-[16px] border border-[#c9d8e2] bg-[#f7fafc] p-3 shadow-[0_8px_24px_rgba(0,0,0,.12)] sm:p-5"
     style={{width:"max-content",minWidth:Math.min(410,size.columns*(compact?26:34)+66)}}>
     <p className="mx-auto mb-4 max-w-[300px] rounded-b-xl border-x border-b border-[#bfd3df] bg-[#dceaf1] px-5 py-2 text-center text-[11px] font-extrabold tracking-widest text-[#436e81]">
      {layout.stage_label||"SÂN KHẤU"}
     </p>
     <div className={compact?"grid gap-[3px]":"grid gap-1"} style={{
      gridTemplateColumns:"28px repeat("+size.columns+", "+(compact?"24px":"minmax(26px,34px)")+")"
     }}>
      <span/>
      {Array.from({length:size.columns},(_,c)=><span key={"column"+c}
       className="text-center text-[9px] font-bold text-[#93a7b2]">{c+1}</span>)}
      {Array.from({length:size.rows},(_,r)=><div key={"row"+r} className="contents">
       <span className="self-center text-center text-[10px] font-bold text-[#7192a2]">{rowLabelAt("A",r)}</span>
       {Array.from({length:size.columns},(_,c)=>{
        const seat=cells.get(r*size.columns+c);
        if(!seat)return <span key={c} className={(compact?"h-6":"h-7")+" rounded-[4px] bg-[#ecf1f4]"} aria-label="Lối đi"/>;
        const d=people.get(assigned.get(seat.id)||"");
        const state=classifySeat(seat,assigned.get(seat.id),checked);
        return <span key={c} title={seat.code+" · "+(d?.full_name||"Chưa phân")+
         " · "+(state==="present"?"Đã điểm danh":"Chưa điểm danh")}
         className={"flex items-center justify-center rounded-[4px] border font-extrabold "+
           (compact?"h-6 text-[8px] ":"h-7 text-[9px] ")+
          colors[state]+(seat.seat_type==="guest"?" ring-1 ring-inset ring-[#9066b8]":"")+
             (latestSeatId===seat.id?" relative z-[2] ring-[2px] ring-[#d39c37] shadow-[0_0_0_3px_rgba(222,165,74,.45)]":"")}>
         {seat.blocked?"×":seat.seat_number}
        </span>;
       })}
      </div>)}
     </div>
    </div>
    {outside.length>0&&<div className="mt-3 flex flex-wrap gap-2">
     {outside.map(seat=>{
      const state=classifySeat(seat,assigned.get(seat.id),checked);
      return <span key={seat.id} className={"rounded-md border px-2 py-1 text-[10px] font-bold "+colors[state]+
         (latestSeatId===seat.id?" ring-2 ring-[#d39c37]":"")}
       title={people.get(assigned.get(seat.id)||"")?.full_name||"Chưa phân"}>{seat.code}</span>;
     })}
    </div>}
   </div>}
   <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 px-5 py-3 text-[11px] font-semibold text-[#d3e5ea] sm:px-7">
    <span className="text-[#99ebc5]">Đã đến: {summary?.seats.present||0} ghế</span>
    <span className="text-[#f5d195]">Chưa đến: {summary?.seats.absent||0} ghế</span>
    <span className="text-[#accad2]">Ghế viền vàng: đại biểu vừa điểm danh.</span>
   </div>
  </section>;
 }