"use client";
import {Fragment,useMemo,useRef,useState,useEffect} from "react";
import {
 Check,Grid2X2,LockKeyhole,MousePointer2,Paintbrush,
 RotateCcw,Route,Rows3,ScanEye,Users,UserRound
} from "lucide-react";
import {
 rowLabelAt,seatGridCellIndex,seatGridSizeValid,
 type SeatDraft,type SeatGridPreset,type SeatGridSize,type SeatType
} from "@/lib/seating";
import type {SeatGridCommand} from "@/lib/seating-plan";

type Tool="toggle"|"paint"|"erase"|"inspect";
type Props={
 seats:SeatDraft[];assignedSeatIds:ReadonlySet<string>;
 stageLabel:string;selectedSeatId:string;editable:boolean;
 rows:number;columns:number;
 delegateTotal:number;guestTotal:number;
 undoCount:number;redoCount:number;
 onUndo:()=>void;onRedo:()=>void;
 onCommand:(command:SeatGridCommand)=>void;
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
 rows,columns,delegateTotal,guestTotal,undoCount,redoCount,onUndo,onRedo,onCommand,
 onResize,onPaint,onSelect,onPreset
}:Props){
 const [tool,setTool]=useState<Tool>("toggle");
 const [seatType,setSeatType]=useState<SeatType>("delegate");
 const [draftRows,setDraftRows]=useState(String(rows));
 const [draftColumns,setDraftColumns]=useState(String(columns));
 const [sizeError,setSizeError]=useState("");
 const [selectedRow,setSelectedRow]=useState(0);
 const [selectedColumn,setSelectedColumn]=useState(0);
 const [aisleColumns,setAisleColumns]=useState("");
 const [batchError,setBatchError]=useState("");
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
 const availableDelegates=[...cells.values()].filter(s=>!s.blocked&&s.seatType!=="guest").length;
 const availableGuests=[...cells.values()].filter(s=>!s.blocked&&s.seatType==="guest").length;
 const missingDelegates=Math.max(0,delegateTotal-availableDelegates);
 const missingGuests=Math.max(0,guestTotal-availableGuests);
 function applyAisles(){
   const values=aisleColumns.trim().split(/[,;\s]+/).filter(Boolean).map(Number);
   if(!values.length||values.length>8||values.some(v=>!Number.isInteger(v)||v<1||v>columns)){
     setBatchError("Nhập 1–8 số cột lối đi từ 1 đến "+columns+", cách nhau bằng dấu phẩy.");return;
   }
   setBatchError("");
   onCommand({kind:"clear-aisles",columns:[...new Set(values.map(v=>v-1))]});
 }
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
           Ghế đại biểu và khách mời được đánh số liên tục từ trái sang phải theo mỗi hàng,
           bỏ qua lối đi và ô trống. Ký hiệu C1, C2... phía trên chỉ là cột lưới, không phải số ghế.
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
      <section aria-label="Bố trí ghế theo hàng cột" className="mt-4 rounded-xl border border-[#d9e5ec] bg-[#f8fbfd] p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h4 className="text-[13px] font-bold text-[#234d66]">Thiết kế theo hàng · cột</h4>
            <p className="mt-1 text-[11px] text-[#688396]">Bấm nhãn hàng hoặc cột trên sơ đồ để chọn nhanh.</p></div>
          <div className="flex gap-2">
            <button type="button" disabled={!undoCount} onClick={onUndo} className="btn btn-secondary !min-h-9 !text-xs">
              <RotateCcw size={14}/> Hoàn tác {undoCount>0?"("+undoCount+")":""}</button>
            <button type="button" disabled={!redoCount} onClick={onRedo} className="btn btn-secondary !min-h-9 !text-xs">
              <RotateCcw size={14} className="scale-x-[-1]"/> Làm lại</button>
          </div>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-[#e1eaf0] bg-white p-3">
            <label htmlFor="bulk-seat-row" className="text-[11px] font-bold text-[#365d76]">Hàng ghế</label>
            <select id="bulk-seat-row" value={selectedRow} onChange={e=>setSelectedRow(Number(e.target.value))}
              className="field mt-1.5 w-full">
              {Array.from({length:rows},(_,r)=><option key={r} value={r}>Hàng {rowLabelAt("A",r)}</option>)}
            </select>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-secondary !min-h-9 !text-xs"
                onClick={()=>onCommand({kind:"fill-row",row:selectedRow,seatType})}>Thêm ghế hàng</button>
              <button type="button" className="btn btn-secondary !min-h-9 !text-xs"
                onClick={()=>onCommand({kind:"clear-row",row:selectedRow})}>Chừa trống hàng</button>
              <button type="button" className="btn btn-secondary !min-h-9 !text-xs"
                onClick={()=>onCommand({kind:"guest-row",row:selectedRow})}>Hàng khách mời</button>
              <button type="button" className="btn btn-secondary !min-h-9 !text-xs"
                onClick={()=>onCommand({kind:"delegate-row",row:selectedRow})}>Hàng đại biểu</button>
            </div>
          </div>
          <div className="rounded-lg border border-[#e1eaf0] bg-white p-3">
            <label htmlFor="bulk-seat-column" className="text-[11px] font-bold text-[#365d76]">Cột lưới</label>
            <select id="bulk-seat-column" value={selectedColumn} onChange={e=>setSelectedColumn(Number(e.target.value))}
              className="field mt-1.5 w-full">
              {Array.from({length:columns},(_,c)=><option key={c} value={c}>C{c+1}</option>)}
            </select>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-secondary !min-h-9 !text-xs"
                onClick={()=>onCommand({kind:"fill-column",column:selectedColumn,seatType})}>Thêm ghế cột</button>
              <button type="button" className="btn btn-secondary !min-h-9 !text-xs"
                onClick={()=>onCommand({kind:"clear-column",column:selectedColumn})}>Chừa lối đi cột</button>
            </div>
            <label htmlFor="bulk-seat-aisles" className="mt-3 block text-[11px] font-bold text-[#365d76]">Lối đi nhiều cột</label>
            <div className="mt-1.5 flex gap-2">
              <input id="bulk-seat-aisles" className="field min-w-0 flex-1" placeholder="VD: 1, 13, 14"
                value={aisleColumns} onChange={e=>{setAisleColumns(e.target.value);setBatchError("");}}/>
              <button type="button" onClick={applyAisles} className="btn btn-primary !min-h-10 !text-xs">Áp dụng</button>
            </div>
            {batchError&&<p role="alert" className="mt-2 text-[11px] text-red-700">{batchError}</p>}
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-[#688396]">
          Không xóa hoặc chuyển loại ghế đã phân công. Ghế tự đánh số lại trong từng hàng, bỏ qua ô trống.
          Có thể Hoàn tác/Làm lại trước khi lưu.
        </p>
      </section>
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
         <div className="w-[min(46%,300px)] rounded-b-xl border border-[#195c7e] bg-[#12587b] px-3 py-3 text-center text-[11px] font-extrabold uppercase tracking-[.14em] text-white">
           {stageLabel||"SÂN KHẤU"}
         </div>
       </div>
       <div className="seat-grid-cells grid gap-[5px]" style={{gridTemplateColumns:"30px repeat("+columns+", 37px)"}}>
         <span aria-hidden="true"/>
         {Array.from({length:columns},(_,column)=><button key={"header-"+column}
           type="button" disabled={!editable} aria-label={"Chọn cột C"+(column+1)}
           aria-pressed={selectedColumn===column} onClick={()=>setSelectedColumn(column)}
           className={"flex h-6 items-center justify-center rounded text-[10px] font-semibold tabular-nums "+
             (editable&&selectedColumn===column?"bg-[#d7eaf5] text-[#095c87]":
              "text-[#8599aa] "+(editable?"hover:bg-[#e7f4fb]":""))}>
             {"C"+(column+1)}
         </button>)}
         {Array.from({length:rows},(_,row)=><Fragment key={row}>
           <button type="button" disabled={!editable} aria-label={"Chọn hàng "+rowLabelAt("A",row)}
             aria-pressed={selectedRow===row} onClick={()=>setSelectedRow(row)}
             className={"flex h-[37px] items-center justify-center rounded text-[11px] font-extrabold "+
               (editable&&selectedRow===row?"bg-[#d7eaf5] text-[#095c87]":
                "text-[#59768b] "+(editable?"hover:bg-[#e7f4fb]":""))}>
             {rowLabelAt("A",row)}
           </button>
           {Array.from({length:columns},(_,column)=>{
             const index=row*columns+column,seat=cells.get(index);
             const occupied=!!seat&&assignedSeatIds.has(seat.id);
             const selected=!!seat&&selectedSeatId===seat.id;
             const guest=seat?.seatType==="guest";
             const label="Hàng "+rowLabelAt("A",row)+", "+
               (!seat?"cột lưới "+(column+1)+", lối đi/ô trống":
                 "ghế số "+seat.seatNumber+" ("+(guest?"khách mời":"đại biểu")+") ở cột lưới "+(column+1)+(seat.blocked?", đã khóa":""))+
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
                  "border border-[#e0e8ed] bg-[#f0f4f6] text-[#b9cad5] hover:border-[#6399b8] hover:bg-[#e8f4fb] ")+
                 (editable?"cursor-crosshair":"cursor-pointer")}>
               {seat?<>
                  <span className="text-[11px] font-extrabold tabular-nums tracking-tight">{String(seat.seatNumber).padStart(2,"0")}</span>
                  {seat.blocked?<LockKeyhole size={10} className="absolute -right-1 -top-1 rounded bg-[#dce4eb] p-px text-[#606c7b]"/>:
                occupied?<Check size={10} className="absolute -right-1 -top-1 rounded bg-[#c9eee2] p-px text-[#135c4b]"/>:null}
                 </>:


                <span aria-hidden="true" className="sr-only">Ô trống / lối đi</span>}
             </button>;
           })}
         </Fragment>)}
       </div>
       <p className="mt-5 text-center text-[10px] font-semibold uppercase tracking-[.12em] text-[#a0b1bf]">
         Lối vào · Cuối hội trường
       </p>
     </div>
   </div>
   {(delegateTotal+guestTotal)>0&&<div className="grid gap-2 border-t border-[#e4ecf1] bg-white px-4 py-3 sm:grid-cols-2" aria-label="Đánh giá sức chứa">
     <div className={"rounded-lg border px-3 py-2 text-xs "+(missingDelegates?"border-amber-200 bg-amber-50 text-amber-800":"border-emerald-100 bg-emerald-50 text-emerald-800")}>
       <strong>Đại biểu:</strong> {availableDelegates} ghế khả dụng / {delegateTotal} người
       {missingDelegates>0&&<strong className="ml-2">Thiếu {missingDelegates} ghế</strong>}
     </div>
     <div className={"rounded-lg border px-3 py-2 text-xs "+(missingGuests?"border-amber-200 bg-amber-50 text-amber-800":"border-emerald-100 bg-emerald-50 text-emerald-800")}>
       <strong>Khách mời:</strong> {availableGuests} ghế khả dụng / {guestTotal} người
       {missingGuests>0&&<strong className="ml-2">Thiếu {missingGuests} ghế</strong>}
     </div>
   </div>}
   <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#e3edf3] bg-white px-4 py-3 text-[11px] font-semibold text-[#648092]">
     <span>Ô trống: {total-cells.size}</span>
     <span className="text-[#17658c]">Ghế đại biểu: {cells.size-guestCount}</span>
     <span className="text-[#7851a2]">Ghế khách mời: {guestCount}</span>
     <span>Đã phân: {assignedCount}</span>
     {outsideCount>0&&<span className="text-[#ad7630]">{outsideCount} ghế nằm ngoài kích thước canvas</span>}
   </div>
 </div>;
}
