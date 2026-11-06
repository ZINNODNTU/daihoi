"use client";

import {useMemo,useState} from "react";
import {
  Armchair,ArrowDownRight,Check,
  CheckCircle2,ChevronDown,ClipboardList,LayoutGrid,
  QrCode,UserRoundCheck,Users
} from "lucide-react";
import {BrandMark} from "@/components/brand-mark";

type DemoTab="overview"|"seating"|"attendance";
const navigation:{id:DemoTab;label:string;icon:typeof LayoutGrid}[]=[
  {id:"overview",label:"Tổng quan",icon:LayoutGrid},
  {id:"seating",label:"Sơ đồ ghế",icon:Armchair},
  {id:"attendance",label:"Điểm danh",icon:QrCode}
];
const dailyBars=[21,35,28,48,43,62,70,58,81,67,89,76,97,85];
const sampleDelegates=[
  {initial:"NA",name:"Nguyễn Văn An",unit:"Khoa Công nghệ thông tin",method:"QR"},
  {initial:"TH",name:"Trần Minh Hà",unit:"Khoa Kinh tế",method:"QR"},
  {initial:"LP",name:"Lê Quốc Phúc",unit:"Khoa Ngoại ngữ",method:"Thủ công"}
];
const rowNames=["A","B","C","D","E","F"];
const seatCells=rowNames.flatMap((row,r)=>Array.from({length:10},(_,col)=>({
  id:row+"-"+String(col+1).padStart(2,"0"),
  row:r,col,
  status:(r*10+col)%8===0?"reserved":(r*10+col)%6===0?"empty":"present"
})));

