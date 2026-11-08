"use client";

import {Fragment,useEffect,useMemo,useRef,useState} from "react";
import {
  Armchair,Check,Grid2X2,LockKeyhole,MousePointer2,Paintbrush,RotateCcw,
  Route,Rows3,ScanEye
} from "lucide-react";
import {
  SEAT_GRID_CAPACITY,SEAT_GRID_COLUMNS,SEAT_GRID_ROWS,
  rowLabelAt,seatGridCellIndex,type SeatDraft,type SeatGridPreset
} from "@/lib/seating";

type Tool="toggle"|"paint"|"erase"|"inspect";
type Props={
  seats:SeatDraft[];
  assignedSeatIds:ReadonlySet<string>;
  stageLabel:string;
  selectedSeatId:string;
  editable:boolean;
  onPaint:(row:number,column:number,active:boolean)=>void;
  onSelect:(id:string)=>void;
  onPreset:(preset:SeatGridPreset)=>void;
};
const tools:{tool:Tool;label:string;icon:typeof MousePointer2}[]=[
  {tool:"toggle",label:"Chọn / bỏ ghế",icon:MousePointer2},
  {tool:"paint",label:"Tô ghế",icon:Paintbrush},
  {tool:"erase",label:"Tạo lối đi",icon:Route},
  {tool:"inspect",label:"Chi tiết ghế",icon:ScanEye}
];
export function SeatGridCanvas({
  seats,assignedSeatIds,stageLabel,selectedSeatId,editable,onPaint,onSelect,onPreset
}:Props){
  const [tool,setTool]=useState<Tool>("toggle");
  const stroke=useRef<{active:boolean}|null>(null);
  const ignoreClick=useRef(false);
  useEffect(()=>{
    const finish=()=>{stroke.current=null;};
    window.addEventListener("pointerup",finish);
    window.addEventListener("pointercancel",finish);
    window.addEventListener("blur",finish);
    return()=>{
      window.removeEventListener("pointerup",finish);
      window.removeEventListener("pointercancel",finish);
      window.removeEventListener("blur",finish);
    };
  },[]);
  const cells=useMemo(()=>{
    const result=new Map<number,SeatDraft>();
    seats.forEach(seat=>{
      const index=seatGridCellIndex(seat);
      if(index!==null)result.set(index,seat);
    });
    return result;
  },[seats]);
  const outsideCount=seats.length-cells.size;
  const available=SEAT_GRID_CAPACITY-cells.size;
  const locked=useMemo(()=>[...cells.values()].filter(seat=>assignedSeatIds.has(seat.id)).length,[cells,assignedSeatIds]);

  function apply(row:number,column:number,desired?:boolean){
    if(!editable)return;
    const index=row*SEAT_GRID_COLUMNS+column;
    const seat=cells.get(index);
    if(tool==="inspect"){
      if(seat)onSelect(seat.id);
      return;
    }
    const active=desired??(tool==="paint"?true:tool==="erase"?false:!seat);
    onPaint(row,column,active);
  }

  return <div className="seat-grid-studio">
    <div className="border-b border-[#dfe7ee] bg-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#24445e]">
            <Grid2X2 size={19} strokeWidth={2}/>
            <h3 className="text-[15px] font-bold tracking-[-.025em]">Canvas 200 ô</h3>
            <span className="rounded-full bg-[#e4f3fc] px-2 py-0.5 text-[10px] font-bold text-[#0875ad]">10 × 20</span>
          </div>
          <p className="mt-1.5 max-w-[480px] text-[12px] leading-[1.7] text-[#6d8295]">
            Mỗi ô là một vị trí có thể đặt ghế. Nhấn để chọn hoặc bỏ ghế;
            những ô để trống trở thành lối đi, cửa ra vào hay khu vực sân khấu.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            {label:"Vị trí",value:SEAT_GRID_CAPACITY},
            {label:"Ghế",value:cells.size},
            {label:"Ô trống",value:available}
          ].map(item=><div key={item.label} className="min-w-[66px] rounded-lg border border-[#e4ecf3] bg-[#f7fafc] px-3 py-2">
            <p className="text-[18px] font-bold tabular-nums text-[#163f5b]">{item.value}</p>
            <p className="text-[10px] font-semibold text-[#8192a2]">{item.label}</p>
          </div>)}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Công cụ thiết kế ô ghế">
        {tools.map(({tool:option,label,icon:Icon})=>
          <button key={option} type="button" disabled={!editable} aria-pressed={tool===option}
            onClick={()=>{setTool(option);stroke.current=null;}}
            className={"inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c91c0] "+
              (tool===option?"border-[#006f9b] bg-[#07557b] text-white":"border-[#dce6ee] bg-white text-[#426177] hover:border-[#98bccf] hover:bg-[#f3f9fc]")}>
            <Icon size={14}/>{label}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#eef2f6] pt-3">
        <span className="mr-1 text-[10px] font-bold uppercase tracking-[.08em] text-[#8b9daf]">Bố trí nhanh</span>
        <button type="button" disabled={!editable} onClick={()=>onPreset("full")}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#d9e7f0] bg-[#f2f8fc] px-3 text-[11px] font-semibold text-[#245c7b] hover:border-[#9cc5da] disabled:opacity-50">
          <Rows3 size={14}/> Đủ 200 ghế
        </button>
        <button type="button" disabled={!editable} onClick={()=>onPreset("center-aisle")}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#d9e7f0] bg-[#f2f8fc] px-3 text-[11px] font-semibold text-[#245c7b] hover:border-[#9cc5da] disabled:opacity-50">
          <Route size={14}/> Lối đi giữa · 180 ghế
        </button>
        <button type="button" disabled={!editable} onClick={()=>onPreset("empty")}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#e5e8ef] bg-white px-3 text-[11px] font-semibold text-[#6d7889] hover:bg-[#f6f8fa] disabled:opacity-50">
          <RotateCcw size={14}/> Xóa ghế trên lưới
        </button>
      </div>
    </div>

    <div className="overflow-x-auto overscroll-x-contain bg-[#f2f6fa] px-3 py-5 sm:px-5" tabIndex={0}
      aria-label="Cuộn ngang để xem toàn bộ lưới 200 ô vuông">
      <div className="seat-grid-surface mx-auto w-max rounded-xl border border-[#d5e3eb] bg-white px-4 pb-5 pt-4 shadow-[0_4px_24px_rgba(31,65,88,.045)] sm:px-6">
        <div className="mb-5 flex items-center justify-center">
          <div className="w-[62%] rounded-b-lg border border-[#195c7e] bg-[#12587b] py-3 text-center text-[11px] font-extrabold uppercase tracking-[.16em] text-white shadow-[0_5px_12px_rgba(8,66,104,.12)]">
            {stageLabel||"SÂN KHẤU"}
          </div>
        </div>
        <div className="mb-1.5 flex items-center justify-between pl-9 pr-1 text-[10px] font-semibold text-[#8a9dac]">
          <span>TRÁI HỘI TRƯỜNG</span><span>PHẢI HỘI TRƯỜNG</span>
        </div>
        <div className="seat-grid-cells grid gap-[5px]"
          style={{gridTemplateColumns:"30px repeat(20, 37px)"}}>
          <span aria-hidden="true"/>
          {Array.from({length:SEAT_GRID_COLUMNS},(_,column)=>
            <span key={"header-"+column} aria-hidden="true" className="flex h-6 items-center justify-center text-[10px] font-semibold tabular-nums text-[#8599aa]">
              {String(column+1).padStart(2,"0")}
            </span>)}
          {Array.from({length:SEAT_GRID_ROWS},(_,row)=><Fragment key={"row-"+row}>
            <span className="flex h-[37px] items-center justify-center text-[11px] font-extrabold text-[#59768b]">{rowLabelAt("A",row)}</span>
            {Array.from({length:SEAT_GRID_COLUMNS},(_,column)=>{
              const index=row*SEAT_GRID_COLUMNS+column,seat=cells.get(index);
              const occupied=!!seat&&assignedSeatIds.has(seat.id);
              const selected=!!seat&&selectedSeatId===seat.id;
              const label="Hàng "+rowLabelAt("A",row)+", ô "+(column+1)+": "+
                (!seat?"chưa đặt ghế":seat.blocked?"ghế đã khóa":occupied?"ghế đã gán đại biểu":"ghế chưa phân công");
              return <button key={index} type="button" disabled={!editable}
                data-grid-cell={index} title={label} aria-label={label} aria-pressed={!!seat}
                onPointerDown={event=>{
                  if(!editable||event.pointerType!=="mouse"||event.button!==0)return;
                  ignoreClick.current=true;
                  if(tool==="inspect"){if(seat)onSelect(seat.id);return;}
                  const desired=tool==="paint"?true:tool==="erase"?false:!seat;
                  stroke.current={active:desired};
                  apply(row,column,desired);
                }}
                onPointerEnter={event=>{
                  if(event.pointerType==="mouse"&&event.buttons===1&&stroke.current)
                    apply(row,column,stroke.current.active);
                }}
                onClick={()=>{
                  if(ignoreClick.current){ignoreClick.current=false;return;}
                  apply(row,column);
                }}
                className={
                  "seat-grid-cell relative flex h-[37px] w-[37px] items-center justify-center rounded-[5px] border text-[10px] font-extrabold tabular-nums transition-[background-color,border-color,color] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087dad] touch-manipulation "+
                  (selected?"border-[#d79b3b] bg-[#fff0c9] text-[#865b19] ring-2 ring-[#e9bb5c] ":
                   seat?.blocked?"border-[#b9c4ce] bg-[#dae1e8] text-[#768695] ":
                   occupied?"border-[#59a99e] bg-[#d6f1ea] text-[#14675b] ":
                   seat?"border-[#448caf] bg-[#d9edf9] text-[#155a80] hover:bg-[#b5dcf3] ":
                   "border-dashed border-[#c6d3de] bg-[#f5f8fa] text-[#b9cad5] hover:border-[#6399b8] hover:bg-[#e8f4fb] ") +
                  (!editable?"cursor-default opacity-65":"cursor-crosshair")
                }>
                {seat?.blocked?<LockKeyhole size={13}/>:
                  occupied?<Check size={13} strokeWidth={3}/>:
                  seat?<Armchair size={16} strokeWidth={2.2}/>:
                  <span className="text-[14px] font-normal leading-none">·</span>}
              </button>;
            })}
          </Fragment>)}
        </div>
        <p className="mt-5 text-center text-[10px] font-semibold uppercase tracking-[.12em] text-[#a0b1bf]">Lối vào · Cuối hội trường</p>
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#e3edf3] bg-white px-4 py-3 text-[11px] font-semibold text-[#648092]">
      <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded border border-dashed border-[#c6d3de] bg-[#f5f8fa]"/> Ô trống</span>
      <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded border border-[#448caf] bg-[#d9edf9]"/> Ghế</span>
      <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded border border-[#59a99e] bg-[#d6f1ea]"/> Đã phân</span>
      <span className="inline-flex items-center gap-2"><span className="h-4 w-4 rounded border border-[#b9c4ce] bg-[#dae1e8]"/> Khóa</span>
      {locked>0&&<span className="text-[#98703d]">{locked} ghế có đại biểu không thể xóa</span>}
      {outsideCount>0&&<span className="font-bold text-[#aa6e32]">{outsideCount} ghế nằm ngoài lưới (xem ở Canvas tự do)</span>}
    </div>
    {!editable&&<p className="border-t border-[#e8eff4] bg-[#fff8ed] px-4 py-3 text-xs font-semibold text-[#906023]">
      Tạo sơ đồ và chuyển sang chế độ Thiết kế để chỉnh sửa ô ghế.
    </p>}
  </div>;
}
