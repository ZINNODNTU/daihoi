"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {BrandMark} from "@/components/brand-mark";
import {ArrowUpRight,CalendarDays,LayoutGrid,MapPin,Search,SlidersHorizontal} from "lucide-react";

export type CongressSummary={
  id:string;
  name:string;
  kind:"doan"|"hoi_sinh_vien";
  term:string;
  status:"preparing"|"live"|"completed";
  slug:string;
  venue:string;
};
type Filter="all"|CongressSummary["status"];
const filters:{value:Filter;label:string}[]=[
  {value:"all",label:"Tất cả"},
  {value:"live",label:"Đang diễn ra"},
  {value:"preparing",label:"Chuẩn bị"},
  {value:"completed",label:"Đã kết thúc"}
];
const states={
  live:{label:"Đang diễn ra",badge:"badge-green",dot:"bg-[#269269]"},
  preparing:{label:"Đang chuẩn bị",badge:"badge-yellow",dot:"bg-[#cb943d]"},
  completed:{label:"Đã kết thúc",badge:"badge-gray",dot:"bg-[#8c98a8]"}
};

export function CongressDirectory({items}:{items:CongressSummary[]}){
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState<Filter>("all");
  const matches=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase("vi");
    return items.filter(item=>(filter==="all"||item.status===filter)&&
      [item.name,item.slug,item.venue,item.term,item.kind].join(" ").toLocaleLowerCase("vi").includes(q));
  },[items,query,filter]);

  return <section aria-label="Danh sách Đại hội" className="space-y-4">
    <div className="section-header">
      <div>
        <h2 className="section-title">Danh sách Đại hội <span className="ml-1 text-[#8d98a7]">({matches.length})</span></h2>
        <p className="helper mt-1">Chọn Đại hội để xem chi tiết và quản lý các nghiệp vụ.</p>
      </div>
      <span className="hidden items-center gap-1.5 text-[11px] text-[#8792a2] sm:flex"><SlidersHorizontal size={14}/> Bộ lọc danh sách</span>
    </div>

    <div className="workspace-panel overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[#e9edf2] p-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full lg:max-w-[410px]">
          <span className="sr-only">Tìm Đại hội</span>
          <Search className="pointer-events-none absolute left-3.5 top-[13px] text-[#8995a5]" size={17}/>
          <input className="field pl-10!" type="search" value={query} onChange={e=>setQuery(e.target.value)}
            placeholder="Tìm tên Đại hội, đơn vị, nhiệm kỳ..."/>
        </label>
        <div role="group" aria-label="Lọc trạng thái Đại hội" className="flex max-w-full gap-1 overflow-x-auto">
          {filters.map(item=><button key={item.value} type="button"
            aria-pressed={filter===item.value} onClick={()=>setFilter(item.value)}
            className={"directory-filter min-h-10 shrink-0 rounded-xl px-3 text-[11px] font-semibold transition-colors "+
              (filter===item.value?"bg-[#e4f2f3] text-[#006c91]":"text-[#718094] hover:bg-[#f5f7fa]")}>
            {item.label}
          </button>)}
        </div>
      </div>

      {matches.length?matches.map((item,index)=>{
        const state=states[item.status];
        return <Link key={item.id} href={"/congresses/"+item.id}
          className="directory-row group flex min-w-0 flex-col gap-3 border-b border-[#edf0f4] px-4 py-4 transition-colors last:border-b-0 hover:bg-[#fafbfd] sm:flex-row sm:items-center sm:gap-5 sm:px-5 sm:py-5">
          <span className="directory-kind-mark flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#e5eaf0] bg-[#f4f7fa]">
            <BrandMark kind={item.kind} className="!h-10 !w-10 !flex-[0_0_40px] !rounded-[9px] !border-0 !p-1"/>
          </span>
          <div className="min-w-0 flex-1">
            <span className="directory-row-index">ĐẠI HỘI {String(index+1).padStart(2,"0")}</span>
             <h3 className="mt-1 line-clamp-2 text-[14px] font-bold leading-6 text-[#27364c] group-hover:text-[#007eb8]">{item.name}</h3>
            <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#8793a2]">
              <span>{item.kind==="doan"?"Đoàn TNCS Hồ Chí Minh":"Hội Sinh viên Việt Nam"}</span>
              {item.term&&<span className="inline-flex items-center gap-1"><CalendarDays size={12}/>{item.term}</span>}
              {item.venue&&<span className="inline-flex items-center gap-1"><MapPin size={12}/>{item.venue}</span>}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <span className={"badge gap-1.5 "+state.badge}><span className={"h-1.5 w-1.5 rounded-full "+state.dot}/>{state.label}</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-md text-[#9aa5b4] group-hover:bg-[#eff4ff] group-hover:text-[#007eb8]">
              <ArrowUpRight size={17}/>
            </span>
          </div>
        </Link>;
      }):<div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-[9px] bg-[#f3f5f8] text-[#7a8ba1]"><LayoutGrid size={21}/></span>
        <h3 className="text-[14px] font-bold text-[#2c3a4f]">Không tìm thấy Đại hội</h3>
        <p className="helper mt-1">Thử tìm kiếm hoặc chọn bộ lọc khác.</p>
      </div>}
    </div>
  </section>;
}