export function ExperiencePreview({compact=false}:{compact?:boolean}){
  const [tab,setTab]=useState<DemoTab>("overview");
  const [selectedSeat,setSelectedSeat]=useState("A-05");
  const [activeFilter,setActiveFilter]=useState<"all"|"checked">("all");
  const activeSeat=useMemo(()=>seatCells.find(seat=>seat.id===selectedSeat),[selectedSeat]);
  const filteredPeople=activeFilter==="checked"?sampleDelegates.filter(d=>d.method==="QR"):sampleDelegates;

  return <div className={"preview-frame "+(compact?"preview-frame-compact":"")}>
    <div className="preview-browser">
      <div className="flex items-center gap-1.5" aria-hidden="true"><span className="preview-browser-dot"/><span className="preview-browser-dot"/><span className="preview-browser-dot"/></div>
      <span className="text-[9px] font-semibold tracking-[.12em] text-[#b1c0d8]">ĐẠI HỘI SỐ / WORKSPACE</span>
      <span className="text-[9px] font-semibold text-[#c9aa71]">DEMO</span>
    </div>
    <div className="preview-dashboard">
      <aside className="preview-sidebar" aria-label="Các chế độ xem thử">
        <div className="mb-6 flex items-center gap-2 px-1.5">
          <BrandMark className="!h-7 !w-7 !flex-[0_0_28px] !rounded-[6px] [&_svg]:!h-5 [&_svg]:!w-5"/>
          <span className="hidden text-[11px] font-bold text-[#f6f8fc] xl:block">Đại hội số</span>
        </div>
        <p className="mb-3 px-2 text-[8px] font-bold uppercase tracking-[.12em] text-[#8193b0]">ĐIỀU HÀNH</p>
        {navigation.map(item=>{
          const Icon=item.icon;
          return <button key={item.id} type="button" aria-pressed={tab===item.id}
            onClick={()=>setTab(item.id)} className={"preview-nav-item w-full text-left "+(tab===item.id?"active":"hover:bg-white/10 hover:text-white")}>
            <Icon size={13} strokeWidth={1.8}/><span className="truncate">{item.label}</span>
          </button>;
        })}
        <div className="mt-6 border-t border-white/10 pt-4">
          <span className="hidden px-2 text-[8px] uppercase tracking-[.12em] text-[#7185a5] sm:block">QUẢN LÝ</span>
          <div className="preview-nav-item opacity-70"><Users size={13}/><span>Đại biểu</span></div>
          <div className="preview-nav-item opacity-70"><ClipboardList size={13}/><span>Báo cáo</span></div>
        </div>
      </aside>

      <div className="min-w-0 bg-[#f8fafe]">
        <div className="preview-toolbar">
          <div className="min-w-0">
            <p className="text-[8px] font-semibold uppercase tracking-[.12em] text-[#8a9aae]">ĐẠI HỘI LẦN THỨ XII</p>
            <h3 className="mt-1 truncate text-[12px] font-bold tracking-[-.03em] text-[#1e2e48] sm:text-[14px]">
              {tab==="overview"?"Bảng điều hành":tab==="seating"?"Sơ đồ hội trường":"Điểm danh phiên chính thức"}
            </h3>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[5px] border border-[#e0e7f1] bg-[#f9fafc] px-2 py-1.5 text-[8px] font-semibold text-[#556b8a] sm:text-[9px]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#d2a456]"/> DỮ LIỆU MẪU
          </span>
        </div>

        {tab==="overview"&&<div className="p-3 sm:p-4">
          <div className="grid grid-cols-3 gap-2">
            {[["200","Tổng đại biểu"],["184","Đã có mặt"],["92%","Tỷ lệ tham dự"]].map(([value,label])=>
              <div className="preview-stat" key={label}><strong>{value}</strong><small>{label}</small></div>
            )}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1.24fr_.76fr]">
            <div className="preview-section min-w-0">
              <div className="flex items-center justify-between gap-2 border-b border-[#edf0f4] px-3 py-2.5">
                <p className="text-[10px] font-bold text-[#36475e]">Nhịp độ tiếp nhận</p>
                <span className="text-[8px] text-[#8998ab]">Số lượt / 15 phút</span>
              </div>
              <div className="preview-chart">
                {dailyBars.map((height,index)=><span key={index} className={"preview-bar "+(index===12?"active":"")}
                  style={{height:height+"%"}} title={"Mốc "+(index+1)}/>)}
              </div>
              <div className="flex justify-between border-t border-[#edf0f4] px-3 py-2 text-[8px] text-[#96a4b6]"><span>07:00</span><span>09:30</span><span>11:00</span></div>
            </div>
            <div className="preview-section flex min-w-0 flex-col items-center justify-center px-2 py-3 text-center">
              <div className="preview-ring"><span className="preview-ring-value">92%</span></div>
              <p className="mt-3 text-[10px] font-bold text-[#33455d]">Tỷ lệ tham dự</p>
              <p className="mt-1 text-[9px] text-[#8c9aac]">184 / 200 đại biểu</p>
            </div>
          </div>
          <div className="preview-section mt-3">
            <div className="flex items-center justify-between border-b border-[#edf0f4] px-3 py-2.5">
              <span className="text-[10px] font-bold text-[#33465d]">Ghi nhận gần đây</span>
              <span className="text-[9px] text-[#8898ad]">Theo phiên</span>
            </div>
            {sampleDelegates.map(d=><div key={d.initial} className="preview-table-row">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] bg-[#edf2f9] text-[8px] font-bold text-[#456080]">{d.initial}</span>
                <span className="min-w-0"><span className="block truncate font-semibold text-[#3c4b60]">{d.name}</span>
                  <span className="block truncate text-[8px] text-[#95a1b0]">{d.unit}</span></span>
              </div>
              <span className="preview-tag shrink-0"><Check size={10}/>{d.method}</span>
            </div>)}
          </div>
        </div>}

        {tab==="seating"&&<div className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold text-[#465c7b]">Hội trường A · Khu trung tâm</p>
            <span className="text-[8px] text-[#8192a9]">60 ghế minh họa</span>
          </div>
          <div className="mt-3 rounded-[9px] border border-[#dfe7f0] bg-white p-3 sm:p-4">
            <div className="mx-auto mb-4 w-[67%] rounded-[5px] bg-[#233957] px-2 py-2 text-center text-[8px] font-bold tracking-[.15em] text-white">SÂN KHẤU</div>
            <div className="mx-auto grid w-fit grid-cols-10 gap-1 sm:gap-[6px]" role="group" aria-label="Sơ đồ ghế mô phỏng">
              {seatCells.map(cell=><button
                key={cell.id} type="button" title={"Ghế "+cell.id} aria-label={"Chọn ghế "+cell.id}
                aria-pressed={selectedSeat===cell.id} onClick={()=>setSelectedSeat(cell.id)}
                className={"preview-seat "+(selectedSeat===cell.id?"active":cell.status==="present"?"present":cell.status==="reserved"?"reserved":"")}>
                {cell.col+1}
              </button>)}
            </div>
            <div className="mt-4 flex items-center justify-center gap-3 border-t border-[#edf1f6] pt-3 text-[8px] text-[#71849b]">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-[#d9eee7]"/> Có mặt</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-[#dce7ff]"/> Đã phân</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-[#e2bd73]"/> Đang chọn</span>
            </div>
          </div>
          <div className="preview-section mt-3 flex items-center justify-between gap-3 px-3 py-3">
            <div><p className="preview-soft-label">VỊ TRÍ ĐƯỢC CHỌN</p>
              <p className="mt-1 text-[14px] font-bold text-[#293f5d]">{selectedSeat}</p>
              <p className="text-[9px] text-[#8292a6]">{activeSeat?.status==="empty"?"Ghế đang trống":"Đại biểu minh họa"}</p>
            </div>
            <span className="preview-tag">Chế độ xem mẫu</span>
          </div>
        </div>}

        {tab==="attendance"&&<div className="p-3 sm:p-4">
          <div className="preview-section p-4">
            <div className="flex items-start justify-between gap-2">
              <div><p className="preview-soft-label">PHIÊN LÀM VIỆC 01</p>
                <p className="mt-2 text-[14px] font-bold text-[#293e5a]">Điểm danh buổi sáng</p>
                <p className="mt-1 text-[9px] text-[#8291a6]">07:00 – 09:00 · Dữ liệu minh họa</p>
              </div>
              <span className="preview-tag"><span className="h-1.5 w-1.5 rounded-full bg-[#328b68]"/> Đang mở</span>
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="text-[38px] font-bold tracking-[-.06em] text-[#233854]">184</span>
              <span className="text-[11px] text-[#8292a4]">/ 200 đại biểu</span>
            </div>
            <div className="progress-track mt-2.5"><div className="progress-fill w-[92%]"/></div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-[7px] bg-[#eaf3ee] p-3 text-[#29724f]">
                <UserRoundCheck size={18}/><strong className="mt-2 block text-[21px]">184</strong><p className="text-[9px]">Đã điểm danh</p>
              </div>
              <div className="rounded-[7px] bg-[#f1f4f8] p-3 text-[#647894]">
                <ArrowDownRight size={18}/><strong className="mt-2 block text-[21px]">16</strong><p className="text-[9px]">Chưa điểm danh</p>
              </div>
            </div>
          </div>
          <div className="preview-section mt-3">
            <div className="flex items-center justify-between gap-2 border-b border-[#edf1f5] px-3 py-2.5">
              <p className="text-[10px] font-bold text-[#344a64]">Lịch sử ghi nhận</p>
              <button type="button" onClick={()=>setActiveFilter(f=>f==="all"?"checked":"all")} className="flex items-center gap-1 rounded-[5px] border border-[#e1e7f0] px-2 py-1 text-[8px] text-[#50698a]">
                {activeFilter==="all"?"Tất cả":"Chỉ QR"} <ChevronDown size={10}/>
              </button>
            </div>
            {filteredPeople.map((d,i)=><div className="preview-table-row" key={d.initial}>
              <div className="flex min-w-0 items-center gap-2"><CheckCircle2 size={14} className="shrink-0 text-[#2e9269]"/>
                <span className="truncate font-medium text-[#394b61]">{d.name}</span></div>
              <span className="text-[9px] text-[#8091a7]">{i===0?"08:16":i===1?"08:21":"08:28"}</span>
            </div>)}
          </div>
        </div>}
      </div>
    </div>
  </div>;
}
