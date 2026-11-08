"use client";
import {Fragment,useMemo,useRef,useState,useEffect} from "react";
import {
 Armchair,Check,Grid2X2,LockKeyhole,MousePointer2,Paintbrush,
 RotateCcw,Route,Rows3,ScanEye,Users,UserRound
} from "lucide-react";
import {
 rowLabelAt,seatGridCellIndex,seatGridSizeValid,
 type SeatDraft,type SeatGridPreset,type SeatGridSize,type SeatType
} from "@/lib/seating";

type Tool="toggle"|"paint"|"erase"|"inspect";
type Props={
 seats:SeatDraft[];assignedSeatIds:ReadonlySet<string>;
 stageLabel:string;selectedSeatId:string;editable:boolean;
 rows:number;columns:number;
 onResize:(size:SeatGridSize)=>void;
 onPaint:(row:number,column:number,active:boolean,seatType:SeatType)=>void;
 onSelect:(id:string)=>void;onPreset:(preset:SeatGridPreset,seatType:SeatType)=>void;
};
const commands:{tool:Tool;label:string;icon:typeof MousePointer2}[]=[
 {tool:"toggle",label:"Chọn / bỏ ghế",icon:MousePointer2},
 {tool:"paint",label:"Tô ghế",icon:Paintbrush},
 {tool:"erase",label:"Tạo lối đi",icon:Route},
 {tool:"inspect",label:"Chọn người ngồi",icon:ScanEye}
];
export function SeatGridCanvas({
 seats,assignedSeatIds,stageLabel,selectedSeatId,editable,
 rows,columns,onResize,onPaint,onSelect,onPreset
}:Props){
 const [tool,setTool]=useState<Tool>("toggle");
 const [seatType,setSeatType]=useState<SeatType>("delegate");
 const [draftRows,setDraftRows]=useState(String(rows));
 const [draftColumns,setDraftColumns]=useState(String(columns));
 const [sizeError,setSizeError]=useState("");
 const stroke=useRef<{active:boolean,type:SeatType}|null>(null);
 const ignoreClick=useRef(false);
 const total=rows*columns;
 useEffect(()=>{
   const clear=()=>{stroke.current=null;};
   window.addEventListener("pointerup",clear);
   window.addEventListener("pointercancel",clear);
   window.addEventListener("blur",clear);
   return()=>{
     window.removeEventListener("pointerup",clear);
     window.removeEventListener("pointercancel",clear);
     window.removeEventListener("blur",clear);
   };
 },[]);
 const cells=useMemo(()=>{
   const result=new Map<number,SeatDraft>();
   seats.forEach(seat=>{
     const index=seatGridCellIndex(seat,{rows,columns});
     if(index!==null)result.set(index,seat);
   });
   return result;
 },[seats,rows,columns]);
 const outsideCount=seats.length-cells.size;
 const guestCount=[...cells.values()].filter(s=>s.seatType==="guest").length;
 const assignedCount=[...cells.values()].filter(s=>assignedSeatIds.has(s.id)).length;
 function resize(){
   const next={rows:Number(draftRows),columns:Number(draftColumns)};
   if(!seatGridSizeValid(next)){
     setSizeError("Nhập từ 1–25 hàng, 1–30 cột, tối đa 500 ô.");return;
   }
   setSizeError("");
   onResize(next);
 }
 function apply(row:number,column:number,desired?:boolean,type:SeatType=seatType){
   const seat=cells.get(row*columns+column);
   if(!editable||tool==="inspect"){
     if(seat)onSelect(seat.id);
     return;
   }
   const active=desired??(tool==="paint"?true:tool==="erase"?false:!seat);
   onPaint(row,column,active,type);
 }
 return <div className="seat-grid-studio">
   <div className="border-b border-[#dfe7ee] bg-white p-4 sm:p-5">
     <div className="flex flex-wrap items-start justify-between gap-4">
       <div>
         <div className="flex items-center gap-2 text-[#24445e]">
           <Grid2X2 size={19}/><h3 className="text-[15px] font-bold">Canvas sơ đồ hội trường</h3>
           <span className="rounded-full bg-[#e5f3fb] px-2 py-0.5 text-[11px] font-bold text-[#0875ad]">
             {rows} × {columns} ô
           </span>
         </div>
         <p className="mt-2 text-xs leading-6 text-[#687f91]">
           Nhập số hàng, số cột theo mặt bằng thực tế; chọn ô để đặt ghế,
           bỏ ô để tạo lối đi. Ô trống không được tính là ghế.
         </p>
       </div>
       <div className="flex gap-2">
         {[
           {label:"Số ô",value:total},
           {label:"Ghế",value:cells.size},
           {label:"Lối đi / trống",value:total-cells.size}
         ].map(x=><div key={x.label} className="rounded-lg border border-[#e4ebf0] bg-[#f7fafc] px-3 py-2 text-center">
           <div className="text-xl font-bold tabular-nums text-[#205273]">{x.value}</div>
           <div className="text-[10px] font-semibold text-[#8192a2]">{x.label}</div>
         </div>)}
       </div>
     </div>
     {editable&&<div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-[#d5e8f4] bg-[#f2f8fc] p-3">
       <label className="min-w-[100px] flex-1"><span className="block text-xs font-bold text-[#3a617b]">Số hàng</span>
         <input className="field mt-1.5" type="number" min={1} max={25}
           value={draftRows} onChange={e=>{setDraftRows(e.target.value);setSizeError("");}}/>
       </label>
       <label className="min-w-[100px] flex-1"><span className="block text-xs font-bold text-[#3a617b]">Số cột / hàng</span>
         <input className="field mt-1.5" type="number" min={1} max={30}
           value={draftColumns} onChange={e=>{setDraftColumns(e.target.value);setSizeError("");}}/>
       </label>
       <button className="btn btn-primary !min-h-[42px]" type="button" onClick={resize}>
         <Grid2X2 size={16}/> Tạo / đổi kích thước canvas
       </button>
       {sizeError&&<span role="alert" className="w-full text-xs font-semibold text-red-700">{sizeError}</span>}
       <p className="w-full text-[11px] text-[#688497]">
         Tối đa 500 ô. Khi giảm kích thước, ghế nằm ngoài lưới vẫn được giữ an toàn trong Canvas tự do.
       </p>
     </div>}
     {editable&&<>
       <div className="mt-4 flex flex-wrap items-center gap-2">
         <span className="text-xs font-bold text-[#455f75]">Loại ghế mới:</span>
         {([
           {type:"delegate" as const,label:"Ghế đại biểu",icon:Users},
           {type:"guest" as const,label:"Ghế khách mời",icon:UserRound}
         ]).map(({type,label,icon:Icon})=>
           <button key={type} type="button" aria-pressed={seatType===type}
             className={"inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold "+
               (seatType===type?
                 type==="guest"?"border-[#7e5baa] bg-[#7b58a7] text-white":"border-[#076895] bg-[#076895] text-white":
                 "border-[#d9e5ed] bg-white text-[#527084]")}
             onClick={()=>setSeatType(type)}><Icon size={15}/>{label}</button>
         )}
       </div>
       <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Công cụ chọn ghế">
         {commands.map(({tool:option,label,icon:Icon})=>
           <button key={option} type="button" aria-pressed={tool===option}
             onClick={()=>{setTool(option);stroke.current=null;}}
             className={"inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold "+
               (tool===option?"border-[#12648c] bg-[#174f6f] text-white":"border-[#dce6ee] bg-white text-[#45677d] hover:bg-[#f3f8fb]")}>
             <Icon size={14}/>{label}</button>
         )}
       </div>
       <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#edf2f6] pt-3">
         <span className="text-[10px] font-bold uppercase tracking-wider text-[#7f95a6]">Mẫu nhanh</span>
         <button type="button" className="btn btn-secondary !min-h-9 !text-xs" onClick={()=>onPreset("full",seatType)}>
           <Rows3 size={14}/> Lấp đầy {total} ghế
         </button>
         <button type="button" className="btn btn-secondary !min-h-9 !text-xs" onClick={()=>onPreset("center-aisle",seatType)}>
           <Route size={14}/> Chừa lối đi giữa
         </button>
         <button type="button" className="btn btn-secondary !min-h-9 !text-xs" onClick={()=>onPreset("empty",seatType)}>
           <RotateCcw size={14}/> Xóa ghế trên lưới
         </button>
       </div>
     </>}
   </div>
   <div className="overflow-x-auto overscroll-x-contain bg-[#f2f6fa] px-3 py-5 sm:px-5"
     tabIndex={0} aria-label={"Lưới "+total+" vị trí chỗ ngồi, cuộn để xem"}>
     <div className="seat-grid-surface mx-auto w-max rounded-xl border border-[#d5e3eb] bg-white px-4 pb-5 pt-4 shadow-[0_4px_24px_rgba(31,65,88,.045)] sm:px-6">
       <div className="mb-5 flex justify-center">
         <div className="w-[62%] rounded-b-lg border border-[#195c7e] bg-[#12587b] py-3 text-center text-[11px] font-extrabold uppercase tracking-[.16em] text-white">
           {stageLabel||"SÂN KHẤU"}
         </div>
       </div>
       <div className="seat-grid-cells grid gap-[5px]" style={{gridTemplateColumns:"30px repeat("+columns+", 37px)"}}>
         <span aria-hidden="true"/>
         {Array.from({length:columns},(_,column)=><span key={"header-"+column} aria-hidden="true"
           className="flex h-6 items-center justify-center text-[10px] font-semibold tabular-nums text-[#8599aa]">
             {String(column+1).padStart(2,"0")}
         </span>)}
         {Array.from({length:rows},(_,row)=><Fragment key={row}>
           <span className="flex h-[37px] items-center justify-center text-[11px] font-extrabold text-[#59768b]">
             {rowLabelAt("A",row)}
           </span>
           {Array.from({length:columns},(_,column)=>{
             const index=row*columns+column,seat=cells.get(index);
             const occupied=!!seat&&assignedSeatIds.has(seat.id);
             const selected=!!seat&&selectedSeatId===seat.id;
             const guest=seat?.seatType==="guest";
             const label="Hàng "+rowLabelAt("A",row)+", ô "+(column+1)+": "+
               (!seat?"trống":seat.blocked?"ghế đã khóa":guest?"ghế khách mời":"ghế đại biểu")+
               (occupied?", đã phân công":"");
             return <button key={index} type="button" title={label} aria-label={label}
               aria-pressed={!!seat} data-grid-cell={index}
               onPointerDown={event=>{
                 if(!editable||event.pointerType!=="mouse"||event.button!==0)return;
                 ignoreClick.current=true;
                 if(tool==="inspect"){if(seat)onSelect(seat.id);return;}
                 const desired=tool==="paint"?true:tool==="erase"?false:!seat;
                 stroke.current={active:desired,type:seatType};
                 apply(row,column,desired,seatType);
               }}
               onPointerEnter={event=>{
                 if(event.pointerType==="mouse"&&event.buttons===1&&stroke.current)
                   apply(row,column,stroke.current.active,stroke.current.type);
               }}
               onClick={()=>{
                 if(ignoreClick.current){ignoreClick.current=false;return;}
                 apply(row,column);
               }}
               className={"seat-grid-cell relative flex h-[37px] w-[37px] items-center justify-center rounded-[5px] border text-[10px] font-extrabold tabular-nums focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087dad] touch-manipulation "+
                 (selected?"border-[#d79b3b] bg-[#fff0c9] text-[#865b19] ring-2 ring-[#e9bb5c] ":
                  seat?.blocked?"border-[#b9c4ce] bg-[#dae1e8] text-[#768695] ":
                  guest?"border-[#9c81ce] bg-[#eee5fc] text-[#67419f] ":
                  occupied?"border-[#59a99e] bg-[#d6f1ea] text-[#14675b] ":
                  seat?"border-[#448caf] bg-[#d9edf9] text-[#155a80] ":
                  "border-dashed border-[#c6d3de] bg-[#f5f8fa] text-[#b9cad5] hover:border-[#6399b8] hover:bg-[#e8f4fb] ")+
                 (editable?"cursor-crosshair":"cursor-pointer")}>
               {seat?.blocked?<LockKeyhole size={13}/>:
                occupied?<Check size={13} strokeWidth={3}/>:
                guest?<UserRound size={16} strokeWidth={2.3}/>:
                seat?<Armchair size={16} strokeWidth={2.3}/>:
                <span className="text-[14px] font-normal">·</span>}
             </button>;
           })}
         </Fragment>)}
       </div>
       <p className="mt-5 text-center text-[10px] font-semibold uppercase tracking-[.12em] text-[#a0b1bf]">
         Lối vào · Cuối hội trường
       </p>
     </div>
   </div>
   <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#e3edf3] bg-white px-4 py-3 text-[11px] font-semibold text-[#648092]">
     <span>Ô trống: {total-cells.size}</span>
     <span className="text-[#17658c]">Ghế đại biểu: {cells.size-guestCount}</span>
     <span className="text-[#7851a2]">Ghế khách mời: {guestCount}</span>
     <span>Đã phân: {assignedCount}</span>
     {outsideCount>0&&<span className="text-[#ad7630]">{outsideCount} ghế nằm ngoài kích thước canvas</span>}
   </div>
 </div>;
}
