"use client";
import {useMemo,useState} from "react";
import Link from "next/link";
import {ArrowUpRight,CalendarDays,Layers3,MapPin,Search,SlidersHorizontal} from "lucide-react";

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
  live:{text:"Đang diễn ra",badge:"badge-green",dot:"bg-[#16a378]"},
  preparing:{text:"Đang chuẩn bị",badge:"badge-yellow",dot:"bg-[#e9ad46]"},
  completed:{text:"Đã kết thúc",badge:"badge-gray",dot:"bg-[#8898ab]"}
};
export function CongressDirectory({items}:{items:CongressSummary[]}){
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState<Filter>("all");
  const matches=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase("vi");
    return items.filter(c=>(filter==="all"||c.status===filter)&&
      [c.name,c.slug,c.venue,c.term,c.kind].join(" ").toLocaleLowerCase("vi").includes(q));
  },[items,query,filter]);

  return <section aria-label="Danh sách Đại hội">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="section-title">Danh sách Đại hội <span className="text-[#8197a3]">({matches.length})</span></h2><p className="helper mt-1">Chọn Đại hội để xem bảng điều hành và các nghiệp vụ.</p></div>
      <div className="flex items-center gap-2 text-xs font-semibold text-[#738797]"><SlidersHorizontal size={16}/> Tìm kiếm và lọc</div>
    </div>
    <div className="mb-5 flex flex-col gap-3 rounded-[18px] border border-[#e2ecef] bg-white p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
      <label className="relative block w-full lg:max-w-[420px]">
        <span className="sr-only">Tìm Đại hội</span>
        <Search className="pointer-events-none absolute left-3.5 top-3.5 text-[#8297a5]" size={19}/>
        <input className="field pl-11!" type="search" value={query} onChange={e=>setQuery(e.target.value)}
          placeholder="Tìm theo tên, nhiệm kỳ, đơn vị..."/>
      </label>
      <div role="group" aria-label="Lọc trạng thái Đại hội" className="flex max-w-full gap-1.5 overflow-x-auto pb-1 sm:pb-0">
        {filters.map(item=><button key={item.value} type="button"
          aria-pressed={filter===item.value}
          onClick={()=>setFilter(item.value)}
          className={`min-h-10 shrink-0 rounded-xl px-3.5 text-xs font-bold transition-colors ${filter===item.value?"bg-[#0f7f85] text-white":"bg-[#f2f7f8] text-[#597487] hover:bg-[#e7f3f3]"}`}>{item.label}</button>)}
      </div>
    </div>

    {matches.length>0?
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {matches.map(c=>{
        const state=states[c.status];
        return <Link href={`/congresses/${c.id}`} key={c.id}
          className="card group flex min-w-0 flex-col overflow-hidden p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[#9bd8d4] hover:shadow-[0_20px_40px_rgba(11,74,84,.1)] sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#e6f7f3] text-[#0d8283]"><Layers3 size={24}/></span>
            <span className={`badge ${state.badge}`}><span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${state.dot}`}/>{state.text}</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[.13em] text-[#0c9990]">{c.kind==="doan"?"Đoàn TNCS Hồ Chí Minh":"Hội Sinh viên Việt Nam"}</p>
          <h3 className="mt-2 line-clamp-3 min-h-[52px] text-[17px] font-extrabold leading-[1.5] text-[#19384b]">{c.name}</h3>
          <div className="mt-4 space-y-2 text-xs text-[#687e8e]">
            <p className="flex items-center gap-2"><CalendarDays size={15} className="shrink-0 text-[#7493a1]"/><span className="truncate">Nhiệm kỳ: {c.term||"Chưa cập nhật"}</span></p>
            <p className="flex items-center gap-2"><MapPin size={15} className="shrink-0 text-[#7493a1]"/><span className="truncate">{c.venue||"Chưa cập nhật địa điểm"}</span></p>
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-[#eaf0f1] pt-4 text-sm font-extrabold text-[#0e8186] sm:mt-6">
            Vào điều hành <ArrowUpRight size={18} className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"/>
          </div>
        </Link>;
      })}
    </div>:
    <div className="card empty-state">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eaf6f4] text-[#0d8584]"><Layers3 size={30}/></span>
      <h3 className="mt-4 text-lg font-extrabold">{items.length?"Không tìm thấy Đại hội phù hợp":"Chưa có Đại hội nào"}</h3>
      <p className="helper mx-auto mt-2 max-w-lg">{items.length?"Hãy thử từ khóa khác hoặc chọn bộ lọc Tất cả.":"Đại hội sẽ xuất hiện tại đây khi được quản trị hệ thống tạo và phân quyền cho tài khoản của bạn."}</p>
      {(query||filter!=="all")&&<button type="button" className="btn btn-secondary mt-5" onClick={()=>{setQuery("");setFilter("all");}}>Xóa bộ lọc</button>}
    </div>}
  </section>;
}
